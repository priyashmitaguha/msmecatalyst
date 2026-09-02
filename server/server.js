'use strict';
/* MSME Catalyst — back-end server
   - Role-based admin (CMS collections + membership CRM + ODR)
   - Public JSON APIs consumed by the static site (member logo wall, providers, forms)
   - Membership automations (renewal dates, reminders, auto publish/unpublish logos) */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db, ROLES, COLLECTIONS, seed, nowISO } = require('./db');

seed(); // idempotent

const app = express();
const PORT = process.env.PORT || 4000;
const PRODUCTION = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const publicWriteLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

const UP = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UP)) fs.mkdirSync(UP, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: UP,
    filename: (r, f, cb) => cb(null, Date.now() + '-' + f.originalname.replace(/[^\w.\-]/g, '_')),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set(['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf']);
    cb(allowed.has(file.mimetype) ? null : new Error('Unsupported file type'), allowed.has(file.mimetype));
  },
});

/* ---------------- auth ---------------- */
function newToken() { return crypto.randomBytes(24).toString('hex'); }
function currentUser(req) {
  const t = req.cookies.mc_session;
  if (!t) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token=?').get(t);
  if (!s || s.expires < Date.now()) return null;
  return db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(s.user_id);
}
function requireAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'Not authenticated' });
  req.user = u; next();
}
function canManage(role, collection) {
  const r = ROLES[role]; if (!r) return false;
  if (r.all) return true;
  return Array.isArray(r.collections) && r.collections.includes(collection);
}
function canPublish(role) { const r = ROLES[role]; return r && (r.all || r.publish !== false); }
function canCRM(role) { const r = ROLES[role]; return r && (r.all || r.crm); }

app.post('/api/auth/login', loginLimit, (req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE email=?').get((email || '').toLowerCase().trim());
  if (!u || !bcrypt.compareSync(password || '', u.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = newToken();
  db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)')
    .run(token, u.id, Date.now() + 1000 * 60 * 60 * 12);
  res.cookie('mc_session', token, { httpOnly: true, secure: PRODUCTION, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 12 });
  res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});
app.post('/api/auth/logout', (req, res) => {
  if (req.cookies.mc_session) db.prepare('DELETE FROM sessions WHERE token=?').run(req.cookies.mc_session);
  res.clearCookie('mc_session'); res.json({ ok: true });
});
app.get('/api/auth/me', requireAuth, (req, res) => {
  const r = ROLES[req.user.role];
  res.json({ user: req.user, role: { key: req.user.role, ...r }, collections: COLLECTIONS, roles: ROLES });
});

/* ---------------- generic CMS entries ---------------- */
app.get('/api/collections/:name', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!COLLECTIONS[name]) return res.status(404).json({ error: 'Unknown collection' });
  if (!canManage(req.user.role, name)) return res.status(403).json({ error: 'Forbidden' });
  const rows = db.prepare('SELECT * FROM entries WHERE collection=? ORDER BY display_order, id').all(name)
    .map(r => ({ ...r, data: JSON.parse(r.data) }));
  res.json({ collection: name, def: COLLECTIONS[name], items: rows });
});
app.post('/api/collections/:name', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!COLLECTIONS[name] || !canManage(req.user.role, name)) return res.status(403).json({ error: 'Forbidden' });
  const { data = {}, status = 'draft', display_order = 0 } = req.body || {};
  const info = db.prepare('INSERT INTO entries(collection,data,status,display_order,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
    .run(name, JSON.stringify(data), status, display_order, req.user.id, nowISO(), nowISO());
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/collections/:name/:id', requireAuth, (req, res) => {
  const { name, id } = req.params;
  if (!COLLECTIONS[name] || !canManage(req.user.role, name)) return res.status(403).json({ error: 'Forbidden' });
  const cur = db.prepare('SELECT * FROM entries WHERE id=? AND collection=?').get(id, name);
  if (!cur) return res.status(404).json({ error: 'Not found' });
  let status = req.body.status ?? cur.status;
  // Editors cannot publish
  if (['published', 'active'].includes(status) && !canPublish(req.user.role))
    return res.status(403).json({ error: 'Your role cannot publish. Save as review/draft instead.' });
  db.prepare('INSERT INTO entry_versions(entry_id,data,status,saved_at,saved_by) VALUES(?,?,?,?,?)')
    .run(cur.id, cur.data, cur.status, nowISO(), req.user.id); // version history
  const data = req.body.data ? JSON.stringify(req.body.data) : cur.data;
  const display_order = req.body.display_order ?? cur.display_order;
  db.prepare('UPDATE entries SET data=?,status=?,display_order=?,updated_at=? WHERE id=?')
    .run(data, status, display_order, nowISO(), cur.id);
  res.json({ ok: true });
});
app.delete('/api/collections/:name/:id', requireAuth, (req, res) => {
  const { name, id } = req.params;
  if (!COLLECTIONS[name] || !canManage(req.user.role, name)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM entries WHERE id=? AND collection=?').run(id, name);
  res.json({ ok: true });
});
app.get('/api/collections/:name/:id/versions', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id,status,saved_at FROM entry_versions WHERE entry_id=? ORDER BY id DESC').all(req.params.id);
  res.json({ versions: rows });
});

