# Going live — hosting the full MSME Catalyst site (with admin + CMS + CRM)

The static site alone can go on Netlify (see the STAGING zip). But the **admin,
CMS and CRM need a host that runs Node**. Easiest options: **Render** or
**Railway**. Below is Render, step by step.

## Option A — Render (recommended, ~15 min)

**One-time prep**
1. Put this project in a **GitHub repo** (create a free GitHub account if needed,
   then upload the folder — GitHub's website has an "upload files" button, or use
   GitHub Desktop). Make sure the `server/` folder and `public/` folder are both in it.

**Deploy**
2. Go to **render.com** → **New** → **Blueprint**.
3. Connect your GitHub and pick this repo. Render reads `server/render.yaml`
   and sets everything up. Click **Apply**.
4. Wait ~3–5 minutes for the first build. Render gives you a URL like
   `https://msme-catalyst.onrender.com`.
5. Your public site is at that URL; the admin is at `…onrender.com/admin`.

**First thing after it's live**
6. During Blueprint setup, enter `ADMIN_EMAIL` and a unique strong
   `ADMIN_PASSWORD`. Use those credentials at `/admin`.

**Important about data on the free plan**
- The free plan's storage resets on each redeploy (the database reseeds from the
  sample data). Great for a team trial; **not** for real content you want to keep.
- To keep data permanently: upgrade the service to a paid plan (the `disk:` block
  in `render.yaml` then persists the database), **or** switch the database to a
  managed Postgres. I can make that change when you're ready.

## Option B — Railway
Very similar: railway.app → New Project → Deploy from GitHub repo → set the root
directory to `server` and the start command to `node server.js`. Add a volume
mounted at `server/data` to persist the database.

## What "hosted" changes
- Content your team edits in the hosted `/admin` appears on the **live** site
  immediately.
- The local test version on your laptop and the hosted version have **separate
  databases** — content doesn't sync between them. Do real content entry on the
  hosted admin (or ask me to pre-load it before launch).

## Custom domain
Once it's live on Render/Railway, you can point `www.msmecatalyst.org` at it in
the host's "custom domain" settings (add a CNAME record at your domain registrar).
Ask me and I'll walk you through it.

## Production checklist (before real launch)
- [ ] Set the real administrator email and a unique strong password.
- [ ] Move to a paid plan or Postgres so data persists.
- [ ] Wire the email outbox to a real email service (SES/Postmark/SendGrid) — see ARCHITECTURE.md.
- [ ] Add a payment webhook if you want auto "Paid → Active".
- [ ] Point your domain + enable HTTPS (automatic on Render/Railway).
