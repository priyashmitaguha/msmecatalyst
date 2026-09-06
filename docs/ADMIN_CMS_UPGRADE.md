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
integrity, and the audit log — **46 assertions, all passing**.

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
