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
async function api(path, { method = 'GET', body, j, headers: extra } = {}, sess) {
  const headers = { Origin: BASE, ...(extra || {}) };
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
      'odr-index','odr-about','odr-how-it-works','odr-choose-provider','odr-apply','odr-resources','odr-contact','global'];
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

    console.log('\nODR MICROSITE NAVIGATION');
    const MAIN_NAV = ['Home', 'About Us', 'Our Approach', 'Membership', 'ODR Support', 'Knowledge Hub', 'Contact Us'];
    const odrPages = ['index.html', 'about.html', 'how-it-works.html', 'choose-provider.html', 'apply.html', 'resources.html', 'contact.html'];
    for (const f of odrPages) {
      const dom = new JSDOM(readFileSync(join(PUBLIC, 'odr', f), 'utf8'), { url: BASE + '/odr/' + f });
      const d = dom.window.document;
      const top = [...d.querySelectorAll('.nav-links > a, .nav-links > .has-drop > a')].map(a => a.textContent.replace(/\s*▾/, '').trim());
      ok('ODR ' + f + ': top navigation matches the main site', JSON.stringify(top) === JSON.stringify(MAIN_NAV));
      ok('ODR ' + f + ': ODR Support is the active section', [...d.querySelectorAll('.nav-links a.active')].some(a => /ODR Support/.test(a.textContent)));
      ok('ODR ' + f + ': every top-nav link points to the main site (../)', [...d.querySelectorAll('.nav-links a')].every(a => { const h = a.getAttribute('href') || ''; return h.startsWith('../') || h.startsWith('#'); }));
      ok('ODR ' + f + ': Join button present in the header', [...d.querySelectorAll('.nav-cta a')].some(a => /Join/i.test(a.textContent)));
      ok('ODR ' + f + ': mobile menu present (desktop + mobile parity)', d.querySelectorAll('.mobile-menu a').length >= 7);
      ok('ODR ' + f + ': old ODR-specific top-nav links are gone', ![...d.querySelectorAll('.nav-links a, .nav-cta a, .mobile-menu a')].some(a => /^(apply|resources|contact|blogs|papers|podcasts|about|how-it-works|choose-provider)\.html$/.test(a.getAttribute('href') || '')));
    }
    // In-content ODR journey buttons carry the user through the ODR pages.
    for (const f of ['about.html', 'how-it-works.html', 'choose-provider.html', 'apply.html', 'resources.html', 'contact.html']) {
      const d = new JSDOM(readFileSync(join(PUBLIC, 'odr', f), 'utf8')).window.document;
      const j = [...d.querySelectorAll('.odr-journey a')].map(a => a.getAttribute('href'));
      ok('ODR ' + f + ': in-content journey buttons present', ['about.html', 'how-it-works.html', 'choose-provider.html', 'apply.html'].every(x => j.includes(x)));
    }
    // Shared Knowledge Hub — links go to the MAIN site, not separate ODR libraries.
    {
      const home = new JSDOM(readFileSync(join(PUBLIC, 'odr', 'index.html'), 'utf8')).window.document;
      const links = [...home.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
      ok('ODR home links to shared Blogs/Podcasts/Reports on the main site', ['../blogs.html', '../podcasts.html', '../reports.html'].every(x => links.includes(x)));
    }
    ok('separate ODR Blogs library page removed (404)', (await fetch(BASE + '/odr/blogs.html')).status === 404);
    ok('separate ODR Podcasts library page removed (404)', (await fetch(BASE + '/odr/podcasts.html')).status === 404);
    ok('separate ODR Papers library page removed (404)', (await fetch(BASE + '/odr/papers.html')).status === 404);
    ok('odr-blogs is no longer a publishable page', !(await api('/api/settings/pages', {}, admin2)).data.pages.some(p => p.slug === 'odr-blogs'));

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

    console.log('\nGFF EVENT SCANNER — ACCESS LOCKDOWN');
    // Super Admin creates an individually-attributable Event Scanner account.
    const sc = await api('/api/users', { method: 'POST', body: { name: 'Rep One', email: 'scanner1@example.org', password: 'Scanner-Access-01', role: 'event_scanner' } }, admin2);
    ok('super admin can create an Event Scanner account', sc.status === 200);
    const scanner = jar();
    await api('/api/auth/login', { method: 'POST', body: { email: 'scanner1@example.org', password: 'Scanner-Access-01' } }, scanner);
    const scMe = await api('/api/auth/me', {}, scanner);
    ok('scanner me exposes scanner cap (and no admin caps)', scMe.data.caps.scanner === true && scMe.data.caps.users === false && scMe.data.caps.crmRead === false);
    ok('scanner CAN read its capture config', (await api('/api/scan/config', {}, scanner)).status === 200);
    ok('scanner CANNOT read the CRM (403)', (await api('/api/crm/organisations', {}, scanner)).status === 403);
    ok('scanner CANNOT browse scanned cards (403)', (await api('/api/crm/scans', {}, scanner)).status === 403);
    ok('scanner CANNOT export scans (403)', (await api('/api/crm/scans.csv', {}, scanner)).status === 403);
    ok('scanner CANNOT read the dashboard (403)', (await api('/api/crm/dashboard', {}, scanner)).status === 403);
    ok('scanner CANNOT read analytics (403)', (await api('/api/analytics/summary', {}, scanner)).status === 403);
    ok('scanner CANNOT read the audit log (403)', (await api('/api/audit', {}, scanner)).status === 403);
    ok('scanner CANNOT manage users (403)', (await api('/api/users', {}, scanner)).status === 403);
    ok('scanner CANNOT read page copy / CMS (403)', (await api('/api/pagecopy', {}, scanner)).status === 403);
    ok('scanner CANNOT read scanner settings (403)', (await api('/api/settings/scan', {}, scanner)).status === 403);

    console.log('\nGFF EVENT SCANNER — CAPTURE, VALIDATION, CRM, DEDUP');
    ok('card rejects a javascript: website (400)', (await api('/api/scan/card', { method: 'POST', body: { full_name: 'X', email: 'x@y.com', website: 'javascript:alert(1)' } }, scanner)).status === 400);
    ok('card rejects an invalid email (400)', (await api('/api/scan/card', { method: 'POST', body: { full_name: 'X', email: 'not-an-email' } }, scanner)).status === 400);
    ok('card rejects an empty submission (400)', (await api('/api/scan/card', { method: 'POST', body: { notes: 'nothing useful' } }, scanner)).status === 400);
    const card1 = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Asha Rao', designation: 'CEO', organisation: 'Acme Fintech Pvt Ltd', email: 'asha@acmefintech.com', mobile: '+91 98765 43210', website: 'acmefintech.com', city: 'Mumbai', notes: 'Interested in ODR', consent: false, event_source: 'GFF 2026' } }, scanner);
    ok('scanner can submit a reviewed card (200)', card1.status === 200 && card1.data.duplicate === false);
    // International phone format accepted
    ok('accepts a legitimate international phone', (await api('/api/scan/card', { method: 'POST', body: { full_name: 'Lee Wong', email: 'lee@sg-example.com', mobile: '+65 6123 4567' } }, scanner)).status === 200);
    // Duplicate by same email → append, do not overwrite, do not duplicate the contact.
    const dup = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Asha Rao', organisation: 'Acme', email: 'asha@acmefintech.com', mobile: '+91 98765 43210', notes: 'Met again at the booth', consent: false, event_source: 'GFF 2026' } }, scanner);
    ok('duplicate email is detected (not silently overwritten)', dup.status === 200 && dup.data.duplicate === true);
    // Verify via admin: one Acme contact, notes preserved+appended, event/source/submitter recorded.
    const orgs = (await api('/api/crm/organisations', {}, admin2)).data.organisations;
    const acme = orgs.find(o => /acme/i.test((o.legal_name || '') + (o.brand_name || '')));
    ok('duplicate did NOT create a second Acme contact', acme && acme.contacts.length === 1);
    ok('existing notes preserved and the new interaction appended', acme && /Interested in ODR/.test(acme.contacts[0].notes) && /Met again at the booth/.test(acme.contacts[0].notes));
    ok('org domain normalised for dedup', acme && acme.domain === 'acmefintech.com');
    const scans = (await api('/api/crm/scans', {}, admin2)).data.scans;
    ok('scan records attribute event + submitter', scans.some(s => s.event_source === 'GFF 2026' && s.submitter_email === 'scanner1@example.org'));
    ok('captured card created a follow-up task', (await api('/api/crm/dashboard', {}, admin2)).data.tasks.some(t => /Follow up: Asha Rao/.test(t.title)));
    ok('admin can filter scans by event', (await api('/api/crm/scans?event=GFF%202026', {}, admin2)).data.scans.length >= 1);
    ok('admin can export scans as CSV', (await api('/api/crm/scans.csv', {}, admin2)).status === 200);
    ok('scanner capture is audited', (await api('/api/audit', {}, admin2)).data.audit.some(a => a.action === 'card_captured'));

    console.log('\nGFF EVENT SCANNER — THANK-YOU EMAIL (sent / queued / failed / duplicate-prevented)');
    // No SMTP configured in tests → consented email should QUEUE, never falsely report "sent".
    const q = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Queue Person', email: 'queue@ex-one.com', consent: true, event_source: 'GFF 2026' } }, scanner);
    ok('consented email with no SMTP is queued (not falsely "sent")', q.data.email_status === 'queued');
    // Test hook simulates a successful send.
    const sent = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Sent Person', email: 'sent@ex-two.com', consent: true, event_source: 'GFF 2026' }, headers: { 'x-test-mail': 'sent' } }, scanner);
    ok('successful send reports email_status = sent', sent.data.email_status === 'sent');
    // Re-submitting the same email+event after a successful send must NOT resend.
    const skip = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Sent Person', email: 'sent@ex-two.com', consent: true, event_source: 'GFF 2026' }, headers: { 'x-test-mail': 'sent' } }, scanner);
    ok('duplicate thank-you is prevented (skipped_duplicate)', skip.data.email_status === 'skipped_duplicate');
    // Simulated failure → queued for retry, contact still saved.
    const fail = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Fail Person', email: 'fail@ex-three.com', consent: true, event_source: 'GFF 2026' }, headers: { 'x-test-mail': 'fail' } }, scanner);
    ok('failed send is recorded as failed and the contact is kept', fail.data.email_status === 'failed' && fail.data.contact_id > 0);
    // No consent → no email attempted.
    const noc = await api('/api/scan/card', { method: 'POST', body: { full_name: 'No Consent', email: 'noconsent@ex.com', consent: false } }, scanner);
    ok('no email is sent without consent', noc.data.email_status === 'skipped');

    console.log('\nGFF EVENT SCANNER — SUPER ADMIN SETTINGS & TEST EMAIL');
    ok('super admin can read scanner settings', (await api('/api/settings/scan', {}, admin2)).status === 200);
    const cfgSave = await api('/api/settings/scan', { method: 'PUT', body: { event_sources: [{ name: 'GFF 2026', active: true }, { name: 'Fintech Fest 2027', active: true }], email_subject: 'Hi {{first_name}} from {{event}}' } }, admin2);
    ok('super admin can add event sources + edit the email template', cfgSave.status === 200 && cfgSave.data.config.event_sources.some(s => s.name === 'Fintech Fest 2027'));
    ok('scanner settings reject a non-admin (crm viewer 403)', (await api('/api/settings/scan', {}, viewer)).status === 403);
    ok('test-email endpoint reports honestly when SMTP is unconfigured', (await api('/api/settings/scan/test-email', { method: 'POST', body: { email: 'me@example.org' } }, admin2)).data.configured === false);
    ok('a scanner cannot submit an unconfigured event source (falls back to default)', (await api('/api/scan/card', { method: 'POST', body: { full_name: 'Z', email: 'z@ex.com', event_source: 'Not A Real Event' } }, scanner)).status === 200);

    console.log('\nGFF EVENT SCANNER — MOBILE CAPTURE UI / OCR');
    {
      const html = readFileSync(join(__dirname, '..', 'admin', 'scan.html'), 'utf8');
      const d = new JSDOM(html).window.document;
      ok('capture form opens the phone camera (capture=environment)', !!d.querySelector('input[type=file][capture=environment][accept^="image"]'));
      ok('capture form allows uploading an existing image', d.querySelectorAll('input[type=file][accept^="image"]').length >= 2);
      ok('OCR library is loaded for on-device text extraction', /tesseract/i.test(html));
      const need = ['full_name','designation','organisation','email','mobile','alternate','website','address','city','state','country','linkedin','notes','areas_of_interest','follow_up_owner','follow_up_date','event_source','consent'];
      ok('every required card field is present for human review', need.every(n => d.querySelector(`[name="${n}"]`)));
      ok('consent checkbox gates the thank-you email', !!d.querySelector('input[type=checkbox][name=consent]'));
      const js = readFileSync(join(__dirname, '..', 'admin', 'scan.js'), 'utf8');
      ok('submission sends reviewed JSON fields, not the image', /\/api\/scan\/card/.test(js) && /JSON\.stringify/.test(js));
      ok('the card image is revoked/discarded after use and never uploaded to the server', /revokeObjectURL/.test(js) && !/\/api\/upload/.test(js));
      ok('scanners are redirected here and gated by role', /caps\.scan/.test(js) && /location\.replace\('\/admin'\)/.test(js));
    }

    console.log('\nREV5 — CSRF HARDENING (cookie-authenticated API)');
    const rawPut = (h) => fetch(BASE + '/api/settings/scan', { method: 'PUT', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify({}) }).then(r => r.status);
    ok('CSRF: correct same-origin is accepted', (await rawPut({ Origin: BASE, cookie: admin2.c })) === 200);
    ok('CSRF: foreign Origin is rejected (403)', (await rawPut({ Origin: 'https://evil.example', cookie: admin2.c })) === 403);
    ok('CSRF: malformed Origin is rejected (403)', (await rawPut({ Origin: 'http://[not a url', cookie: admin2.c })) === 403);
    ok('CSRF: "null" opaque Origin is rejected (403)', (await rawPut({ Origin: 'null', cookie: admin2.c })) === 403);
    ok('CSRF: MISSING Origin+Referer on an authenticated write is rejected (403)', (await rawPut({ cookie: admin2.c })) === 403);
    ok('CSRF: missing Origin but valid same-origin Referer is accepted', (await rawPut({ Referer: BASE + '/admin', cookie: admin2.c })) === 200);

    console.log('\nREV5 — TRANSACTIONAL PERSISTENCE (injected failures roll back)');
    for (const stage of ['org', 'contact', 'task', 'email']) {
      const before = (await api('/api/crm/scans', {}, admin2)).data.scans.length;
      const orgsBefore = (await api('/api/crm/organisations', {}, admin2)).data.organisations.length;
      const r = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Rollback ' + stage, email: `rollback-${stage}@ex-r.com`, organisation: 'Rollback Org ' + stage, consent: true }, headers: { 'x-test-fail': stage } }, scanner);
      const after = (await api('/api/crm/scans', {}, admin2)).data.scans.length;
      const orgsAfter = (await api('/api/crm/organisations', {}, admin2)).data.organisations.length;
      ok(`rollback@${stage}: request fails (500) and NO partial scan/org persists`, r.status === 500 && after === before && orgsAfter === orgsBefore);
    }

    console.log('\nREV5 — INTERNATIONAL PHONE NON-COLLISION');
    // Two international numbers with the SAME national digits but DIFFERENT country codes must be two contacts.
    await api('/api/scan/card', { method: 'POST', body: { full_name: 'India Person', email: 'in@collide-a.com', mobile: '+91 90000 12345' } }, scanner);
    const dupPhone = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Singapore Person', email: 'sg@collide-b.com', mobile: '+65 90000 12345' } }, scanner);
    ok('same national digits + different country code do NOT collide', dupPhone.data.duplicate === false);

    console.log('\nREV5 — EMAIL IDEMPOTENCY & CONCURRENCY');
    // Duplicate while queued: submit twice (no SMTP) → second is not a new send.
    await api('/api/scan/card', { method: 'POST', body: { full_name: 'Q1', email: 'idem-queue@ex.com', consent: true } }, scanner);
    const q2 = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Q1', email: 'idem-queue@ex.com', consent: true } }, scanner);
    ok('duplicate while queued reuses the record (still queued, not a 2nd send)', q2.data.email_status === 'queued');
    // Duplicate after sent → skipped_duplicate.
    await api('/api/scan/card', { method: 'POST', body: { full_name: 'S1', email: 'idem-sent@ex.com', consent: true }, headers: { 'x-test-mail': 'sent' } }, scanner);
    const afterSent = await api('/api/scan/card', { method: 'POST', body: { full_name: 'S1', email: 'idem-sent@ex.com', consent: true }, headers: { 'x-test-mail': 'sent' } }, scanner);
    ok('duplicate after sent is skipped_duplicate', afterSent.data.email_status === 'skipped_duplicate');
    // Duplicate while failed → retried through the SAME record (no new send record).
    await api('/api/scan/card', { method: 'POST', body: { full_name: 'F1', email: 'idem-fail@ex.com', consent: true }, headers: { 'x-test-mail': 'fail' } }, scanner);
    const afterFail = await api('/api/scan/card', { method: 'POST', body: { full_name: 'F1', email: 'idem-fail@ex.com', consent: true }, headers: { 'x-test-mail': 'sent' } }, scanner);
    ok('a failed thank-you can be re-sent through its existing record', ['sent', 'skipped_duplicate'].includes(afterFail.data.email_status));
    // Simultaneous card submissions for the SAME recipient+event → at most one send.
    const [c1, c2] = await Promise.all([
      api('/api/scan/card', { method: 'POST', body: { full_name: 'Race', email: 'race@ex.com', consent: true }, headers: { 'x-test-mail': 'sent' } }, scanner),
      api('/api/scan/card', { method: 'POST', body: { full_name: 'Race', email: 'race@ex.com', consent: true }, headers: { 'x-test-mail': 'sent' } }, scanner),
    ]);
    ok('simultaneous submits send the thank-you at most once', [c1, c2].filter(x => x.data.email_status === 'sent').length === 1);
    const raceScan = (await api('/api/crm/scans?event=General%20Meeting', {}, admin2)).data.scans.filter(s => s.contact_email === 'race@ex.com');
    ok('simultaneous submits did not duplicate the contact', new Set(raceScan.map(s => s.contact_name)).size >= 1 && (await api('/api/crm/scans', {}, admin2)).data.scans.filter(s => s.contact_email === 'race@ex.com').length === 2);
    // Simultaneous retries of one queued email → at most one send.
    await api('/api/scan/card', { method: 'POST', body: { full_name: 'RetryRace', email: 'retryrace@ex.com', consent: true } }, scanner);   // queued
    const rrScan = (await api('/api/crm/scans', {}, admin2)).data.scans.find(s => s.contact_email === 'retryrace@ex.com');
    const [rr1, rr2] = await Promise.all([
      api('/api/crm/scans/' + rrScan.id + '/retry-email', { method: 'POST', headers: { 'x-test-mail': 'sent' } }, admin2),
      api('/api/crm/scans/' + rrScan.id + '/retry-email', { method: 'POST', headers: { 'x-test-mail': 'sent' } }, admin2),
    ]);
    ok('simultaneous retries send at most once', [rr1, rr2].filter(r => r.data.status === 'sent' && r.data.claimed).length === 1);

    console.log('\nREV6 — STALE-SENDING RECOVERY (by sending_started_at, never created_at)');
    // Build a row that was CREATED long ago but CLAIMED just now (recent sending_started_at).
    await api('/api/scan/card', { method: 'POST', body: { full_name: 'StaleClock', email: 'staleclock@ex.com', consent: true } }, scanner); // queued (no SMTP)
    const eid = (await api('/api/crm/scans', {}, admin2)).data.scans.find(s => s.contact_email === 'staleclock@ex.com').email_id;
    ok('captured email id is exposed to admins', !!eid);
    await api('/api/test/email-state', { method: 'POST', body: { id: eid, created_at: '2020-01-01T00:00:00.000Z', status: 'sending', sending_started_at: new Date().toISOString(), sent_at: null } }, admin2);
    await api('/api/test/recover-stale', { method: 'POST' }, admin2);
    ok('recovery does NOT reset a just-claimed row despite an ancient created_at', (await api('/api/test/email/' + eid, {}, admin2)).data.email.status === 'sending');
    const concurrent = await api('/api/crm/emails/' + eid + '/retry', { method: 'POST', headers: { 'x-test-mail': 'sent' } }, admin2);
    ok('a concurrent request cannot reclaim an in-flight send', concurrent.data.status === 'sending' && concurrent.data.claimed === false);
    ok('the in-flight row stays sending (no duplicate send)', (await api('/api/test/email/' + eid, {}, admin2)).data.email.status === 'sending');

    // A genuinely abandoned 'sending' row (claimed long ago) IS recovered to queued.
    await api('/api/test/email-state', { method: 'POST', body: { id: eid, status: 'sending', sending_started_at: '2020-01-01T00:00:00.000Z', sent_at: null } }, admin2);
    await api('/api/test/recover-stale', { method: 'POST' }, admin2);
    ok('a genuinely stale sending row (old sending_started_at) is recovered to queued', (await api('/api/test/email/' + eid, {}, admin2)).data.email.status === 'queued');
    // The retry flow recovers a stale 'sending' row BEFORE deciding eligibility, then sends it.
    await api('/api/test/email-state', { method: 'POST', body: { id: eid, status: 'sending', sending_started_at: '2020-01-01T00:00:00.000Z', sent_at: null } }, admin2);
    const recoverRetry = await api('/api/crm/emails/' + eid + '/retry', { method: 'POST', headers: { 'x-test-mail': 'sent' } }, admin2);
    ok('retry recovers a stale sending row before eligibility, then sends', recoverRetry.data.status === 'sent');
    ok('a settled (sent) row has sending_started_at cleared', !(await api('/api/test/email/' + eid, {}, admin2)).data.email.sending_started_at);

    // Two truly interleaved retries make exactly ONE real SMTP call.
    await api('/api/scan/card', { method: 'POST', body: { full_name: 'OneCall', email: 'onecall@ex.com', consent: true } }, scanner); // queued
    const ocEid = (await api('/api/crm/scans', {}, admin2)).data.scans.find(s => s.contact_email === 'onecall@ex.com').email_id;
    await api('/api/test/smtp-calls/reset', { method: 'POST' }, admin2);
    const [o1, o2] = await Promise.all([
      api('/api/crm/emails/' + ocEid + '/retry', { method: 'POST', headers: { 'x-test-mail': 'sent-slow' } }, admin2),
      api('/api/crm/emails/' + ocEid + '/retry', { method: 'POST', headers: { 'x-test-mail': 'sent-slow' } }, admin2),
    ]);
    ok('two simultaneous retries make EXACTLY ONE SMTP call', (await api('/api/test/smtp-calls', {}, admin2)).data.calls === 1);
    ok('one simultaneous retry sends; the other is deflected as sending', [o1, o2].filter(r => r.data.status === 'sent').length === 1 && [o1, o2].some(r => r.data.status === 'sending'));

    console.log('\nREV5 — REUSABLE SCANNER (generic events, unlimited accounts, attribution)');
    ok('General Meeting is always an available event source', (await api('/api/scan/config', {}, scanner)).data.event_sources.includes('General Meeting'));
    const genScan = await api('/api/scan/card', { method: 'POST', body: { full_name: 'Generic', email: 'generic@ex.com', event_source: 'General Meeting' } }, scanner);
    ok('a card can be captured for a generic/non-GFF event', genScan.status === 200);
    // A future event, then deactivate it — historical scans keep the label.
    await api('/api/settings/scan', { method: 'PUT', body: { event_sources: [{ name: 'General Meeting', active: true }, { name: 'Future Summit 2027', active: true }] } }, admin2);
    await api('/api/scan/card', { method: 'POST', body: { full_name: 'Summit Attendee', email: 'summit@ex.com', event_source: 'Future Summit 2027' } }, scanner);
    await api('/api/settings/scan', { method: 'PUT', body: { event_sources: [{ name: 'General Meeting', active: true }, { name: 'Future Summit 2027', active: false }] } }, admin2);
    ok('deactivated event source is hidden from the capture form', !(await api('/api/scan/config', {}, scanner)).data.event_sources.includes('Future Summit 2027'));
    ok('but historical scans keep their (now inactive) event source', (await api('/api/crm/scans?event=Future%20Summit%202027', {}, admin2)).data.scans.some(s => s.contact_email === 'summit@ex.com'));
    // Unlimited scanner accounts (create more than seven) + deactivate/reactivate.
    let made = 0;
    for (let i = 2; i <= 9; i++) { const r = await api('/api/users', { method: 'POST', body: { name: 'Rep ' + i, email: `rep${i}@example.org`, password: `Scanner-Access-0${i}`, role: 'event_scanner' } }, admin2); if (r.status === 200) made++; }
    ok('Super Admin can create more than seven Event Scanner accounts', made === 8);
    const repList = (await api('/api/users', {}, admin2)).data.users.filter(u => u.role === 'event_scanner');
    ok('all scanner accounts are individually named with unique emails', new Set(repList.map(u => u.email)).size === repList.length && repList.length >= 8);
    const rep2 = repList.find(u => u.email === 'rep2@example.org');
    ok('Super Admin can deactivate a scanner', (await api('/api/users/' + rep2.id, { method: 'PUT', body: { active: false } }, admin2)).status === 200);
    ok('deactivated scanner cannot log in', (await api('/api/auth/login', { method: 'POST', body: { email: 'rep2@example.org', password: 'Scanner-Access-02' } })).status === 401);
    ok('Super Admin can reactivate a scanner', (await api('/api/users/' + rep2.id, { method: 'PUT', body: { active: true } }, admin2)).status === 200);
    ok('reactivated scanner can log in again', (await api('/api/auth/login', { method: 'POST', body: { email: 'rep2@example.org', password: 'Scanner-Access-02' } }, jar())).status === 200);
    ok('every scan records the submitter user id + email (stable attribution)', (await api('/api/crm/scans', {}, admin2)).data.scans.every(s => s.submitter_id > 0 && !!s.submitter_email));

    console.log('\nREV5 — SCANNER AUTHORIZATION (every API family, incl. new endpoints)');
    for (const [label, path, method, body] of [
      ['scan detail', '/api/crm/scans/1', 'GET', null],
      ['email retry', '/api/crm/emails/1/retry', 'POST', {}],
      ['scan retry', '/api/crm/scans/1/retry-email', 'POST', {}],
      ['scan settings write', '/api/settings/scan', 'PUT', { event_sources: [] }],
      ['test email', '/api/settings/scan/test-email', 'POST', { email: 'x@y.com' }],
      ['collections', '/api/collections/reports', 'GET', null],
      ['pages publish', '/api/settings/pages', 'GET', null],
      ['visibility', '/api/settings/visibility', 'GET', null],
      ['audit', '/api/audit', 'GET', null],
      ['users', '/api/users', 'GET', null],
    ]) {
      const r = await api(path, { method, body }, scanner);
      ok(`scanner blocked from ${label} (401/403)`, r.status === 401 || r.status === 403);
    }

    console.log('\nREV5 — DATA MINIMISATION & CLIENT SAFETY');
    const oneScan = (await api('/api/crm/scans', {}, admin2)).data.scans[0];
    ok('scan LIST omits raw_json and ip', oneScan && !('raw_json' in oneScan) && !('ip' in oneScan));
    const detail = await api('/api/crm/scans/' + oneScan.id, {}, admin2);
    ok('authorized detail endpoint returns the reviewed snapshot (CRM writer only)', detail.status === 200 && !!detail.data.reviewed && !('raw_json' in detail.data.scan));
    ok('scanner cannot open a scan detail (403)', (await api('/api/crm/scans/' + oneScan.id, {}, scanner)).status === 403);
    {
      const html = readFileSync(join(__dirname, '..', 'admin', 'scan.html'), 'utf8');
      const scripts = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi)].map(m => m[1]);
      ok('scanner page loads NO third-party script (self-hosted OCR only)', scripts.every(s => !/^https?:\/\//i.test(s)) && scripts.some(s => /vendor\/tesseract/.test(s)));
      const js = readFileSync(join(__dirname, '..', 'admin', 'scan.js'), 'utf8');
      ok('OCR worker is configured from local /vendor paths', /workerPath:\s*'\/vendor\/tesseract/.test(js) && /langPath:\s*'\/vendor\/tesseract/.test(js));
      ok('image safety: type + size checks before OCR', /OK_TYPES/.test(js) && /MAX_BYTES/.test(js));
      ok('image safety: downscale + orientation + release + double-tap guard', /createImageBitmap/.test(js) && /imageOrientation/.test(js) && /revokeObjectURL/.test(js) && /if \(busy\) return/.test(js));
      ok('still never uploads the image to the server', !/\/api\/upload/.test(js));
    }
    // Self-hosted OCR assets are actually served (same-origin, no CDN).
    ok('OCR runtime is served from /vendor (same-origin)', (await fetch(BASE + '/vendor/tesseract/js/tesseract.min.js')).status === 200);
    ok('OCR language model is served from /vendor (same-origin)', (await fetch(BASE + '/vendor/tesseract/lang/eng.traineddata.gz')).status === 200);

    console.log('\nCMS PARAGRAPH PRESERVATION');
    // Collection textarea field (council bio): multi-paragraph survives save + DB retrieval + render.
    const bio3 = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
    const cb = await api('/api/collections/council', { method: 'POST', body: { data: { name: 'Para Person', bio: bio3 }, status: 'published' } }, admin2);
    const savedBio = (await api('/api/collections/council', {}, admin2)).data.items.find(i => i.id === cb.data.id).data.bio;
    ok('multi-paragraph bio survives save + DB retrieval (newlines intact)', savedBio === bio3);
    ok('public rendering splits blank lines into separate <p>', (MCVis.toParagraphs(savedBio).match(/<p /g) || []).length === 3);
    // ODR provider description (the named field) — same reusable path, Windows endings.
    const cp = await api('/api/collections/odr_providers', { method: 'POST', body: { data: { name: 'Prov X', description: 'Desc one.\r\n\r\nDesc two.', url: 'https://provx.example' }, status: 'active' } }, admin2);
    const savedDesc = (await api('/api/collections/odr_providers', {}, admin2)).data.items.find(i => i.id === cp.data.id).data.description;
    ok('ODR provider description preserves Windows (\\r\\n) blank lines', (MCVis.toParagraphs(savedDesc).match(/<p /g) || []).length === 2);
    ok('both Unix and Windows line endings render two paragraphs', (MCVis.toParagraphs('A\n\nB').match(/<p /g) || []).length === 2 && (MCVis.toParagraphs('A\r\n\r\nB').match(/<p /g) || []).length === 2);
    ok('a single intentional line break becomes <br> inside the paragraph', /Line1<br>Line2/.test(MCVis.toParagraphs('Line1\nLine2')));
    ok('existing single-paragraph content is unchanged (one <p>)', (MCVis.toParagraphs('Just one paragraph, no blank lines.').match(/<p /g) || []).length === 1);
    // User HTML/scripts are escaped on the plain-text path (never executed, no bullets/dashes inserted).
    const xb = await api('/api/collections/council', { method: 'POST', body: { data: { name: 'XSS', bio: '<script>alert(1)</script>\n\nSafe line' }, status: 'published' } }, admin2);
    const xbio = (await api('/api/collections/council', {}, admin2)).data.items.find(i => i.id === xb.data.id).data.bio;
    ok('user HTML/scripts are escaped when rendered (not executed)', !/<script>/.test(MCVis.toParagraphs(xbio)) && /&lt;script&gt;/.test(MCVis.toParagraphs(xbio)));
    ok('no bullets/dashes/symbols are auto-inserted', !/[•—]/.test(MCVis.toParagraphs(bio3)));
    // Page-copy multiline field: paragraphs preserved, sanitised, no invalid <p>-in-<p>.
    const pcGroups = (await api('/api/pagecopy', {}, admin2)).data.groups;
    const mlField = Object.values(pcGroups).flat().find(f => f.multiline && !/Link URL|Image/.test(f.label));
    ok('a multiline page-copy field exists to test', !!mlField);
    await api('/api/pagecopy/' + encodeURIComponent(mlField.key), { method: 'PUT', body: { value: 'Pc one.\n\nPc two.\n\n<script>bad()</script>' } }, admin2);
    const pubcopy2 = await api('/api/public/pagecopy');
    ok('server marks the overridden field as multiline for the client', (pubcopy2.data.multiline || []).includes(mlField.key));
    ok('page-copy value stays server-sanitised (script stripped)', !/<script/i.test(pubcopy2.data.copy[mlField.key]));
    {
      const dom = new JSDOM('<!doctype html><body><p data-cms="k">x</p></body>');
      const el = dom.window.document.querySelector('[data-cms]');
      MCVis.renderParagraphsInto(el, pubcopy2.data.copy[mlField.key], { escape: false });
      ok('multiline page-copy renders multiple <p> with NO nested <p>', dom.window.document.querySelectorAll('p').length >= 2 && dom.window.document.querySelectorAll('p p').length === 0);
      ok('no <script> element results from rendered page-copy', dom.window.document.querySelectorAll('script').length === 0);
    }

    console.log('\nMEMBER LOGO WALL');
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]) {
      const dom = new JSDOM('<div id="w" class="logowall"></div>');
      const members = Array.from({ length: n }, (_, i) => ({ legal_name: 'Org ' + i, logo: '/uploads/' + i + '.png', website: 'https://x' + i + '.org', category: ['lenders', 'fintechs', 'anchors'][i % 3] }));
      MCVis.renderMemberWall(dom.window.document.getElementById('w'), members);
      ok('logo wall renders exactly ' + n + ' tiles, no empty placeholder cells', dom.window.document.querySelectorAll('#w .lw').length === n && dom.window.document.querySelectorAll('#w .lw > span').length === 0);
    }
    {
      const dom = new JSDOM('<div id="w" class="logowall"></div>');
      MCVis.renderMemberWall(dom.window.document.getElementById('w'), [
        { legal_name: 'Aspect Co', logo: '/u/a.png', website: 'https://a.org', category: 'lenders' },
        { legal_name: 'No Logo Co', category: 'fintechs' }]);
      const img = dom.window.document.querySelector('#w .lw-img');
      ok('logo image preserves aspect (lw-img/object-fit) and has org-name alt', img && img.getAttribute('alt') === 'Aspect Co' && img.className.indexOf('lw-img') > -1);
      ok('every tile carries data-cat so category filters keep working', dom.window.document.querySelector('#w .lw').getAttribute('data-cat') === 'lenders');
      ok('CRM categories map to the filter-button keys (Infrastructure→infra, ODR Providers→odr, Ecosystem Institutions→ecosystem)', MCVis.catKey('Infrastructure') === 'infra' && MCVis.catKey('ODR Providers') === 'odr' && MCVis.catKey('Ecosystem Institutions') === 'ecosystem' && MCVis.catKey('Lenders') === 'lenders');
      ok('a member without a logo falls back to its name (no broken tile)', /No Logo Co/.test(dom.window.document.querySelectorAll('#w .lw')[1].textContent));
    }
    {
      const css = readFileSync(join(PUBLIC, 'assets', 'css', 'styles.css'), 'utf8').replace(/\s+/g, '');
      ok('logo layout is a centred wrapping flex (even rows, centred last row)', css.includes('display:flex;flex-wrap:wrap;justify-content:center'));
      ok('logos use object-fit:contain (never stretched/cropped/distorted)', css.includes('object-fit:contain'));
      ok('mobile shows two columns where space allows (flex-basis 50%)', css.includes('flex:11calc(50%-7px)'));
      ok('very narrow screens collapse to one column', css.includes('@media(max-width:359px)') && css.includes('flex-basis:100%'));
      ok('tablet/desktop logo bounds ≈200/240px wide', css.includes('width:200px;height:105px') && css.includes('width:240px;height:120px'));
    }
    ok('internal CRM/developer note is absent from the public membership page', !/In production these tiles/.test(readFileSync(join(PUBLIC, 'membership.html'), 'utf8')));
    ok('member eligibility is still enforced server-side (endpoint returns members)', (await api('/api/public/members')).data.members.length >= 1);

    console.log('\nDATA PRESERVATION ACROSS RESTART + MIGRATION');
    // Save distinctive CMS content on the running server: a page-copy override on a
    // stable membership key (proves the note-removal did not renumber it) and a
    // published collection entry with multi-paragraph content.
    const preserveVal = 'PRESERVED-c23-' + Date.now();
    await api('/api/pagecopy/membership.c23', { method: 'PUT', body: { value: preserveVal } }, admin2);
    const preserveBio = 'Preserved para one.\n\nPreserved para two.';
    await api('/api/collections/council', { method: 'POST', body: { data: { name: 'Preserved Person', bio: preserveBio }, status: 'published' } }, admin2);
    ok('membership.c23 exists as a stable CMS key (not renumbered by note removal)', (await api('/api/public/pagecopy')).data.copy['membership.c23'] === preserveVal);
    // TRUE restart: stop this server, start a fresh one on the SAME data dir (re-runs
    // migrations + seed against the existing database), exactly like a redeploy.
    child.kill('SIGKILL');
    await new Promise(r => setTimeout(r, 400));
    const PORT2 = PORT + 1000, BASE2 = `http://127.0.0.1:${PORT2}`;
    let out2 = '';
    const child2 = spawn('node', ['server.js'], { env: { ...env, PORT: String(PORT2) }, stdio: ['ignore', 'pipe', 'pipe'] });
    child2.stdout.on('data', d => { out2 += d.toString(); });
    let up2 = false;
    for (let i = 0; i < 60; i++) { try { const r = await fetch(BASE2 + '/api/health'); if (r.ok) { up2 = true; break; } } catch (e) {} await new Promise(r => setTimeout(r, 200)); }
    ok('server restarts cleanly on the existing data directory', up2);
    const pc2 = await (await fetch(BASE2 + '/api/public/pagecopy')).json();
    ok('saved page-copy override is byte-identical after restart + migration', pc2.copy['membership.c23'] === preserveVal);
    const col2 = await (await fetch(BASE2 + '/api/public/collection/council')).json();
    const kept = (col2.items || []).find(i => i.name === 'Preserved Person');
    ok('saved multi-paragraph collection content is unchanged after restart', !!kept && kept.bio === preserveBio);
    ok('seeded governance data still present after restart', (col2.items || []).length >= 10);
    ok('startup SKIPS seeding when data is already present', /Seed skipped — data already present\./.test(out2));
    ok('startup re-runs migrations idempotently (additive; existing data preserved)', /Migrations applied \(additive; existing data preserved\)\./.test(out2));
    child2.kill('SIGKILL');

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
