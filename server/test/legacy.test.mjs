// Legacy-database migration & backfill tests (Revision 5).
// Builds a database in the ORIGINAL (pre-scanner) shape with historical rows,
// boots the real server against it, and proves the guarded migration + backfill
// behave safely and idempotently. Also verifies the production-proxy CSRF path.
// Run with: node test/legacy.test.mjs  (invoked by `npm test`).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const DATA = mkdtempSync(join(tmpdir(), 'mc-legacy-'));
const DBFILE = join(DATA, 'msme-catalyst.db');
const ADMIN_EMAIL = 'admin@example.org';
const ADMIN_PASSWORD = 'Sup3rSecret-Admin!';
const PROXY_URL = 'https://msmecatalyst.example';
let passed = 0, failed = 0;
const ok = (n, c) => { if (c) { passed++; console.log('  ✓ ' + n); } else { failed++; console.log('  ✗ ' + n); } };

/* ---- 1) Build a LEGACY database (original columns only; no scanner columns) ---- */
function buildLegacyDb() {
  const db = new Database(DBFILE);
  db.exec(`
    CREATE TABLE organisations(
      id INTEGER PRIMARY KEY, legal_name TEXT, brand_name TEXT, category TEXT, industry TEXT, website TEXT,
      address TEXT, gstin_pan TEXT, logo TEXT, logo_consent INTEGER DEFAULT 0,
      website_display_status TEXT DEFAULT 'Draft', membership_status TEXT DEFAULT 'Applied', secretariat_hidden INTEGER DEFAULT 0,
      application_date TEXT, approval_date TEXT, start_date TEXT, end_date TEXT, renewal_due TEXT,
      fee REAL, invoice_number TEXT, invoice_date TEXT, payment_status TEXT DEFAULT 'Unpaid',
      payment_date TEXT, renewal_invoice_status TEXT, notes TEXT, documents TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE contacts(
      id INTEGER PRIMARY KEY, org_id INTEGER, type TEXT, name TEXT, designation TEXT,
      email TEXT, phone TEXT, is_primary INTEGER DEFAULT 0);
    CREATE TABLE emails(
      id INTEGER PRIMARY KEY, to_addr TEXT, subject TEXT, body TEXT, template TEXT, org_id INTEGER, created_at TEXT, sent INTEGER DEFAULT 0);
    CREATE TABLE tasks(
      id INTEGER PRIMARY KEY, title TEXT, due TEXT, org_id INTEGER, done INTEGER DEFAULT 0, created_at TEXT);
  `);
  db.prepare("INSERT INTO organisations(id,legal_name,brand_name,website,membership_status,created_at) VALUES(1,'Legacy Corp','Legacy','https://legacycorp.example','Active','2024-01-01')").run();
  db.prepare("INSERT INTO contacts(id,org_id,name,designation,email,phone) VALUES(1,1,'Old Contact','Director','old@legacycorp.example','+91 90000 11111')").run();
  // historical emails: one already SENT, one never sent.
  db.prepare("INSERT INTO emails(id,to_addr,subject,body,template,sent,created_at) VALUES(1,'sentperson@past.example','Hi','...','thankyou',1,'2024-02-02')").run();
  db.prepare("INSERT INTO emails(id,to_addr,subject,body,template,sent,created_at) VALUES(2,'unsent@past.example','Renewal','...','renewal',0,'2024-02-03')").run();
  db.close();
}

const waitHealth = async (base) => { for (let i = 0; i < 60; i++) { try { const r = await fetch(base + '/api/health'); if (r.ok) return true; } catch (e) {} await new Promise(r => setTimeout(r, 200)); } return false; };
function boot(port) {
  const env = { ...process.env, NODE_ENV: 'test', PORT: String(port), DATA_DIR: DATA, UPLOAD_DIR: join(DATA, 'uploads'),
    ADMIN_EMAIL, ADMIN_PASSWORD, ALLOW_TEST_HOOKS: '1', APP_BASE_URL: PROXY_URL };
  const child = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.on('data', d => { const s = d.toString(); if (!/DeprecationWarning|ExperimentalWarning/.test(s)) process.stderr.write('[legacy-server] ' + s); });
  return child;
}
function readEmails() { const db = new Database(DBFILE, { readonly: true }); const rows = db.prepare('SELECT id,sent,status,idem_key FROM emails ORDER BY id').all(); db.close(); return rows; }

