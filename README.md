# MSME Catalyst — Website + Admin/CRM

Institutional website for **MSME Catalyst**, operated by **Digital Growth Infrastructure Foundation** (Section 8, not-for-profit). India's neutral convergence layer for MSME growth.

This repository contains two things that work together:

1. **`/public`** — the public website + ODR micro-site. Pure static HTML/CSS/JS. Host it anywhere (Netlify, Cloudflare Pages, S3, Nginx). Works with **no back-end at all**.
2. **`/server`** — a Node.js back-end (Express + SQLite) providing role-based **admin/CMS**, the **membership CRM** with automations, **ODR application intake**, and the public JSON APIs that make the member logo wall and forms live.

The public site is built to *degrade gracefully*: opened as flat files it shows placeholder content and demo forms; served by the back-end, the same pages become dynamic (live member logos, real form submission, CMS-driven providers).

---

## 1. Quick start — public site only (no back-end)

```bash
cd public
python3 -m http.server 8080      # or any static server
# open http://localhost:8080
```

Everything renders. Forms show a friendly confirmation. Member logos and ODR
providers show placeholder tiles.

## 2. Quick start — full stack (site + admin + CRM)

```bash
cd server
npm install
npm start
# Public site : http://localhost:4000/
# Admin panel : http://localhost:4000/admin
```

The server serves the `/public` site **and** the APIs from one process, so the
public pages automatically become dynamic.

### Administrator login

Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` before the database is created.
Production startup is blocked when either value is missing. Passwords are
bcrypt-hashed and sessions use secure, httpOnly cookies in production.

---

## What's included

### Public website (`/public`)
`index` · `about` (Who We Are, Why Neutrality, Governing Council, Advisory Body, Secretariat) ·
`approach` · `programmes` · `odr-support` (auto-redirects to the micro-site) ·
`membership` (application + live logo wall) · `funding` · `reports` · `podcasts` ·
`blogs` · `contact` · `privacy` · `terms`.

### ODR micro-site (`/public/odr`)
`index` · `about` · `how-it-works` · `choose-provider` (provider selection →
confirmation → 3-second redirect) · `resources` · `blogs` · `papers` ·
`podcasts` · `apply` (full case form) · `contact`.

### Admin / CMS / CRM (`/server`)
- **CMS collections**: Governing Council, Advisory Body, Secretariat, Blogs,
  Reports/Papers/Resources, Podcasts, ODR Providers, ODR Resources, Website
  Pages, Media Library, Social Links — each with the fields from the brief,
  publish/unpublish, display order, and version history on every edit.
- **Membership CRM**: organisations + multiple typed contacts, invoicing and
  payment fields, and the automations below.
- **ODR applications** intake and status workflow.
- **Analytics** event log (ODR redirects, applications, newsletter, etc.).

### Membership automations (verified)
- End date = **start date + 1 year**; renewal date = 30 days before end.
- Reminder emails queued at **30 / 15 / 7 / 0 days** before expiry to the CEO,
  Finance SPOC and Primary Contact (outbox table — wire to your ESP).
- Internal **team task** created 30 days before expiry.
- Payment **Paid → membership Active** and website **Paid and Live**.
- Member logo appears on the public wall only when **Active + Paid and Live +
  logo consent + not Secretariat-hidden + not expired**.
- Expiry/cancellation removes the logo automatically.
- **Secretariat override** hides any logo regardless of payment status, and
  un-hiding restores it.

---

## Editing the words on the site (no code) — "Page Content"

Log into `/admin` as Super Admin or Content Admin and open **✎ Page Content**.
Every hero headline, section heading, key paragraph, the footer tagline, the
legal disclaimer and the CTA band are listed — grouped by page — as editable
text boxes. Type a change, click **Save**, and it's live on the public site
immediately. **Reset to default** restores the original wording. (50 editable
blocks ship by default; a developer can expose more by wrapping any text in the
generator with `T(...)` — see `ARCHITECTURE.md`.)

The **list content** — Governing Council / Advisory / Secretariat profiles,
Blogs, Reports & Papers, Podcasts, ODR Providers, ODR Resources, member logos —
is edited in its own admin section and the public pages render it live.

> Because this editing is powered by the back-end, the *live, editable* site
> must be hosted on a Node host (Render/Railway/etc.). The static
> Netlify-style build shows the built-in default wording (great for a quick
> visual review, but edits made in the admin won't appear there).

## Editing branding

- **Logo**: `public/assets/img/logo.svg` (header/footer) and `favicon.svg`.
  These are clean SVG recreations of the MSME Catalyst wordmark so the site is
  self-contained — **replace them with the official master artwork** (drop a
  `logo.png`/`logo.svg` in the same folder and update references if needed).
- **Colours & type**: the whole design system lives in
  `public/assets/css/styles.css` (CSS variables at the top — orange `#EE7A1A`,
  green `#1B7A3C`, derived from the logo).
- **Page copy**: edit `pages_main.py` / `pages_odr.py` and run `python3 build.py`
  to regenerate the static site. Core page copy is also exposed as an editable
  "Website Pages" CMS collection for non-developer edits.

## Rebuilding the static site

```bash
python3 build.py      # regenerates everything under /public
```

## Notes for production
See `ARCHITECTURE.md` for the data model, API reference, email/ESP wiring,
analytics, security hardening and hosting recommendations.
