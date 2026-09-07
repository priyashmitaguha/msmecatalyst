# Admin, Security & CMS Upgrade — Deployment & Migration Notes

This branch (`admin-cms-upgrade`) adds password management, role-based admin
accounts, page/section publishing controls, an audit trail, and supporting
tests. **All database changes are additive and non-destructive** — no existing
row, table or column is dropped or rewritten.

## 1. Database migrations

Migrations run automatically on server start via `runMigrations()` in
`server/db.js` (also runnable explicitly with `npm run migrate`). Each step is
guarded (`PRAGMA table_info` before `ALTER TABLE ADD COLUMN`, and
`CREATE TABLE IF NOT EXISTS`), so re-running is safe and existing data is kept.

Columns added:

- `users.active` INTEGER DEFAULT 1 — deactivate without deleting
- `users.must_change` INTEGER DEFAULT 0 — force a password change at next sign-in
- `users.perms` TEXT — JSON array of section keys (Editor role scope)
- `users.updated_at` TEXT
- `users.created_by` INTEGER
- `sessions.created_at` TEXT

Tables added:

- `password_resets(id, user_id, token_hash, expires, used, created_at, ip)` —
  only a SHA-256 **hash** of each reset token is stored; tokens are single-use
  and expire after one hour.
- `audit_log(id, actor_id, actor_email, action, entity, entity_id, detail, ip, created_at)`

Indexes added: `idx_pwreset_user`, `idx_audit_created`, `idx_entries_collection`.

### Backup before deploying

The data lives in a single SQLite file on the Render persistent disk
(`$DATA_DIR`). Take a backup before the first deploy of this branch:

```
# On the Render shell (or wherever the disk is mounted)
cp "$DATA_DIR"/*.db "$DATA_DIR"/backup-$(date +%Y%m%d-%H%M%S).db
```

Because migrations are additive, a rollback to the previous code keeps working
against the same file (the new columns/tables are simply ignored).

## 2. New environment variables (set in Render → Environment)

| Variable | Purpose | Notes |
|---|---|---|
| `APP_BASE_URL` | Base URL for password-reset links in emails | e.g. `https://msmecatalyst.org` |
| `SMTP_HOST` | SMTP server host | Leave unset to disable email |
| `SMTP_PORT` | SMTP port | e.g. `587` |
| `SMTP_SECURE` | `true` for implicit TLS (465), else `false` | |
| `SMTP_USER` | SMTP username | secret — set via dashboard only |
| `SMTP_PASS` | SMTP password | secret — set via dashboard only |
| `EMAIL_FROM` | From header | e.g. `MSME Catalyst <no-reply@msmecatalyst.org>` |

**No credentials are committed to the repo.** `render.yaml` marks the SMTP
values `sync: false` (entered in the dashboard); `server/.env.example`
documents them with empty/placeholder values only.

If SMTP is not configured, password reset still works: the reset link is written
to the CMS **email outbox** (visible on the Dashboard) so an operator can deliver
it manually, and the UI states that email is not configured.

`ALLOW_TEST_HOOKS` must **remain unset in production** — it exists only so the
automated test suite can read a reset token back; it never runs on Render.

## 3. Roles

| Role | Access |
|---|---|
| Super Admin | Everything, including admin-user management and settings |
| CMS Admin | All content collections + ODR content; no CRM, no user management |
| Editor (assigned sections) | Only the sections assigned to them; can publish those |
| CRM Admin | Membership CRM read + write |
| CRM Viewer | Membership CRM read-only |

Legacy roles (Content/Membership/Governance/ODR Admin) are retained so existing
accounts keep working. **All permissions are enforced server-side** on every
`/api/*` route — the UI only hides what a role cannot use; direct API calls with
the wrong role return `401`/`403` (covered by tests).

## 4. Page & section publishing

- **Page Publishing** (Super Admin / content): hide/show whole pages. A hidden
  page returns HTTP 404 on direct URL (enforced in server middleware before
  static serving) and its content is retained in the CMS.
- **Section Visibility**: hide/show sections; the public site drops nav/button/
  text links to hidden pages and sections via `/api/public/pages` and
  `/api/public/visibility` (`public/assets/js/main.js`).

## 5. Tests

