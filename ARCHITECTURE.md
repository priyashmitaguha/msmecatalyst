# MSME Catalyst — Architecture & Operations

## Overview

```
┌──────────────────────────────┐        ┌─────────────────────────────┐
│  Public site + ODR micro-site │  fetch │  Back-end (Express + SQLite) │
│  /public  (static HTML/CSS/JS)│ ─────▶ │  /server                    │
│  · progressive enhancement    │  JSON  │  · role-based admin/CMS     │
│  · works with zero back-end   │ ◀───── │  · membership CRM + rules   │
└──────────────────────────────┘        │  · ODR intake + analytics   │
                                         └─────────────────────────────┘
```

The static site is the product of a small Python generator (`build.py`,
`pages_main.py`, `pages_odr.py`) so the header, footer, nav and design system
stay identical across all 24 pages. The back-end is a single Express app that
also serves `/public`, so one deploy gives you the dynamic experience.

## Design system
All tokens live in `public/assets/css/styles.css`. Brand palette is derived from
the logo: orange `#EE7A1A`, green `#1B7A3C`, warm neutrals. Type: **Sora**
(display) + **Inter** (body) via Google Fonts. Motion is restrained
(`prefers-reduced-motion` respected) and reveal animations are gated behind a
`.js` class so content is always visible without JavaScript (SEO-safe).

## Data model (SQLite)

| Table | Purpose |
|-------|---------|
| `users` | Admin users + role |
| `sessions` | httpOnly cookie sessions |
| `entries` | **Generic CMS store** — one row per item, `collection` + JSON `data` + `status` + `display_order` |
| `entry_versions` | Version history snapshot on every edit |
| `organisations` | Membership CRM master record (all membership/invoice/payment fields) |
| `contacts` | Multiple typed contacts per organisation |
| `odr_applications` | ODR case intake + status |
| `messages` | Contact form submissions |
| `newsletter` | Newsletter sign-ups |
| `tasks` | Internal team tasks (renewal outreach) |
| `emails` | Email automation outbox (wire to ESP) |
| `analytics` | Event log |

The **generic `entries` table** means every CMS collection (Council, Advisory,
Secretariat, Blogs, Reports, Podcasts, ODR Providers, Pages, Media, Social)
shares one code path. Field definitions live in `COLLECTIONS` in `server/db.js`
and drive the admin forms automatically — add a field there and it appears in
the UI with no other code changes.

## Editable page copy (the "Page Content" editor)

Two layers make the site content-managed:

1. **List content** (Council, Blogs, Reports, Podcasts, ODR Providers/Resources,
   members) lives in the DB and is rendered live: each public list container
   carries `data-cms-list="<collection>"` and `data-cms-render="profile|rcard"`,
   and `main.js` fetches `/api/public/collection/<name>` to populate it. If the
   fetch fails (static hosting) the built-in placeholder cards remain.

2. **Fixed page copy** (headings, paragraphs, footer, CTA, disclaimer) is wrapped
   in the generator with `T("page.key", "default text", …)`, which (a) renders the
   default into the HTML with a `data-cms="page.key"` attribute and (b) records the
   block in `content-registry.json`. On load, `main.js` calls
   `/api/public/pagecopy` and replaces any element whose key has an admin override.
   Defaults stay in the HTML, so SEO and static hosting are unaffected.

**To make more text editable:** in `pages_main.py` / `pages_odr.py`, wrap the
string with `T("home.my_key", "text", tag="h2", cls="...")` (or use `_reg()` when
you need custom markup/attributes and just want the default returned), run
`python3 build.py`, and it appears automatically in the admin Page Content editor.
Overrides are stored in the `pagecopy` table (`key` → `value`); an empty value
deletes the override and reverts to the default.

## Roles & permissions
Defined in `ROLES` (`server/db.js`) and enforced in `server.js`:
`super_admin` (all) · `content_admin` · `membership_admin` (CRM) ·
`governance_admin` · `odr_admin` · `editor` (drafts only, cannot publish).
Every API route checks `canManage / canCRM / canPublish` before acting.

## API reference

### Auth
- `POST /api/auth/login` `{email,password}` → sets cookie
- `POST /api/auth/logout`
- `GET  /api/auth/me` → user, role, collection definitions

