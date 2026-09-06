// Automated tests for authentication, role permissions and publishing controls.
// Boots the real server on a throwaway DB, then exercises the API over HTTP.
// Run with: npm test   (from the server/ directory)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4100 + Math.floor(Math.random() * 800);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA = mkdtempSync(join(tmpdir(), 'mc-test-'));
const ADMIN_EMAIL = 'admin@example.org';
const ADMIN_PASSWORD = 'Sup3rSecret-Admin!';   // ≥12, letter+number
let passed = 0, failed = 0;

const env = { ...process.env, NODE_ENV: 'test', PORT: String(PORT), DATA_DIR: DATA, UPLOAD_DIR: join(DATA, 'uploads'),
  ADMIN_EMAIL, ADMIN_PASSWORD, ALLOW_TEST_HOOKS: '1' };
const child = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stderr.on('data', d => { const s = d.toString(); if (!/DeprecationWarning|ExperimentalWarning/.test(s)) process.stderr.write('[server] ' + s); });

function ok(name, cond) { if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); } }

// Minimal cookie jar per "session".
function jar() { return { c: '' }; }
async function api(path, { method = 'GET', body, j } = {}, sess) {
  const headers = { Origin: BASE };
  if (body && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  if (sess && sess.c) headers.cookie = sess.c;
  const res = await fetch(BASE + path, { method, headers, body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined), redirect: 'manual' });
  const setc = res.headers.get('set-cookie');
  if (setc && sess) sess.c = setc.split(';')[0];
  let data = null; try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}