`server/test/run-tests.mjs` (run with `npm test`) boots the real server on a
throwaway database and exercises authentication, password change/reset,
every role, page-level permission restrictions, direct restricted-API access
attempts, draft/publish/hide, hidden nav/links, CRM read/write split, data
integrity, and the audit log — **79 assertions, all passing** (see §9 for the
revision-2 additions). `jsdom` is a **devDependency only** (not shipped: the
Render build uses `npm ci --omit=dev`); it lets the tests run the site's real
link-removal code against the actual built pages.

## 6. Files changed (high level)

- `server/db.js` — roles, additive migrations, exports
- `server/server.js` — auth, password reset, RBAC, publishing, audit, CSRF
- `server/mailer.js` — SMTP (env-configured; no secrets)
- `server/admin/admin.js` — Account & Security, Admin Users, Page Publishing, Audit Log views
- `server/admin/index.html` — “Forgot password?” flow
- `server/admin/reset.html` — password-reset page
- `public/assets/js/main.js` — drop links to hidden pages
- `server/package.json` — nodemailer dependency, `migrate`/`test` scripts
- `server/test/run-tests.mjs` — automated test suite
- `render.yaml`, `server/.env.example` — new env vars (no secrets)

## 7. Post-deploy checklist (must be done by the site owner)

1. Back up the SQLite data file (above).
2. Set the new env vars in Render (at least `APP_BASE_URL`; SMTP if email is wanted).
3. Deploy the branch to a **preview/staging** service first, if available.
4. Sign in as Super Admin, confirm the migration log line, and verify the
   Dashboard, content, CRM and ODR data are all intact.
5. Test change-password and the forgot/reset flow end-to-end.
6. Create one user per role and confirm the restrictions.
7. Hide a page, confirm 404 + links removed, then re-publish.
8. Only then promote to production.

## 8. Rebuilding the site content registry

The public pages and the editable-content registry are generated:

```
python3 build.py     # regenerates /public/*.html, /public/odr/*.html and server/content-registry.json
```

`build.py` requires `beautifulsoup4` (`pip install beautifulsoup4`). It auto-registers
every meaningful heading, paragraph, list item, quote, table cell, standalone
link (text + URL) and content image (src + alt) as a CMS field, plus global
nav/footer keys. Re-run it after editing any page source (`pages_main.py` /
`pages_odr.py`). Keys are assigned in document order (`<page>.c1`, `.c2` …) and
stay stable while page structure is unchanged, so saved overrides survive rebuilds.

## 9. Revision 2 — corrections in this update

**Full-site editability.** Every public page (main site + all ten `/odr/` pages)
is now editable through the CMS, not just three hero fields — 500+ registered
blocks covering headings, paragraphs, lists, buttons, links (text + URL), images
(src + alt) and shared nav/footer chrome. The runtime hydrates `data-cms`,
`data-cms-href`, `data-cms-src` and `data-cms-alt`.

**ODR pages are first-class.** All `/odr/` pages are individually publishable and
hideable (slugs `odr-index`, `odr-about`, `odr-how-it-works`, `odr-choose-provider`,
`odr-apply`, `odr-resources`, `odr-papers`, `odr-podcasts`, `odr-blogs`, `odr-contact`).
The old server rule that exempted every `/odr/` path from hidden-page enforcement
has been **removed**; a hidden ODR page now returns 404 on its direct URL, and
links to it are dropped everywhere (resolved via the shared `visibility-lib.js`).

**Section hiding incl. governance.** Governing Council, Advisory Body and
Secretariat are now hideable sections; hiding one removes the section block **and**
every nav / mobile-menu / footer / text link to its anchor (`about.html#council`, …).

**Editor scoping (backend-enforced).** Editor permissions now support page-level
(`page:<slug>`) and section-level (`sec:<key>`) grants in addition to content
collections. A scoped Editor can see/edit only its assigned pages and sections;
CRM, users, analytics, the audit log and unassigned pages/sections/collections all
return 403 even via a hand-entered API URL. Analytics is now Super-Admin-only.

**Dependencies.** `nodemailer` upgraded to `^10` (fixes the high-severity SMTP
advisories) with no code change needed. `qs` is pinned to `^6.15.4` via an
`overrides` entry to clear the moderate `qs`/`body-parser`/`express` advisories
without a breaking express 5 upgrade. `npm audit --omit=dev` now reports **0
vulnerabilities**; a test asserts no high/critical production vulnerabilities.