### CMS (auth, role-scoped)
- `GET    /api/collections/:name`
- `POST   /api/collections/:name` `{data,status,display_order}`
- `PUT    /api/collections/:name/:id`
- `DELETE /api/collections/:name/:id`
- `GET    /api/collections/:name/:id/versions`
- `POST   /api/upload` (multipart) → media library

### Membership CRM (auth, CRM roles)
- `GET  /api/crm/organisations`
- `POST /api/crm/organisations`
- `PUT  /api/crm/organisations/:id`   ← runs membership automations
- `POST /api/crm/organisations/:id/contacts`
- `DELETE /api/crm/contacts/:id`
- `GET  /api/crm/dashboard`

### ODR (auth, ODR roles)
- `GET /api/odr/applications`
- `PUT /api/odr/applications/:id` `{status}`

### Public (no auth — consumed by the static site)
- `GET  /api/public/members?category=` → live logo wall
- `GET  /api/public/odr-providers`
- `GET  /api/public/collection/:name` → published/active items only
- `POST /api/public/odr-apply` (multipart, file uploads)
- `POST /api/public/membership-apply`
- `POST /api/public/contact`
- `POST /api/public/newsletter`
- `POST /api/public/analytics` `{event,meta}`

## Membership automation logic
Implemented in `applyMembershipRules()` (on every CRM write) and
`runDailySweep()` (scheduled twice-daily; also runs on boot):

1. `end_date = start_date + 1 year`; `renewal_due = end_date − 30 days`.
2. `payment_status = Paid` ⇒ `membership_status = Active`, `website_display_status = Paid and Live`.
3. Within 30 days of end → `Expiring`; past end → `Expired` + logo hidden.
4. Reminder emails at 30/15/7/0 days (de-duplicated via the `emails.template` key) to CEO + Finance SPOC + Primary Contact.
5. Team task created 30 days out.
6. Public logo query requires: `Active` + `Paid and Live` + `logo_consent` + `secretariat_hidden = 0` + not expired.
7. **Secretariat override** (`secretariat_hidden`) is enforced in the public query, so hiding/un-hiding never destroys the underlying state.

## Wiring the placeholders for production

| Placeholder | How to make it real |
|-------------|--------------------|
| **Email outbox** (`emails` table) | Replace the row insert with an ESP call (SES, Postmark, SendGrid). A cron/worker can drain unsent rows. Templates: `renewal_30/15/7`, `renewal_expiry`, plus application/approval/invoice/payment confirmations. |
| **Payments** | Add a Razorpay/Stripe webhook that sets `payment_status = Paid`; the automation cascade does the rest. |
| **Analytics** | `POST /api/public/analytics` already logs events; also add GA4/GTM (`window.dataLayer` hook is present for the ODR redirect). |
| **ODR provider URLs** | Edit the three ODR Providers records in the admin; the redirect uses their `url`. |
| **Scheduler** | `setInterval` runs the sweep in-process. For scale, move `runDailySweep()` to a real cron (`node runSweep.js`) or a queue. |
| **Storage** | Uploads go to `server/uploads`. For production use S3/GCS + a CDN. |
| **DB** | SQLite is ideal to start. The query layer is thin; migrate to Postgres by swapping the `better-sqlite3` calls if you outgrow it. |

## Security hardening checklist
- [ ] Change all seeded passwords; enforce strong passwords / SSO.
- [ ] Serve over HTTPS; set `cookie secure:true`.
- [ ] Add rate limiting on public POST endpoints (forms) + CAPTCHA.
- [ ] Virus-scan uploaded documents; restrict MIME types (already limited).
- [ ] Add CSRF tokens for admin mutations if exposing beyond same-origin.
- [ ] Back up the SQLite file (or move to managed Postgres).
- [ ] Review the privacy policy / consent copy with counsel.

## SEO
Every page has title, meta description, Open Graph tags, canonical support,
and clean semantic HTML. `Organization` JSON-LD is on the home page. CMS
entries carry editable SEO title / meta description fields. Add a
`sitemap.xml` + `robots.txt` at deploy (one line each per hosting platform).

## Neutrality guardrails (product, not just copy)
The platform is architecturally prevented from doing what the brief forbids:
there is **no** lead-allocation, underwriting, matching or ranking logic
anywhere. ODR provider selection is user-driven (dropdown → their own site);
referrals are neutral; the member wall is consent-gated; and the public
disclaimer is rendered site-wide from the shared footer.