(async () => {
  let child;
  try {
    buildLegacyDb();
    const PORT = 4600 + Math.floor(Math.random() * 300);
    const BASE = `http://127.0.0.1:${PORT}`;
    child = boot(PORT);
    if (!await waitHealth(BASE)) throw new Error('legacy server did not start');

    const jar = { c: '' };
    async function api(path, { method = 'GET', body, headers } = {}, sess = jar) {
      const h = { Origin: BASE, 'content-type': 'application/json', ...(headers || {}) };
      if (sess && sess.c) h.cookie = sess.c;
      const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
      const sc = r.headers.get('set-cookie'); if (sc && sess) sess.c = sc.split(';')[0];
      let data = null; try { data = await r.json(); } catch (e) {}
      return { status: r.status, data };
    }

    console.log('\nLEGACY MIGRATION — HISTORICAL EMAIL STATUS');
    const e1 = readEmails();
    ok('historical SENT email is preserved as status=sent', e1.find(r => r.id === 1).status === 'sent');
    ok('historical UNSENT email gets a safe non-retriable status (legacy_unsent)', e1.find(r => r.id === 2).status === 'legacy_unsent');
    ok('historical rows carry no idempotency key', e1.every(r => r.idem_key === null));

    console.log('\nLEGACY BACKFILL — CRM NORMALISATION');
    await api('/api/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    const orgs = (await api('/api/crm/organisations')).data.organisations;
    const legacyOrg = orgs.find(o => o.legal_name === 'Legacy Corp');
    ok('legacy organisation domain backfilled from its website', legacyOrg && legacyOrg.domain === 'legacycorp.example');
    ok('legacy contact email/phone normalised by backfill', legacyOrg && legacyOrg.contacts[0].email_norm === 'old@legacycorp.example' && legacyOrg.contacts[0].phone_norm === '+919000011111');

    console.log('\nLEGACY DEDUP — SCANNING AN EXISTING CONTACT DOES NOT DUPLICATE');
    await api('/api/users', { method: 'POST', body: { name: 'Rep One', email: 'rep1@example.org', password: 'Scanner-Access-01', role: 'event_scanner' } });
    const sc = { c: '' };
    await api('/api/auth/login', { method: 'POST', body: { email: 'rep1@example.org', password: 'Scanner-Access-01' } }, sc);
    const orgCountBefore = (await api('/api/crm/organisations')).data.organisations.length;
    const contactCountBefore = (await api('/api/crm/organisations')).data.organisations.reduce((n, o) => n + o.contacts.length, 0);
    const scan = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Old Contact', email: 'old@legacycorp.example', mobile: '+91 90000 11111', notes: 'Met at event' } }, sc);
    ok('scanning the existing legacy contact is detected as a duplicate', scan.status === 200 && scan.data.duplicate === true);
    const orgsAfter = (await api('/api/crm/organisations')).data.organisations;
    const contactCountAfter = orgsAfter.reduce((n, o) => n + o.contacts.length, 0);
    ok('no new organisation was created', orgsAfter.length === orgCountBefore);
    ok('no new contact was created', contactCountAfter === contactCountBefore);
    ok('the existing contact was enriched (note appended, not overwritten)', orgsAfter.find(o => o.legal_name === 'Legacy Corp').contacts[0].notes.includes('Met at event'));

    console.log('\nLEGACY SAFETY — MIGRATED HISTORICAL EMAIL IS NOT RETRIABLE');
    ok('a legacy_unsent historical email cannot be retried', (await api('/api/crm/emails/2/retry', { method: 'POST' })).status === 400);
    ok('a legacy sent historical email reports already-sent, no resend', (await api('/api/crm/emails/1/retry', { method: 'POST' })).data.status === 'sent');

    console.log('\nPRODUCTION-PROXY CSRF');
    // Server booted with APP_BASE_URL set; an Origin matching the public host must be
    // accepted even though the internal Host header differs, while foreign is rejected.
    const proxyOk = await fetch(BASE + '/api/settings/scan', { method: 'PUT', headers: { 'content-type': 'application/json', Origin: PROXY_URL, cookie: jar.c }, body: '{}' });
    ok('CSRF accepts the configured public origin behind a proxy', proxyOk.status === 200);
    const proxyBad = await fetch(BASE + '/api/settings/scan', { method: 'PUT', headers: { 'content-type': 'application/json', Origin: 'https://evil.example', cookie: jar.c }, body: '{}' });
    ok('CSRF still rejects a foreign origin behind a proxy', proxyBad.status === 403);

    // ---- Idempotency across a SECOND boot: statuses must not change ----
    console.log('\nLEGACY MIGRATION — IDEMPOTENT ACROSS REBOOTS');
    const before = readEmails().map(r => ({ id: r.id, status: r.status }));
    child.kill('SIGKILL'); await new Promise(r => setTimeout(r, 400));
    const PORT2 = PORT + 1; const BASE2 = `http://127.0.0.1:${PORT2}`;
    child = boot(PORT2);
    if (!await waitHealth(BASE2)) throw new Error('legacy server did not restart');
    const after = readEmails().map(r => ({ id: r.id, status: r.status }));
    ok('email statuses are unchanged after a second boot (no rewrite)', JSON.stringify(before) === JSON.stringify(after));
    ok('re-migration did not resurrect any historical row for sending', after.find(r => r.id === 2).status === 'legacy_unsent' && after.find(r => r.id === 1).status === 'sent');

    console.log(`\n${failed === 0 ? '✅ LEGACY PASSED' : '❌ LEGACY FAILURES'} — ${passed} passed, ${failed} failed\n`);
  } catch (e) {
    console.error('LEGACY HARNESS ERROR:', e); failed++;
  } finally {
    try { child && child.kill('SIGKILL'); } catch (e) {}
    try { rmSync(DATA, { recursive: true, force: true }); } catch (e) {}
    process.exit(failed === 0 ? 0 : 1);
  }
})();
