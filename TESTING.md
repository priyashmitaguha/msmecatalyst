# Testing MSME Catalyst locally (before you upload)

## Easiest: one-click start

- **Windows** — double-click **`start.bat`**
- **Mac** — double-click **`start.command`**
  (first time only: right-click → Open, to get past the security prompt;
  if it won't run, open Terminal in this folder and run `bash start.command`)

The script figures out what you have installed:

- If **Node.js** is installed → it launches the **full site + admin + CRM** and
  opens `http://localhost:4000/`. Admin panel is at `/admin`. Set
  `ADMIN_EMAIL` and `ADMIN_PASSWORD` before the first run.
- If only **Python** is installed → it launches a **quick static preview**
  (pages only) at `http://localhost:8080/`.
- If neither is installed → it tells you what to install
  (Node.js LTS from nodejs.org for the full experience).

To stop the server: close the black terminal window, or press `Ctrl + C` in it.

---

## What to click through when testing

**Public pages** — browse every page, resize the window (or use browser dev
tools, F12 → device toolbar) to check phone/tablet layout, open the mobile menu.

**Forms & CRM (full/Node mode only):**
1. Submit the **ODR application** (ODR micro-site → Apply) and the
   **Membership application** — then open `/admin` and confirm they appear under
   *ODR Applications* and *Membership CRM*.
2. In *Membership CRM*, open a member → set **Payment status = Paid** and a
   **start date** → save. Watch the end date auto-fill (+1 year) and the logo
   appear on the public **Membership** page's logo wall.
3. Toggle **"Secretariat: hide logo"** on that member → the logo disappears from
   the public wall; toggle it off → it comes back.
4. On the ODR micro-site, try **Choose a Provider** → see the 3-second redirect.
5. Sign out and confirm protected admin pages require authentication.

---

## Before uploading to your host
- Use a unique production administrator password of at least 12 characters.
- Replace the placeholder logo at `public/assets/img/logo.svg` with your official artwork.
- Set the three real **ODR provider** names + URLs in the admin.
- See `ARCHITECTURE.md` for wiring email, payments, analytics and going to production.