/* ---------------- Membership CRM ---------------- */
app.get('/api/crm/organisations', requireAuth, (req, res) => {
  if (!canCRM(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const orgs = db.prepare('SELECT * FROM organisations ORDER BY id DESC').all();
  const contacts = db.prepare('SELECT * FROM contacts').all();
  orgs.forEach(o => o.contacts = contacts.filter(c => c.org_id === o.id));
  res.json({ organisations: orgs });
});
app.post('/api/crm/organisations', requireAuth, (req, res) => {
  if (!canCRM(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const b = req.body || {};
  const cols = ['legal_name','brand_name','category','industry','website','address','gstin_pan','logo','logo_consent',
    'website_display_status','membership_status','fee','notes'];
  const vals = cols.map(c => b[c] ?? null);
  const info = db.prepare(`INSERT INTO organisations(${cols.join(',')},application_date,created_at,updated_at)
    VALUES(${cols.map(()=>'?').join(',')},?,?,?)`).run(...vals, b.application_date || nowISO().slice(0,10), nowISO(), nowISO());
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/crm/organisations/:id', requireAuth, (req, res) => {
  if (!canCRM(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const cur = db.prepare('SELECT * FROM organisations WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Not found' });
  const editable = ['legal_name','brand_name','category','industry','website','address','gstin_pan','logo','logo_consent',
    'website_display_status','membership_status','secretariat_hidden','approval_date','start_date','end_date','renewal_due',
    'fee','invoice_number','invoice_date','payment_status','payment_date','renewal_invoice_status','notes','documents'];
  const merged = { ...cur };
  editable.forEach(k => { if (k in req.body) merged[k] = req.body[k]; });
  applyMembershipRules(merged, cur); // automation on write
  db.prepare(`UPDATE organisations SET ${editable.map(k=>k+'=?').join(',')},updated_at=? WHERE id=?`)
    .run(...editable.map(k => merged[k]), nowISO(), cur.id);
  res.json({ ok: true, organisation: merged });
});
app.post('/api/crm/organisations/:id/contacts', requireAuth, (req, res) => {
  if (!canCRM(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const b = req.body || {};
  if (b.is_primary) db.prepare('UPDATE contacts SET is_primary=0 WHERE org_id=?').run(req.params.id);
  const info = db.prepare('INSERT INTO contacts(org_id,type,name,designation,email,phone,is_primary) VALUES(?,?,?,?,?,?,?)')
    .run(req.params.id, b.type, b.name, b.designation, b.email, b.phone, b.is_primary ? 1 : 0);
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/crm/contacts/:id', requireAuth, (req, res) => {
  if (!canCRM(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM contacts WHERE id=?').run(req.params.id); res.json({ ok: true });
});

/* Membership business rules (runs on every CRM write) */
function addYear(d) { const x = new Date(d); x.setFullYear(x.getFullYear() + 1); return x.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(a) - new Date(b)) / 86400000); }
function applyMembershipRules(o, prev) {
  // 1) end date = start + 1 year
  if (o.start_date && (!o.end_date || (prev && prev.start_date !== o.start_date))) o.end_date = addYear(o.start_date);
  // renewal due = 30 days before end
  if (o.end_date) { const r = new Date(o.end_date); r.setDate(r.getDate() - 30); o.renewal_due = r.toISOString().slice(0,10); }
  // 2) payment Paid -> Active (if approved/invoiced)
  if (o.payment_status === 'Paid') {
    if (!o.payment_date) o.payment_date = nowISO().slice(0,10);
    if (['Approved','Invoice Sent','Paid','Applied','Prospect'].includes(o.membership_status)) o.membership_status = 'Active';
    // Paid + not manually overridden ⇒ eligible to display. (Expiry re-hides afterwards below.)
    if (!o.secretariat_hidden) o.website_display_status = 'Paid and Live';
  }
  // expiry state transitions
  if (o.end_date && o.membership_status === 'Active') {
    const d = daysBetween(o.end_date, new Date().toISOString().slice(0,10));
    if (d < 0) { o.membership_status = 'Expired'; o.website_display_status = 'Hidden'; }
    else if (d <= 30) o.membership_status = 'Expiring';
  }
  // Expiry/cancellation forces the display status to Hidden.
  // (The manual Secretariat override — secretariat_hidden — is enforced separately by the
  //  public members query, so toggling it never destroys the underlying Paid-and-Live state.)
  if (['Expired','Cancelled'].includes(o.membership_status)) {
    if (o.website_display_status === 'Paid and Live') o.website_display_status = 'Hidden';
  }
}

/* Daily automation sweep: transitions + reminder emails + internal tasks */
function runDailySweep() {
  const today = new Date().toISOString().slice(0, 10);
  const orgs = db.prepare('SELECT * FROM organisations').all();
  for (const o of orgs) {
    const before = JSON.stringify(o);
    applyMembershipRules(o, o);
    if (JSON.stringify(o) !== before) {
      db.prepare('UPDATE organisations SET membership_status=?,website_display_status=?,end_date=?,renewal_due=?,updated_at=? WHERE id=?')
        .run(o.membership_status, o.website_display_status, o.end_date, o.renewal_due, nowISO(), o.id);
    }
    if (!o.end_date) continue;
    const d = daysBetween(o.end_date, today); // days until expiry
    const marks = [30, 15, 7, 0];
    if (marks.includes(d)) {
      const tmpl = d === 0 ? 'renewal_expiry' : `renewal_${d}`;
      const exists = db.prepare('SELECT 1 FROM emails WHERE org_id=? AND template=?').get(o.id, tmpl);
      if (!exists) {
        const recips = db.prepare("SELECT email FROM contacts WHERE org_id=? AND (type IN ('CEO / authorised signatory','Finance SPOC') OR is_primary=1)").all(o.id)
          .map(c => c.email).filter(Boolean);
        const subject = d === 0 ? `Membership expired: ${o.brand_name || o.legal_name}` : `Membership renewal due in ${d} days`;
        recips.forEach(to => db.prepare('INSERT INTO emails(to_addr,subject,body,template,org_id,created_at) VALUES(?,?,?,?,?,?)')
          .run(to, subject, `This is a renewal reminder for ${o.legal_name}. End date: ${o.end_date}.`, tmpl, o.id, nowISO()));
      }
      if (d === 30) {
        const t = db.prepare('SELECT 1 FROM tasks WHERE org_id=? AND title LIKE ?').get(o.id, 'Renewal outreach%');
        if (!t) db.prepare('INSERT INTO tasks(title,due,org_id,created_at) VALUES(?,?,?,?)')
          .run(`Renewal outreach — ${o.legal_name}`, o.renewal_due, o.id, nowISO());
      }
    }
  }
}
runDailySweep();
setInterval(runDailySweep, 1000 * 60 * 60 * 12); // twice daily

/* CRM dashboard summary */
app.get('/api/crm/dashboard', requireAuth, (req, res) => {
  if (!canCRM(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const q = s => db.prepare(s).get().c;
  res.json({
    active: q("SELECT COUNT(*) c FROM organisations WHERE membership_status='Active'"),
    expiring: q("SELECT COUNT(*) c FROM organisations WHERE membership_status='Expiring'"),
    overdue: q("SELECT COUNT(*) c FROM organisations WHERE payment_status='Unpaid' AND membership_status IN ('Invoice Sent','Expiring','Active')"),
    pending_apps: q("SELECT COUNT(*) c FROM organisations WHERE membership_status IN ('Applied','Prospect')"),
    revenue_due: db.prepare("SELECT COALESCE(SUM(fee),0) c FROM organisations WHERE payment_status='Unpaid'").get().c,
    live_logos: q("SELECT COUNT(*) c FROM organisations WHERE membership_status='Active' AND website_display_status='Paid and Live' AND logo_consent=1 AND secretariat_hidden=0"),
    tasks: db.prepare('SELECT * FROM tasks WHERE done=0 ORDER BY due').all(),
    emails: db.prepare('SELECT * FROM emails ORDER BY id DESC LIMIT 20').all(),
  });
});

/* ---------------- ODR applications ---------------- */
app.get('/api/odr/applications', requireAuth, (req, res) => {
  const r = ROLES[req.user.role];
  if (!(r.all || r.odr)) return res.status(403).json({ error: 'Forbidden' });
  res.json({ applications: db.prepare('SELECT * FROM odr_applications ORDER BY id DESC').all() });
});
app.put('/api/odr/applications/:id', requireAuth, (req, res) => {
  const r = ROLES[req.user.role];
  if (!(r.all || r.odr)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('UPDATE odr_applications SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

/* ---------------- Editable page copy ---------------- */
let REGISTRY = {};
try { REGISTRY = require('./content-registry.json'); }
catch (e) { console.warn('content-registry.json not found — run `python3 build.py` to generate it.'); }

// Public: all overrides, applied by main.js over the in-page defaults.
app.get('/api/public/pagecopy', (req, res) => {
  const rows = db.prepare('SELECT key,value FROM pagecopy').all();
  const copy = {}; rows.forEach(r => { copy[r.key] = r.value; });
  res.json({ copy });
});
// Admin: registry (labels + defaults) merged with current overrides, grouped by page.
app.get('/api/pagecopy', requireAuth, (req, res) => {
  if (!canManage(req.user.role, 'pages')) return res.status(403).json({ error: 'Forbidden' });
  const overrides = {}; db.prepare('SELECT key,value FROM pagecopy').all().forEach(r => overrides[r.key] = r.value);
  const groups = {};
  Object.keys(REGISTRY).sort().forEach(key => {
    const r = REGISTRY[key];
    (groups[r.page] = groups[r.page] || []).push({
      key, label: r.label, multiline: !!r.multiline, default: r.default,
      value: overrides[key] != null ? overrides[key] : '' });
  });
  res.json({ groups });
});
app.put('/api/pagecopy/:key', requireAuth, (req, res) => {
  if (!canManage(req.user.role, 'pages')) return res.status(403).json({ error: 'Forbidden' });
  const key = req.params.key; const value = (req.body && req.body.value) || '';
  if (value === '') db.prepare('DELETE FROM pagecopy WHERE key=?').run(key);        // empty ⇒ revert to default
  else db.prepare('INSERT INTO pagecopy(key,value,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by')
    .run(key, value, nowISO(), req.user.id);
  res.json({ ok: true });
});

/* ---------------- Section visibility (hide links for sections not yet live) ---------------- */
const SECTIONS = [
  ['programmes', 'Programmes'], ['odr', 'ODR Support'], ['reports', 'Reports & Papers'],
  ['blogs', 'Blogs'], ['podcasts', 'Podcasts'], ['events', 'Events & Labs'],
  ['donors', 'Donors & Funding Partners'], ['membership', 'Membership'], ['funding_partners_wall', 'Members logo wall'],
];
function visibilityMap() {
  const hidden = {}; db.prepare("SELECT key,value FROM settings WHERE key LIKE 'vis.%'").all()
    .forEach(r => { hidden[r.key.slice(4)] = r.value !== 'hidden'; });
  const out = {}; SECTIONS.forEach(([k]) => { out[k] = hidden[k] === undefined ? true : hidden[k]; });
  return out;
}
app.get('/api/public/visibility', (req, res) => res.json({ visible: visibilityMap() }));
app.get('/api/settings/visibility', requireAuth, (req, res) => {
  if (!canManage(req.user.role, 'pages')) return res.status(403).json({ error: 'Forbidden' });
  const vis = visibilityMap();
  res.json({ sections: SECTIONS.map(([key, label]) => ({ key, label, visible: vis[key] })) });
});
app.put('/api/settings/visibility/:key', requireAuth, (req, res) => {
  if (!canManage(req.user.role, 'pages')) return res.status(403).json({ error: 'Forbidden' });
  const key = 'vis.' + req.params.key;
  const val = req.body && req.body.visible === false ? 'hidden' : 'visible';
  db.prepare('INSERT INTO settings(key,value,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at')
    .run(key, val, nowISO(), req.user.id);
  res.json({ ok: true });
});

/* ---------------- Public read APIs (consumed by the static site) ---------------- */
app.get('/api/public/members', (req, res) => {
  const cat = req.query.category;
  let sql = `SELECT id,brand_name,legal_name,category,website,logo FROM organisations
    WHERE membership_status='Active' AND website_display_status='Paid and Live' AND logo_consent=1 AND secretariat_hidden=0`;
  const args = [];
  if (cat && cat !== 'all') { sql += ' AND category=?'; args.push(cat); }
  res.json({ members: db.prepare(sql).all(...args) });
});
app.get('/api/public/odr-providers', (req, res) => {
  const rows = db.prepare("SELECT data FROM entries WHERE collection='odr_providers' AND status='active' ORDER BY display_order").all();
  res.json({ providers: rows.map(r => JSON.parse(r.data)) });
});
app.get('/api/public/collection/:name', (req, res) => {
  const name = req.params.name;
  if (!COLLECTIONS[name]) return res.status(404).json({ error: 'Unknown' });
  const live = ['published', 'active'];
  const rows = db.prepare('SELECT id,data,status,updated_at FROM entries WHERE collection=? ORDER BY display_order,id').all(name)
    .filter(r => live.includes(r.status)).map(r => ({ id: r.id, ...JSON.parse(r.data) }));
  res.json({ items: rows });
});

/* ---------------- Public write APIs (forms) ---------------- */
app.post('/api/public/odr-apply', publicWriteLimit, upload.array('documents', 10), (req, res) => {
  const b = req.body || {};
  const docs = (req.files || []).map(f => '/uploads/' + f.filename).join(',');
  const info = db.prepare(`INSERT INTO odr_applications(applicant,enterprise,mobile,email,location,cluster,counterparty,amount,
    invoice_details,due_date,issue,action_taken,documents,consent,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(b.applicant,b.enterprise,b.mobile,b.email,b.location,b.cluster,
    b.counterparty,b.amount||null,b.invoice_details,b.due_date,b.issue,b.action_taken,docs,b.consent?1:0,nowISO());
  logEvent('odr_application', { id: info.lastInsertRowid });
  res.json({ ok: true, id: info.lastInsertRowid });
});
app.post('/api/public/membership-apply', publicWriteLimit, (req, res) => {
  const b = req.body || {};
  const info = db.prepare(`INSERT INTO organisations(legal_name,brand_name,category,industry,website,gstin_pan,address,
    logo_consent,membership_status,application_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(b.legal_name,b.brand_name,b.category,b.industry,b.website,b.gstin_pan,b.address,b.logo_consent?1:0,'Applied',
      nowISO().slice(0,10),nowISO(),nowISO());
  if (b.contact_name) db.prepare('INSERT INTO contacts(org_id,type,name,designation,email,phone,is_primary) VALUES(?,?,?,?,?,?,1)')
    .run(info.lastInsertRowid,'CEO / authorised signatory',b.contact_name,b.designation,b.email,b.phone);
  logEvent('membership_application', { id: info.lastInsertRowid });
  res.json({ ok: true });
});
app.post('/api/public/contact', publicWriteLimit, (req, res) => {
  const b = req.body || {};
  db.prepare('INSERT INTO messages(kind,name,email,org,enquiry_type,message,created_at) VALUES(?,?,?,?,?,?,?)')
    .run('contact', b.name, b.email, b.org, b.enquiry_type, b.message, nowISO());
  res.json({ ok: true });
});
app.post('/api/public/newsletter', publicWriteLimit, (req, res) => {
  try { db.prepare('INSERT OR IGNORE INTO newsletter(email,created_at) VALUES(?,?)').run(req.body.email, nowISO()); } catch (e) {}
  logEvent('newsletter_signup', { email: req.body.email });
  res.json({ ok: true });
});
function logEvent(event, meta) {
  db.prepare('INSERT INTO analytics(event,meta,created_at) VALUES(?,?,?)').run(event, JSON.stringify(meta || {}), nowISO());
}
app.post('/api/public/analytics', publicWriteLimit, (req, res) => { logEvent(req.body.event || 'event', req.body.meta); res.json({ ok: true }); });
app.get('/api/analytics/summary', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT event, COUNT(*) c FROM analytics GROUP BY event ORDER BY c DESC').all();
  res.json({ events: rows,
    newsletter: db.prepare('SELECT COUNT(*) c FROM newsletter').get().c,
    messages: db.prepare('SELECT COUNT(*) c FROM messages').get().c });
});

/* ---------------- uploads (admin) ---------------- */
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  db.prepare('INSERT INTO entries(collection,data,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?)')
    .run('media', JSON.stringify({ file: '/uploads/' + req.file.filename, filename: req.file.originalname, alt: '', caption: '', usage: '' }),
      'active', req.user.id, nowISO(), nowISO());
  res.json({ url: '/uploads/' + req.file.filename });
});

/* ---------------- static ---------------- */
app.use('/uploads', express.static(UP));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/', express.static(path.join(__dirname, '..', 'public'))); // serve the public site

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

app.listen(PORT, () => {
  console.log(`\nMSME Catalyst server running:`);
  console.log(`  Public site : http://localhost:${PORT}/`);
  console.log(`  Admin panel : http://localhost:${PORT}/admin`);
  console.log(`  Admin access is configured through secure environment variables.\n`);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message || 'Request failed' });
});