**New migration surface in revision 2:** none. No new tables or columns — page and
section publish/hide state is stored in the existing `settings` table
(`page.<slug>` / `vis.<key>` keys) and page copy in the existing `pagecopy` table.

## 10. Revision 3 — security hardening

**Stored-XSS prevention (server-side, allowlist).** All admin-supplied content is
sanitised on save in `server/sanitize.js` (built on `sanitize-html`):
- Rich text (`kind: html`) is cleaned to a strict tag allowlist
  (`a, b, strong, i, em, u, br, span, small, sup, sub, p, ul, ol, li, blockquote,
  h2–h4, abbr, code, mark`) with only `a[href,title,target,rel]` / `abbr[title]`
  attributes. Scripts, event handlers (`on*`), `iframe`/`object`/`embed`/`form`,
  `style`/inline CSS and `class` hooks, and dangerous URL schemes are removed;
  links get `rel="noopener noreferrer"`.
- URL fields (`kind: url`, and collection `url`/`file` types, and CRM
  `website`/`logo`) are validated by `safeUrl()`: only `http`, `https`, `mailto`,
  `tel` and safe relative-site URLs pass. `javascript:`, `data:`, `vbscript:`,
  protocol-relative (`//host`), protocol-obfuscated (`java\tscript:`) and
  control-character URLs are rejected with HTTP 400.
- Plain-text fields (`kind: text`, e.g. image alt) are stripped of all tags.

This covers **page copy, collections/CMS entries, media and CRM** — not only
page-copy fields. The public runtime still applies overrides, but the stored
values are already safe (defence in depth).

**Node version pinned.** `jsdom@30` (dev/test only) requires Node ≥ 22.22, so the
whole project is pinned to **Node 22** (Active LTS): `render.yaml` +
`server/render.yaml` (`NODE_VERSION: "22"`), `server/package.json`
(`"engines": { "node": ">=22 <23" }`) and a repo-root `.nvmrc` (`22`). Local
tests and Render now run the same major version.

**Dependency added:** `sanitize-html@^2.17` (production). `npm audit --omit=dev`
still reports **0 vulnerabilities**.

**Tests:** expanded to **99 assertions**, adding a STORED-XSS & URL VALIDATION
section that proves malicious HTML, event attributes, `iframe`s and dangerous URL
schemes are rejected or stripped across page copy, collections and CRM, while
ordinary formatting and valid `https`/relative links keep working.

**New migration surface in revision 3:** none.

## 11. Revision 4 — ODR micro-site navigation

The ODR micro-site now shares the **main MSME Catalyst header/navigation**
(Home · About Us · Our Approach · Membership · ODR Support · Knowledge Hub ·
Contact Us · Join), with **ODR Support** marked active. `pages_odr.py` delegates
its header to the main `header()` (prefix `../`), so desktop, mobile and dropdown
behaviour and styling are identical.

The old crowded ODR top nav (Resources · Blogs · Papers · Podcasts · Apply ·
Contact · Main Site) is gone. The ODR journey stays reachable through in-content
buttons — an `journey()` band (**About the Programme · How ODR Works · Choose a
Provider · Apply for Support**) on every ODR page — plus the existing hero CTAs.

The separate ODR **Blogs / Papers / Podcasts** libraries were removed
(`public/odr/blogs.html`, `papers.html`, `podcasts.html` deleted; `odr-blogs`,
`odr-papers`, `odr-podcasts` dropped from the server `PAGES` list). The
micro-site now links to the shared main-site Knowledge Hub — **Our Blogs
(`../blogs.html`), Our Podcasts (`../podcasts.html`), Whitepapers & Reports
(`../reports.html`)** — via the header dropdown, the ODR footer, and a
"Knowledge Hub" card row on the ODR home.

All CMS editability, page-publishing controls, role permissions, security
sanitisation and data are preserved. **Tests:** grew to **152 assertions** (added
an ODR MICROSITE NAVIGATION section covering desktop + mobile nav parity, active
section, journey-page links, shared Knowledge Hub links, and 404s for the removed
libraries). **New migration surface in revision 4:** none.