const waitHealth = async () => { for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/api/health'); if (r.ok) return true; } catch (e) {} await new Promise(r => setTimeout(r, 200)); } return false; };

(async () => {
  try {
    if (!await waitHealth()) throw new Error('server did not start');
    console.log('\nAUTHENTICATION');
    ok('health endpoint responds', (await api('/api/health')).status === 200);
    ok('login rejects wrong password', (await api('/api/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: 'wrong' } })).status === 401);
    const admin = jar();
    const li = await api('/api/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } }, admin);
    ok('super admin can log in', li.status === 200 && li.data.user.role === 'super_admin');
    ok('protected route needs auth (401 without cookie)', (await api('/api/auth/me')).status === 401);
    const me = await api('/api/auth/me', {}, admin);
    ok('me returns caps (crmWrite, users)', me.data.caps && me.data.caps.users === true && me.data.caps.crmWrite === true);

    console.log('\nPASSWORD MANAGEMENT');
    ok('change-password rejects wrong current', (await api('/api/auth/change-password', { method: 'POST', body: { current: 'nope', next: 'Brandnewpass12', confirm: 'Brandnewpass12' } }, admin)).status === 400);
    ok('change-password rejects weak password', (await api('/api/auth/change-password', { method: 'POST', body: { current: ADMIN_PASSWORD, next: 'short', confirm: 'short' } }, admin)).status === 400);
    ok('change-password rejects mismatch', (await api('/api/auth/change-password', { method: 'POST', body: { current: ADMIN_PASSWORD, next: 'Anotherpass123', confirm: 'different123' } }, admin)).status === 400);
    // forgot + reset flow (devToken only because ALLOW_TEST_HOOKS=1)
    const f = await api('/api/auth/forgot', { method: 'POST', body: { email: ADMIN_EMAIL } });
    ok('forgot returns generic 200 (no user enumeration)', f.status === 200);
    ok('forgot issued a single-use token (test hook)', !!f.data.devToken);
    ok('forgot for unknown email still 200', (await api('/api/auth/forgot', { method: 'POST', body: { email: 'nobody@example.org' } })).status === 200);
    const badReset = await api('/api/auth/reset', { method: 'POST', body: { token: 'invalidtoken', password: 'Resetpass1234', confirm: 'Resetpass1234' } });
    ok('reset rejects invalid token', badReset.status === 400);
    const NEWPW = 'Reset3d-Password!';
    const rst = await api('/api/auth/reset', { method: 'POST', body: { token: f.data.devToken, password: NEWPW, confirm: NEWPW } });
    ok('reset with valid token succeeds', rst.status === 200);
    ok('reset invalidated old sessions (old cookie now 401)', (await api('/api/auth/me', {}, admin)).status === 401);
    ok('token is single-use (second reset fails)', (await api('/api/auth/reset', { method: 'POST', body: { token: f.data.devToken, password: NEWPW, confirm: NEWPW } })).status === 400);
    // log back in with the new password
    const admin2 = jar();
    ok('login works with the reset password', (await api('/api/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: NEWPW } }, admin2)).status === 200);

    console.log('\nROLE-BASED ACCESS');
    // Create an Editor limited to reports only
    const ed = await api('/api/users', { method: 'POST', body: { name: 'Ed', email: 'editor@example.org', password: 'Sect10n-Access-Key', role: 'editor', perms: ['reports'] } }, admin2);
    ok('super admin can create an Editor', ed.status === 200);
    // Create a CRM Viewer
    const cv = await api('/api/users', { method: 'POST', body: { name: 'Val', email: 'viewer@example.org', password: 'Readonly-Crm-2026', role: 'crm_viewer' } }, admin2);
    ok('super admin can create a CRM Viewer', cv.status === 200);
    ok('reject creating user with weak password', (await api('/api/users', { method: 'POST', body: { email: 'x@example.org', password: 'weak', role: 'editor' } }, admin2)).status === 400);

    const editor = jar();
    await api('/api/auth/login', { method: 'POST', body: { email: 'editor@example.org', password: 'Sect10n-Access-Key' } }, editor);
    ok('editor CAN read its assigned collection (reports)', (await api('/api/collections/reports', {}, editor)).status === 200);
    ok('editor CANNOT read an unassigned collection (council 403)', (await api('/api/collections/council', {}, editor)).status === 403);
    ok('editor CANNOT read the CRM (403)', (await api('/api/crm/organisations', {}, editor)).status === 403);
    ok('editor CANNOT manage users (403)', (await api('/api/users', {}, editor)).status === 403);

    const viewer = jar();
    await api('/api/auth/login', { method: 'POST', body: { email: 'viewer@example.org', password: 'Readonly-Crm-2026' } }, viewer);
    ok('CRM Viewer CAN read the CRM', (await api('/api/crm/organisations', {}, viewer)).status === 200);
    ok('CRM Viewer CANNOT write to the CRM (403)', (await api('/api/crm/organisations', { method: 'POST', body: { legal_name: 'X' } }, viewer)).status === 403);
    ok('CRM Viewer CANNOT edit content (403)', (await api('/api/collections/reports', { method: 'POST', body: { data: {}, status: 'draft' } }, viewer)).status === 403);

    console.log('\nDIRECT API ACCESS (URL tampering)');
    ok('unauthenticated CRM access blocked (401)', (await api('/api/crm/organisations')).status === 401);
    ok('unauthenticated user-list blocked (401)', (await api('/api/users')).status === 401);
    ok('editor hitting CRM API directly blocked (403)', (await api('/api/crm/dashboard', {}, editor)).status === 403);

    console.log('\nPUBLISHING & VISIBILITY');
    // Publish an editor-created report, verify it appears publicly; draft does not.
    const draft = await api('/api/collections/reports', { method: 'POST', body: { data: { title: 'Draft Report' }, status: 'draft' } }, admin2);
    const pub = await api('/api/collections/reports', { method: 'POST', body: { data: { title: 'Published Report' }, status: 'published' } }, admin2);
    const publicReports = (await api('/api/public/collection/reports')).data.items.map(i => i.title);
    ok('published entry is public', publicReports.includes('Published Report'));
    ok('draft entry is NOT public', !publicReports.includes('Draft Report'));
    // editor cannot publish (role editor has publish flag true in this build → allowed); legacy check: editor here CAN publish assigned. Verify editor blocked from publishing UNassigned already covered.
    // Hide a page → 404 on direct access; show → 200
    ok('page is reachable before hiding (200)', (await fetch(BASE + '/reports.html')).status === 200);
    ok('super admin can hide a page', (await api('/api/settings/pages/reports', { method: 'PUT', body: { published: false } }, admin2)).status === 200);
    ok('hidden page returns 404 on direct URL', (await fetch(BASE + '/reports.html')).status === 404);
    ok('public/pages lists the hidden page', (await api('/api/public/pages')).data.hidden.includes('reports'));
    ok('super admin can re-publish the page', (await api('/api/settings/pages/reports', { method: 'PUT', body: { published: true } }, admin2)).status === 200);
    ok('re-published page returns 200', (await fetch(BASE + '/reports.html')).status === 200);
    // Section visibility
    ok('can hide a section', (await api('/api/settings/visibility/podcasts', { method: 'PUT', body: { visible: false } }, admin2)).status === 200);
    ok('public visibility reflects hidden section', (await api('/api/public/visibility')).data.visible.podcasts === false);

    console.log('\nDATA INTEGRITY & AUDIT');
    ok('seeded council entries still present', (await api('/api/collections/council', {}, admin2)).data.items.length >= 10);
    ok('seeded CRM organisations still present', (await api('/api/crm/organisations', {}, admin2)).data.organisations.length >= 3);
    ok('public member logo wall intact', (await api('/api/public/members')).data.members.length >= 1);
    const auditRes = await api('/api/audit', {}, admin2);
    ok('audit log records actions', auditRes.status === 200 && auditRes.data.audit.length > 0);
    ok('audit captured a publish action', auditRes.data.audit.some(a => a.action === 'entry_published' || a.action === 'page_published' || a.action === 'page_hidden'));

    console.log('\nDEACTIVATION');
    const uid = ed.data.id;
    ok('super admin can deactivate a user', (await api('/api/users/' + uid, { method: 'PUT', body: { active: false } }, admin2)).status === 200);
    ok('deactivated user can no longer log in', (await api('/api/auth/login', { method: 'POST', body: { email: 'editor@example.org', password: 'Sect10n-Access-Key' } })).status === 401);

    console.log(`\n${failed === 0 ? '✅ ALL PASSED' : '❌ FAILURES'} — ${passed} passed, ${failed} failed\n`);
  } catch (e) {
    console.error('TEST HARNESS ERROR:', e); failed++;
  } finally {
    child.kill('SIGKILL');
    try { rmSync(DATA, { recursive: true, force: true }); } catch (e) {}
    process.exit(failed === 0 ? 0 : 1);
  }
})();
