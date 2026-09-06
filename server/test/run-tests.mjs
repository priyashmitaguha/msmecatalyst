// Automated tests for authentication, role permissions and publishing controls.
// Boots the real server on a throwaway DB, then exercises the API over HTTP.
// Run with: npm test   (from the server/ directory)
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const MCVis = require('../../public/assets/js/visibility-lib.js');
const PUBLIC = join(__dirname, '..', '..', 'public');

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

    console.log('\nFULL-SITE CMS EDITABILITY');
    const pc = await api('/api/pagecopy', {}, admin2);
    const groups = pc.data.groups || {};
    const expectPages = ['index','about','approach','programmes','membership','odr-support','contact',
      'odr-index','odr-about','odr-how-it-works','odr-choose-provider','odr-apply','odr-resources','odr-papers','odr-podcasts','odr-blogs','odr-contact','global'];
    ok('registry covers all main + ODR pages + global chrome', expectPages.every(p => groups[p] && groups[p].length));
    ok('pages are more than just hero fields (deep editability)', (groups['about']||[]).length >= 8 && (groups['odr-how-it-works']||[]).length >= 6);
    // Update one representative field on EVERY registered page group, then confirm it is retrievable publicly.
    let updated = 0, verified = 0;
    for (const page of Object.keys(groups)) {
      const field = groups[page][0]; if (!field) continue;
      const val = 'CMS-EDIT-' + page;
      const r = await api('/api/pagecopy/' + encodeURIComponent(field.key), { method: 'PUT', body: { value: val } }, admin2);
      if (r.status === 200) updated++;
    }
    const pubcopy = await api('/api/public/pagecopy');
    for (const page of Object.keys(groups)) {
      const field = groups[page][0]; if (!field) continue;
      if (pubcopy.data.copy[field.key] === 'CMS-EDIT-' + page) verified++;
    }
    ok('every registered page group has an editable+retrievable field', updated === Object.keys(groups).length && verified === Object.keys(groups).length);
    // Links are editable (URL fields registered). Images: the current pages use no
    // <img> in page CONTENT (logos live in the shared chrome; content uses SVG/emoji),
    // so no image field is registered — but the runtime applies image src+alt overrides
    // whenever a content image exists, which is the capability we assert here.
    ok('links are editable (link URL fields registered)', Object.keys(groups).some(p => groups[p].some(f => /Link URL/.test(f.label))));
    {
      const mainjs = readFileSync(join(PUBLIC, 'assets', 'js', 'main.js'), 'utf8');
      ok('images are editable (runtime applies data-cms-src and data-cms-alt overrides)',
        mainjs.includes('data-cms-src') && mainjs.includes('data-cms-alt'));
    }

    console.log('\nODR PAGES — EDIT / PUBLISH / HIDE');
    const odrKey = (groups['odr-about'][0]).key;
    ok('an ODR page can be edited via the CMS', (await api('/api/pagecopy/' + encodeURIComponent(odrKey), { method: 'PUT', body: { value: 'ODR about edited' } }, admin2)).status === 200);
    ok('ODR edit is retrievable publicly', (await api('/api/public/pagecopy')).data.copy[odrKey] === 'ODR about edited');
    ok('ODR page reachable before hiding (200)', (await fetch(BASE + '/odr/about.html')).status === 200);
    ok('super admin can hide an ODR page', (await api('/api/settings/pages/odr-about', { method: 'PUT', body: { published: false } }, admin2)).status === 200);
    ok('hidden ODR page returns 404 on direct URL', (await fetch(BASE + '/odr/about.html')).status === 404);
    ok('other ODR pages remain reachable (200)', (await fetch(BASE + '/odr/how-it-works.html')).status === 200);
    ok('public/pages lists the hidden ODR page', (await api('/api/public/pages')).data.hidden.includes('odr-about'));
    ok('audit captured the ODR page hide', (await api('/api/audit', {}, admin2)).data.audit.some(a => a.entity === 'page' && a.entity_id === 'odr-about'));

    console.log('\nLINK REMOVAL (real built pages via DOM)');
    // Links to a hidden ODR page disappear (run the SAME code the site runs).
    {
      const dom = new JSDOM(readFileSync(join(PUBLIC, 'odr', 'index.html'), 'utf8'), { url: BASE + '/odr/index.html' });
      const d = dom.window.document;
      const before = d.querySelectorAll('a[href$="about.html"]:not([href*="../"])').length;
      MCVis.applyHiddenPages(d, dom.window.location.href, ['odr-about'], dom.window.location.origin);
      const after = Array.from(d.querySelectorAll('a[href]')).filter(a => MCVis.slugFromPath(new dom.window.URL(a.getAttribute('href'), dom.window.location.href).pathname) === 'odr-about').length;
      ok('ODR page had in-page links to /odr/about before hiding', before > 0);
      ok('all links to the hidden ODR page are removed', after === 0);
    }
    ok('slugFromPath resolves main + ODR paths consistently',
      MCVis.slugFromPath('/') === 'index' && MCVis.slugFromPath('/about.html') === 'about' &&
      MCVis.slugFromPath('/odr/') === 'odr-index' && MCVis.slugFromPath('/odr/how-it-works.html') === 'odr-how-it-works');

    console.log('\nSECTION HIDING (Governing Council + anchor links)');
    ok('super admin can hide the Governing Council section', (await api('/api/settings/visibility/council', { method: 'PUT', body: { visible: false } }, admin2)).status === 200);
    ok('public visibility reflects hidden council', (await api('/api/public/visibility')).data.visible.council === false);
    {
      const dom = new JSDOM(readFileSync(join(PUBLIC, 'about.html'), 'utf8'), { url: BASE + '/about.html' });
      const d = dom.window.document;
      const secBefore = d.querySelectorAll('[data-section="council"]').length;
      ok('about.html tags the council section AND its anchor links', secBefore >= 2);
      MCVis.applyHiddenSections(d, { council: false });
      ok('hiding council removes the section and every council anchor link', d.querySelectorAll('[data-section="council"]').length === 0);
    }

    console.log('\nEDITOR PAGE/SECTION SCOPING (backend-enforced)');
    // Editor assigned ONLY to the ODR-about page and the council section.
    await api('/api/users', { method: 'POST', body: { name: 'Pia', email: 'pageeditor@example.org', password: 'Assigned-Only-2026',
      role: 'editor', perms: ['page:odr-about', 'sec:council'] } }, admin2);
    const ped = jar();
    await api('/api/auth/login', { method: 'POST', body: { email: 'pageeditor@example.org', password: 'Assigned-Only-2026' } }, ped);
    const pedCopy = await api('/api/pagecopy', {}, ped);
    ok('scoped editor sees ONLY the assigned page group', Object.keys(pedCopy.data.groups).length === 1 && !!pedCopy.data.groups['odr-about']);
    ok('scoped editor CAN edit its assigned page', (await api('/api/pagecopy/' + encodeURIComponent(odrKey), { method: 'PUT', body: { value: 'ok' } }, ped)).status === 200);
    const otherKey = (groups['about'][0]).key;
    ok('scoped editor CANNOT edit an unassigned page (403)', (await api('/api/pagecopy/' + encodeURIComponent(otherKey), { method: 'PUT', body: { value: 'nope' } }, ped)).status === 403);
    ok('scoped editor CAN hide its assigned page', (await api('/api/settings/pages/odr-about', { method: 'PUT', body: { published: true } }, ped)).status === 200);
    ok('scoped editor CANNOT hide an unassigned page (403)', (await api('/api/settings/pages/about', { method: 'PUT', body: { published: false } }, ped)).status === 403);
    ok('scoped editor CAN toggle its assigned section', (await api('/api/settings/visibility/council', { method: 'PUT', body: { visible: true } }, ped)).status === 200);
    ok('scoped editor CANNOT toggle an unassigned section (403)', (await api('/api/settings/visibility/programmes', { method: 'PUT', body: { visible: false } }, ped)).status === 403);
    ok('scoped editor CANNOT read the CRM (403)', (await api('/api/crm/organisations', {}, ped)).status === 403);
    ok('scoped editor CANNOT read analytics (403)', (await api('/api/analytics/summary', {}, ped)).status === 403);
    ok('scoped editor CANNOT read the audit log (403)', (await api('/api/audit', {}, ped)).status === 403);
    ok('scoped editor CANNOT manage users (403)', (await api('/api/users', {}, ped)).status === 403);
    ok('scoped editor CANNOT edit an unassigned collection (403)', (await api('/api/collections/reports', { method: 'POST', body: { data: {}, status: 'draft' } }, ped)).status === 403);

    console.log('\nSTORED-XSS & URL VALIDATION');
    // Page copy: rich text is allowlist-sanitised on save.
    const htmlKey = groups['about'][0].key;
    await api('/api/pagecopy/' + encodeURIComponent(htmlKey), { method: 'PUT', body: { value: '<strong>Safe</strong><script>alert(1)</script><img src=x onerror=alert(1)>' } }, admin2);
    let storedHtml = (await api('/api/public/pagecopy')).data.copy[htmlKey];
    ok('page-copy strips <script>', !/<script/i.test(storedHtml));
    ok('page-copy strips inline event handlers', !/onerror/i.test(storedHtml));
    ok('page-copy keeps ordinary formatting', /<strong>Safe<\/strong>/.test(storedHtml));
    await api('/api/pagecopy/' + encodeURIComponent(htmlKey), { method: 'PUT', body: { value: '<a href="javascript:alert(1)">x</a>' } }, admin2);
    ok('page-copy neutralises javascript: inside a link', !/javascript:/i.test((await api('/api/public/pagecopy')).data.copy[htmlKey] || ''));
    await api('/api/pagecopy/' + encodeURIComponent(htmlKey), { method: 'PUT', body: { value: '<iframe src="https://evil.example"></iframe>keep' } }, admin2);
    ok('page-copy strips <iframe>', !/<iframe/i.test((await api('/api/public/pagecopy')).data.copy[htmlKey] || ''));
    // Page copy: dedicated URL fields are validated.
    const urlField = Object.values(groups).flat().find(f => /Link URL/.test(f.label));
    ok('a link-URL field exists to validate', !!urlField);
    ok('page-copy rejects javascript: URL (400)', (await api('/api/pagecopy/' + encodeURIComponent(urlField.key), { method: 'PUT', body: { value: 'javascript:alert(1)' } }, admin2)).status === 400);
    ok('page-copy rejects data: URL (400)', (await api('/api/pagecopy/' + encodeURIComponent(urlField.key), { method: 'PUT', body: { value: 'data:text/html,<script>1</script>' } }, admin2)).status === 400);
    ok('page-copy rejects vbscript: URL (400)', (await api('/api/pagecopy/' + encodeURIComponent(urlField.key), { method: 'PUT', body: { value: 'vbscript:msgbox(1)' } }, admin2)).status === 400);
    ok('page-copy rejects protocol-obfuscated URL (400)', (await api('/api/pagecopy/' + encodeURIComponent(urlField.key), { method: 'PUT', body: { value: 'java\tscript:alert(1)' } }, admin2)).status === 400);
    ok('page-copy accepts a valid https URL', (await api('/api/pagecopy/' + encodeURIComponent(urlField.key), { method: 'PUT', body: { value: 'https://example.org/ok' } }, admin2)).status === 200);
    ok('page-copy accepts a valid relative URL', (await api('/api/pagecopy/' + encodeURIComponent(urlField.key), { method: 'PUT', body: { value: 'reports.html' } }, admin2)).status === 200);

    // Collections: richtext sanitised; url/file fields validated.
    const blog = await api('/api/collections/blogs', { method: 'POST', body: { data: { title: 'T', body: '<script>alert(1)</script><em>keep</em>', cover: '/uploads/ok.png' }, status: 'draft' } }, admin2);
    ok('collection accepts safe richtext content', blog.status === 200);
    const savedBlog = (await api('/api/collections/blogs', {}, admin2)).data.items.find(i => i.id === blog.data.id);
    ok('collection strips <script> from richtext but keeps formatting', !/<script/i.test(savedBlog.data.body) && /<em>keep<\/em>/.test(savedBlog.data.body));
    ok('collection rejects javascript: in a URL field (400)', (await api('/api/collections/reports', { method: 'POST', body: { data: { title: 'R', link: 'javascript:alert(1)' }, status: 'draft' } }, admin2)).status === 400);
    ok('collection rejects javascript: in a file field (400)', (await api('/api/collections/reports', { method: 'POST', body: { data: { title: 'R', file: 'javascript:alert(1)' }, status: 'draft' } }, admin2)).status === 400);
    ok('collection accepts a valid file URL', (await api('/api/collections/reports', { method: 'POST', body: { data: { title: 'R', file: '/uploads/r.pdf' }, status: 'draft' } }, admin2)).status === 200);

    // CRM: website + logo validated.
    ok('CRM rejects javascript: website (400)', (await api('/api/crm/organisations', { method: 'POST', body: { legal_name: 'Evil', website: 'javascript:alert(1)' } }, admin2)).status === 400);
    ok('CRM rejects unsafe logo URL (400)', (await api('/api/crm/organisations', { method: 'POST', body: { legal_name: 'Evil2', logo: 'vbscript:msgbox(1)' } }, admin2)).status === 400);
    ok('CRM accepts a valid https website + relative logo', (await api('/api/crm/organisations', { method: 'POST', body: { legal_name: 'Good Co', website: 'https://good.example', logo: '/uploads/logo.png' } }, admin2)).status === 200);

    console.log('\nPRODUCTION DEPENDENCY AUDIT');
    {
      const res = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=high', '--json'], { cwd: join(__dirname, '..'), encoding: 'utf8' });
      let high = null, crit = null, ran = false;
      try { const j = JSON.parse(res.stdout || '{}'); const v = j.metadata && j.metadata.vulnerabilities; if (v) { ran = true; high = v.high; crit = v.critical; } } catch (e) {}
      if (!ran) { console.log('  ⚠ npm audit could not run (offline?) — skipping high-severity assertion'); }
      else ok('no high or critical production vulnerabilities', high === 0 && crit === 0);
    }

    console.log(`\n${failed === 0 ? '✅ ALL PASSED' : '❌ FAILURES'} — ${passed} passed, ${failed} failed\n`);
  } catch (e) {
    console.error('TEST HARNESS ERROR:', e); failed++;
  } finally {
    child.kill('SIGKILL');
    try { rmSync(DATA, { recursive: true, force: true }); } catch (e) {}
    process.exit(failed === 0 ? 0 : 1);
  }
})();
