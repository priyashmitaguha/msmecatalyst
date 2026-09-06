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
const { db, ROLES, COLLECTIONS, CONTENT_COLLECTIONS, seed, nowISO } = require('./db');
const mailer = require('./mailer');
const APP_BASE_URL = (process.env.APP_BASE_URL || '').replace(/\/$/, '');

seed(); // idempotent

const app = express();
const PORT = process.env.PORT || 4000;
const PRODUCTION = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Strict limits in production; relaxed off-production so local dev and the test suite aren't throttled.
const publicWriteLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: PRODUCTION ? 60 : 100000, standardHeaders: 'draft-7', legacyHeaders: false });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: PRODUCTION ? 10 : 100000, standardHeaders: 'draft-7', legacyHeaders: false });

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

/* ---------------- auth & permissions ---------------- */
const SESSION_MS = 1000 * 60 * 60 * 12;
function newToken() { return crypto.randomBytes(24).toString('hex'); }
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function clientIp(req) { return (req.headers['cf-connecting-ip'] || req.ip || '').toString(); }
function userPerms(u) { try { return u && u.perms ? JSON.parse(u.perms) : []; } catch (e) { return []; } }

function currentUser(req) {
  const t = req.cookies.mc_session;
  if (!t) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token=?').get(t);
  if (!s || s.expires < Date.now()) return null;
  const u = db.prepare('SELECT id,name,email,role,active,must_change,perms FROM users WHERE id=?').get(s.user_id);
  if (!u || u.active === 0) return null;                       // deactivated accounts cannot act
  u._token = t;
  return u;
}
function requireAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'Not authenticated' });
  req.user = u; next();
}
/* Permission model — enforced on every protected route (never only hidden in the UI). */
function canManage(user, collection) {
  const r = ROLES[user.role]; if (!r) return false;
  if (r.all || r.content) return true;
  if (r.editorScoped) return userPerms(user).includes(collection);
  return Array.isArray(r.collections) && r.collections.includes(collection);
}
function canPublish(user, collection) {
  const r = ROLES[user.role]; if (!r) return false;
  if (!canManage(user, collection)) return false;
  return r.all || r.content || r.publish === true;            // legacy 'editor' has no publish flag → cannot publish
}
function canCRMRead(user)  { const r = ROLES[user.role]; return !!(r && (r.all || r.crm)); }
function canCRMWrite(user) { const r = ROLES[user.role]; return !!(r && (r.all || (r.crm && r.crmWrite !== false))); }
// Page-level (page copy + publish/hide) and section-level (visibility) scoping.
// Editor perms may contain 'page:<slug>' and 'sec:<key>' entries, or the coarse
// 'pages' collection which grants all pages/sections (legacy content roles).
function canPage(user, slug) {
  const r = ROLES[user.role]; if (!r) return false;
  if (r.all || r.content) return true;
  const p = userPerms(user);
  if (p.includes('pages')) return true;
  if (r.editorScoped) return p.includes('page:' + slug);
  return Array.isArray(r.collections) && r.collections.includes('pages');
}
function canSection(user, key) {
  const r = ROLES[user.role]; if (!r) return false;
  if (r.all || r.content) return true;
  const p = userPerms(user);
  if (p.includes('pages')) return true;
  if (r.editorScoped) return p.includes('sec:' + key);
  return Array.isArray(r.collections) && r.collections.includes('pages');
}
function anyPageScope(user) {
  const r = ROLES[user.role]; if (!r) return false;
  if (r.all || r.content) return true;
  const p = userPerms(user);
  return p.includes('pages') || p.some(x => x.startsWith('page:') || x.startsWith('sec:'));
}
function pageOfKey(key) { const r = REGISTRY[key]; return r ? r.page : String(key).split('.')[0]; }
// A permission entry is valid if it names a known collection, page (page:<slug>) or section (sec:<key>).
function validPerm(p) {
  if (typeof p !== 'string') return false;
  if (COLLECTIONS[p] || p === 'pages') return true;
  if (p.startsWith('page:')) return PAGES.some(x => x[0] === p.slice(5));
  if (p.startsWith('sec:')) return SECTIONS.some(x => x[0] === p.slice(4));
  return false;
}
function canODR(user)      { const r = ROLES[user.role]; return !!(r && (r.all || r.odr)); }
function canUsers(user)    { const r = ROLES[user.role]; return !!(r && (r.all || r.users)); }
function canSettings(user) { return anyPageScope(user); }
const forbid = (res) => res.status(403).json({ error: 'Forbidden' });

/* Anti-CSRF for cookie-authenticated state changes: require same-origin. */
function sameOrigin(req) {
  const o = req.headers.origin; if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}
app.use((req, res, next) => {
  if (['POST','PUT','DELETE','PATCH'].includes(req.method) && req.path.startsWith('/api/') && !sameOrigin(req))
    return res.status(403).json({ error: 'Bad origin' });
  next();
});

/* Audit trail */
function audit(req, action, entity, entityId, detail) {
  try {
    db.prepare('INSERT INTO audit_log(actor_id,actor_email,action,entity,entity_id,detail,ip,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(req.user ? req.user.id : null, req.user ? req.user.email : null, action, entity || null,
        entityId != null ? String(entityId) : null, detail || null, clientIp(req), nowISO());
  } catch (e) { console.error('audit failed', e.message); }
}

/* Password strength — server-enforced (never trust the client). */
function passwordProblem(pw, email) {
  if (!pw || pw.length < 12) return 'Password must be at least 12 characters.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Password must include at least one letter and one number.';
  if (email && pw.toLowerCase().includes(email.split('@')[0].toLowerCase())) return 'Password must not contain your email name.';
  return null;
}
function setSession(res, req, userId) {
  const token = newToken();
  db.prepare('INSERT INTO sessions(token,user_id,expires,created_at) VALUES(?,?,?,?)').run(token, userId, Date.now() + SESSION_MS, nowISO());
  res.cookie('mc_session', token, { httpOnly: true, secure: PRODUCTION, sameSite: 'lax', maxAge: SESSION_MS });
  return token;
}

app.post('/api/auth/login', loginLimit, (req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE email=?').get((email || '').toLowerCase().trim());
  if (!u || u.active === 0 || !u.password_hash || !bcrypt.compareSync(password || '', u.password_hash)) {
    audit({ user: null, headers: req.headers, ip: req.ip }, 'login_failed', 'user', null, (email || '').slice(0, 120));
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  setSession(res, req, u.id);
  req.user = u; audit(req, 'login', 'user', u.id, null);
  res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role, must_change: u.must_change } });
});
app.post('/api/auth/logout', (req, res) => {
  const u = currentUser(req);
  if (req.cookies.mc_session) db.prepare('DELETE FROM sessions WHERE token=?').run(req.cookies.mc_session);
  if (u) { req.user = u; audit(req, 'logout', 'user', u.id, null); }
  res.clearCookie('mc_session'); res.json({ ok: true });
});
app.get('/api/auth/me', requireAuth, (req, res) => {
  const r = ROLES[req.user.role] || {};
  res.json({
    user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, must_change: req.user.must_change, perms: userPerms(req.user) },
    role: { key: req.user.role, ...r }, collections: COLLECTIONS, roles: ROLES,
    caps: { crmRead: canCRMRead(req.user), crmWrite: canCRMWrite(req.user), users: canUsers(req.user), odr: canODR(req.user), settings: canSettings(req.user) },
  });
});

/* -------- Account & Security: change password -------- */
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { current, next: nextPw, confirm } = req.body || {};
  const full = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!full || !bcrypt.compareSync(current || '', full.password_hash))
    return res.status(400).json({ error: 'Your current password is incorrect.' });
  if (nextPw !== confirm) return res.status(400).json({ error: 'New password and confirmation do not match.' });
  const problem = passwordProblem(nextPw, full.email);
  if (problem) return res.status(400).json({ error: problem });
  db.prepare('UPDATE users SET password_hash=?, must_change=0, updated_at=? WHERE id=?').run(bcrypt.hashSync(nextPw, 12), nowISO(), full.id);
  // Revoke all OTHER sessions; keep the current one.
  db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(full.id, req.user._token);
  audit(req, 'password_changed', 'user', full.id, null);
  res.json({ ok: true });
});

/* -------- Account & Security: forgot / reset (single-use, expiring link) -------- */
app.post('/api/auth/forgot', loginLimit, async (req, res) => {
  const email = (req.body && req.body.email || '').toLowerCase().trim();
  const u = email ? db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email) : null;
  let devToken = null;
  if (u) {
    const raw = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 60;              // 1 hour
    db.prepare('INSERT INTO password_resets(user_id,token_hash,expires,used,created_at,ip) VALUES(?,?,?,0,?,?)')
      .run(u.id, sha256(raw), expires, nowISO(), clientIp(req));
    const base = APP_BASE_URL || `${req.protocol}://${req.headers.host}`;
    const link = `${base}/admin/reset.html?token=${raw}`;
    const text = `A password reset was requested for your MSME Catalyst admin account.\n\nReset your password (valid 1 hour, one-time use):\n${link}\n\nIf you did not request this, you can ignore this email — your password will not change.`;
    const sent = await mailer.sendMail({ to: u.email, subject: 'Reset your MSME Catalyst admin password', text });
    if (!sent.ok) {
      // No email service configured (or send failed): record in the outbox so an operator can act.
      db.prepare('INSERT INTO emails(to_addr,subject,body,template,created_at) VALUES(?,?,?,?,?)')
        .run(u.email, 'Password reset link (email not sent — SMTP not configured)', text, 'password_reset', nowISO());
    }
    audit({ user: u, headers: req.headers, ip: req.ip, cookies: {} }, 'password_reset_requested', 'user', u.id, sent.ok ? 'emailed' : 'outbox');
    if (process.env.ALLOW_TEST_HOOKS === '1') devToken = raw;   // test-only; never enabled in production
  }
  // Always the same response — never reveal whether an account exists.
  res.json({ ok: true, message: 'If that email is registered, a reset link has been sent.', ...(devToken ? { devToken } : {}) });
});
app.post('/api/auth/reset', loginLimit, (req, res) => {
  const { token, password, confirm } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing reset token.' });
  const row = db.prepare('SELECT * FROM password_resets WHERE token_hash=?').get(sha256(token));
  if (!row || row.used || row.expires < Date.now()) return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
  const u = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(row.user_id);
  if (!u) return res.status(400).json({ error: 'Account not found.' });
  if (password !== confirm) return res.status(400).json({ error: 'Password and confirmation do not match.' });
  const problem = passwordProblem(password, u.email);
  if (problem) return res.status(400).json({ error: problem });
  db.prepare('UPDATE users SET password_hash=?, must_change=0, updated_at=? WHERE id=?').run(bcrypt.hashSync(password, 12), nowISO(), u.id);
  db.prepare('UPDATE password_resets SET used=1 WHERE id=?').run(row.id);
  db.prepare('DELETE FROM password_resets WHERE user_id=? AND used=0').run(u.id);   // invalidate other outstanding links
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);                     // log out ALL active sessions
  audit({ user: u, headers: req.headers, ip: req.ip, cookies: {} }, 'password_reset_completed', 'user', u.id, null);
  res.json({ ok: true });
});

/* -------- Super Admin: manage admin users -------- */
app.get('/api/users', requireAuth, (req, res) => {
  if (!canUsers(req.user)) return forbid(res);
  const users = db.prepare('SELECT id,name,email,role,active,must_change,perms,created_at FROM users ORDER BY id').all()
    .map(u => ({ ...u, perms: userPerms(u) }));
  res.json({ users, roles: ROLES, collections: Object.keys(COLLECTIONS),
    pages: PAGES.map(([slug, label]) => ({ slug, label })),
    sections: SECTIONS.map(([key, label]) => ({ key, label })) });
});
app.post('/api/users', requireAuth, (req, res) => {
  if (!canUsers(req.user)) return forbid(res);
  const b = req.body || {};
  const email = (b.email || '').toLowerCase().trim();
  if (!email || !ROLES[b.role]) return res.status(400).json({ error: 'A valid email and role are required.' });
  const problem = passwordProblem(b.password, email);
  if (problem) return res.status(400).json({ error: problem });
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return res.status(409).json({ error: 'A user with that email already exists.' });
  const perms = Array.isArray(b.perms) ? JSON.stringify(b.perms.filter(validPerm)) : null;
  const info = db.prepare('INSERT INTO users(name,email,password_hash,role,perms,active,must_change,created_by,created_at,updated_at) VALUES(?,?,?,?,?,1,1,?,?,?)')
    .run(b.name || email, email, bcrypt.hashSync(b.password, 12), b.role, perms, req.user.id, nowISO(), nowISO());
  audit(req, 'user_created', 'user', info.lastInsertRowid, `${email} (${b.role})`);
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/users/:id', requireAuth, (req, res) => {
  if (!canUsers(req.user)) return forbid(res);
  const cur = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Not found' });
  const b = req.body || {};
  const name = b.name ?? cur.name;
  const role = ROLES[b.role] ? b.role : cur.role;
  const perms = Array.isArray(b.perms) ? JSON.stringify(b.perms.filter(validPerm)) : cur.perms;
  let active = cur.active;
  if (typeof b.active === 'boolean') {
    if (Number(req.params.id) === req.user.id && b.active === false) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    active = b.active ? 1 : 0;
  }
  if (b.password) {
    const problem = passwordProblem(b.password, cur.email);
    if (problem) return res.status(400).json({ error: problem });
    db.prepare('UPDATE users SET name=?,role=?,perms=?,active=?,password_hash=?,must_change=1,updated_at=? WHERE id=?')
      .run(name, role, perms, active, bcrypt.hashSync(b.password, 12), nowISO(), cur.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(cur.id);               // password reset by admin logs them out
    audit(req, 'user_password_reset', 'user', cur.id, cur.email);
  } else {
    db.prepare('UPDATE users SET name=?,role=?,perms=?,active=?,updated_at=? WHERE id=?').run(name, role, perms, active, nowISO(), cur.id);
    if (active === 0) db.prepare('DELETE FROM sessions WHERE user_id=?').run(cur.id);  // deactivation ends their sessions
  }
  audit(req, active === 0 ? 'user_deactivated' : 'user_updated', 'user', cur.id, `${cur.email} (${role})`);
  res.json({ ok: true });
});
app.delete('/api/users/:id', requireAuth, (req, res) => {
  if (!canUsers(req.user)) return forbid(res);
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  const cur = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Not found' });
  const supers = db.prepare("SELECT COUNT(*) c FROM users WHERE role='super_admin' AND active=1").get().c;
  if (cur.role === 'super_admin' && supers <= 1) return res.status(400).json({ error: 'Cannot delete the last active Super Admin.' });
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(cur.id);
  db.prepare('DELETE FROM users WHERE id=?').run(cur.id);
  audit(req, 'user_deleted', 'user', cur.id, cur.email);
  res.json({ ok: true });
});

/* Audit log (Super Admin / content admins) */
app.get('/api/audit', requireAuth, (req, res) => {
  if (!(canUsers(req.user) || ROLES[req.user.role]?.content)) return forbid(res);
  const rows = db.prepare('SELECT id,actor_email,action,entity,entity_id,detail,created_at FROM audit_log ORDER BY id DESC LIMIT 200').all();
  res.json({ audit: rows });
});

/* ---------------- generic CMS entries ---------------- */
app.get('/api/collections/:name', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!COLLECTIONS[name]) return res.status(404).json({ error: 'Unknown collection' });
  if (!canManage(req.user, name)) return res.status(403).json({ error: 'Forbidden' });
  const rows = db.prepare('SELECT * FROM entries WHERE collection=? ORDER BY display_order, id').all(name)
    .map(r => ({ ...r, data: JSON.parse(r.data) }));
  res.json({ collection: name, def: COLLECTIONS[name], items: rows });
});
app.post('/api/collections/:name', requireAuth, (req, res) => {
  const { name } = req.params;
  if (!COLLECTIONS[name] || !canManage(req.user, name)) return res.status(403).json({ error: 'Forbidden' });
  const { data = {}, status = 'draft', display_order = 0 } = req.body || {};
  const info = db.prepare('INSERT INTO entries(collection,data,status,display_order,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
    .run(name, JSON.stringify(data), status, display_order, req.user.id, nowISO(), nowISO());
  audit(req,'entry_created',name,info.lastInsertRowid,'status:'+status);
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/collections/:name/:id', requireAuth, (req, res) => {
  const { name, id } = req.params;
  if (!COLLECTIONS[name] || !canManage(req.user, name)) return res.status(403).json({ error: 'Forbidden' });
  const cur = db.prepare('SELECT * FROM entries WHERE id=? AND collection=?').get(id, name);
  if (!cur) return res.status(404).json({ error: 'Not found' });
  let status = req.body.status ?? cur.status;
  // Editors cannot publish
  if (['published', 'active'].includes(status) && !canPublish(req.user, name))
    return res.status(403).json({ error: 'Your role cannot publish. Save as review/draft instead.' });
  db.prepare('INSERT INTO entry_versions(entry_id,data,status,saved_at,saved_by) VALUES(?,?,?,?,?)')
    .run(cur.id, cur.data, cur.status, nowISO(), req.user.id); // version history
  const data = req.body.data ? JSON.stringify(req.body.data) : cur.data;
  const display_order = req.body.display_order ?? cur.display_order;
  db.prepare('UPDATE entries SET data=?,status=?,display_order=?,updated_at=? WHERE id=?')
    .run(data, status, display_order, nowISO(), cur.id);
  const act = status===cur.status ? 'entry_updated' : (['published','active'].includes(status)?'entry_published':(['hidden','archived','draft','review'].includes(status)?'entry_unpublished':'entry_updated'));
  audit(req, act, name, cur.id, status!==cur.status?('status:'+cur.status+'\u2192'+status):null);
  res.json({ ok: true });
});
app.delete('/api/collections/:name/:id', requireAuth, (req, res) => {
  const { name, id } = req.params;
  if (!COLLECTIONS[name] || !canManage(req.user, name)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM entries WHERE id=? AND collection=?').run(id, name);
  audit(req,'entry_deleted',name,id,null);
  res.json({ ok: true });
});
app.get('/api/collections/:name/:id/versions', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id,status,saved_at FROM entry_versions WHERE entry_id=? ORDER BY id DESC').all(req.params.id);
  res.json({ versions: rows });
});

/* ---------------- Membership CRM ---------------- */
app.get('/api/crm/organisations', requireAuth, (req, res) => {
  if (!canCRMRead(req.user)) return forbid(res);
  const orgs = db.prepare('SELECT * FROM organisations ORDER BY id DESC').all();
  const contacts = db.prepare('SELECT * FROM contacts').all();
  orgs.forEach(o => o.contacts = contacts.filter(c => c.org_id === o.id));
  res.json({ organisations: orgs });
});
app.post('/api/crm/organisations', requireAuth, (req, res) => {
  if (!canCRMWrite(req.user)) return forbid(res);
  const b = req.body || {};
  const cols = ['legal_name','brand_name','category','industry','website','address','gstin_pan','logo','logo_consent',
    'website_display_status','membership_status','fee','notes'];
  const vals = cols.map(c => b[c] ?? null);
  const info = db.prepare(`INSERT INTO organisations(${cols.join(',')},application_date,created_at,updated_at)
    VALUES(${cols.map(()=>'?').join(',')},?,?,?)`).run(...vals, b.application_date || nowISO().slice(0,10), nowISO(), nowISO());
  audit(req,'org_created','organisation',info.lastInsertRowid,b.legal_name||b.brand_name||'');
  res.json({ id: info.lastInsertRowid });
});
app.put('/api/crm/organisations/:id', requireAuth, (req, res) => {
  if (!canCRMWrite(req.user)) return forbid(res);
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
  audit(req,'org_updated','organisation',cur.id,merged.legal_name||merged.brand_name||'');
  res.json({ ok: true, organisation: merged });
});
app.post('/api/crm/organisations/:id/contacts', requireAuth, (req, res) => {
  if (!canCRMWrite(req.user)) return forbid(res);
  const b = req.body || {};
  if (b.is_primary) db.prepare('UPDATE contacts SET is_primary=0 WHERE org_id=?').run(req.params.id);
  const info = db.prepare('INSERT INTO contacts(org_id,type,name,designation,email,phone,is_primary) VALUES(?,?,?,?,?,?,?)')
    .run(req.params.id, b.type, b.name, b.designation, b.email, b.phone, b.is_primary ? 1 : 0);
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/crm/contacts/:id', requireAuth, (req, res) => {
  if (!canCRMWrite(req.user)) return forbid(res);
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
  if (!canCRMRead(req.user)) return forbid(res);
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
  if (!anyPageScope(req.user)) return res.status(403).json({ error: 'Forbidden' });
  const overrides = {}; db.prepare('SELECT key,value FROM pagecopy').all().forEach(r => overrides[r.key] = r.value);
  const groups = {};
  Object.keys(REGISTRY).sort().forEach(key => {
    const r = REGISTRY[key];
    if (!canPage(req.user, r.page)) return;                 // only pages this user may edit
    (groups[r.page] = groups[r.page] || []).push({
      key, label: r.label, multiline: !!r.multiline, default: r.default,
      value: overrides[key] != null ? overrides[key] : '' });
  });
  res.json({ groups });
});
app.put('/api/pagecopy/:key', requireAuth, (req, res) => {
  const key = req.params.key;
  if (!REGISTRY[key]) return res.status(404).json({ error: 'Unknown content key' });
  if (!canPage(req.user, pageOfKey(key))) return res.status(403).json({ error: 'Forbidden' });
  const value = (req.body && req.body.value) || '';
  if (value === '') db.prepare('DELETE FROM pagecopy WHERE key=?').run(key);        // empty ⇒ revert to default
  else db.prepare('INSERT INTO pagecopy(key,value,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by')
    .run(key, value, nowISO(), req.user.id);
  audit(req, value===''?'pagecopy_reset':'pagecopy_set','pagecopy',key,null);
  res.json({ ok: true });
});

/* ---------------- Section visibility (hide links for sections not yet live) ---------------- */
const SECTIONS = [
  ['council', 'Governing Council (About)'], ['advisory', 'Advisory Body (About)'], ['secretariat', 'Secretariat (About)'],
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
  if (!anyPageScope(req.user)) return res.status(403).json({ error: 'Forbidden' });
  const vis = visibilityMap();
  res.json({ sections: SECTIONS.filter(([key]) => canSection(req.user, key)).map(([key, label]) => ({ key, label, visible: vis[key] })) });
});
app.put('/api/settings/visibility/:key', requireAuth, (req, res) => {
  if (!SECTIONS.find(s => s[0] === req.params.key)) return res.status(404).json({ error: 'Unknown section' });
  if (!canSection(req.user, req.params.key)) return res.status(403).json({ error: 'Forbidden' });
  const key = 'vis.' + req.params.key;
  const val = req.body && req.body.visible === false ? 'hidden' : 'visible';
  db.prepare('INSERT INTO settings(key,value,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at')
    .run(key, val, nowISO(), req.user.id);
  audit(req,'section_'+val,'visibility',req.params.key,null);
  res.json({ ok: true });
});

/* ---------------- Page-level publish / hide (server-enforced) ---------------- */
const PAGES = [
  ['index','Home'], ['about','About Us'], ['approach','Our Approach'], ['programmes','Programmes'],
  ['membership','Membership'], ['odr-support','ODR Support'], ['knowledge','Knowledge Hub'],
  ['reports','Reports & Papers'], ['blogs','Blogs'], ['podcasts','Podcasts'], ['events','Events & Labs'],
  ['contact','Contact'], ['privacy','Privacy'], ['terms','Terms'],
  // ODR micro-site pages (served under /odr/). Each is independently publishable/hideable.
  ['odr-index','ODR · Home'], ['odr-about','ODR · About the Programme'], ['odr-how-it-works','ODR · How It Works'],
  ['odr-choose-provider','ODR · Choose a Provider'], ['odr-apply','ODR · Apply'], ['odr-resources','ODR · Resources'],
  ['odr-papers','ODR · Papers'], ['odr-podcasts','ODR · Podcasts'], ['odr-blogs','ODR · Blogs'], ['odr-contact','ODR · Contact'],
];
// Map a request path to its page slug — the SAME rule the public site uses (main.js slugFromPath).
function slugForPath(p) {
  p = (p || '').replace(/\/+$/, '');
  if (p === '') return 'index';
  let m = p.match(/^\/odr(?:\/([a-z0-9\-]+?)(?:\.html)?)?$/i);
  if (m) return 'odr-' + (m[1] ? m[1].toLowerCase() : 'index');
  m = p.match(/^\/([a-z0-9\-]+?)(?:\.html)?$/i);
  if (m) return m[1].toLowerCase();
  return null;
}
function pageState() { const h = {}; db.prepare("SELECT key,value FROM settings WHERE key LIKE 'page.%'").all().forEach(r => h[r.key.slice(5)] = r.value); return h; }
function pageHidden(slug) { return pageState()[slug] === 'hidden'; }
app.get('/api/settings/pages', requireAuth, (req, res) => {
  if (!anyPageScope(req.user)) return forbid(res);
  const st = pageState();
  res.json({ pages: PAGES.filter(([slug]) => canPage(req.user, slug)).map(([slug, label]) => ({ slug, label, published: st[slug] !== 'hidden' })) });
});
app.put('/api/settings/pages/:slug', requireAuth, (req, res) => {
  const slug = req.params.slug;
  if (!PAGES.find(p => p[0] === slug)) return res.status(404).json({ error: 'Unknown page' });
  if (!canPage(req.user, slug)) return forbid(res);
  const val = req.body && req.body.published === false ? 'hidden' : 'published';
  db.prepare('INSERT INTO settings(key,value,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at')
    .run('page.' + slug, val, nowISO(), req.user.id);
  audit(req, 'page_' + val, 'page', slug, null);
  res.json({ ok: true });
});
// Public: which pages are hidden, so the site can drop nav links / buttons / text links to them.
app.get('/api/public/pages', (req, res) => { const st = pageState(); res.json({ hidden: PAGES.filter(([s]) => st[s] === 'hidden').map(([s]) => s) }); });

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
  if (!ROLES[req.user.role]?.all) return forbid(res);       // analytics: Super Admin only
  const rows = db.prepare('SELECT event, COUNT(*) c FROM analytics GROUP BY event ORDER BY c DESC').all();
  res.json({ events: rows,
    newsletter: db.prepare('SELECT COUNT(*) c FROM newsletter').get().c,
    messages: db.prepare('SELECT COUNT(*) c FROM messages').get().c });
});

/* ---------------- uploads (admin) ---------------- */
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!canManage(req.user, 'media')) return forbid(res);
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const info = db.prepare('INSERT INTO entries(collection,data,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?)')
    .run('media', JSON.stringify({ file: '/uploads/' + req.file.filename, filename: req.file.originalname, alt: '', caption: '', usage: '', size: req.file.size, mime: req.file.mimetype }),
      'active', req.user.id, nowISO(), nowISO());
  audit(req, 'media_uploaded', 'media', info.lastInsertRowid, req.file.originalname);
  res.json({ url: '/uploads/' + req.file.filename, id: info.lastInsertRowid });
});

/* ---------------- static ---------------- */
app.use('/uploads', express.static(UP));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Server-side enforcement: a hidden page returns 404 even via a direct URL.
// (ODR pages are NOT exempt — each /odr/* page can be hidden individually.)
app.get(/.*/, (req, res, next) => {
  const p = req.path;
  if (p.startsWith('/api') || p.startsWith('/assets') || p.startsWith('/admin') || p.startsWith('/uploads')) return next();
  const slug = slugForPath(p);
  if (slug && pageHidden(slug)) {
    return res.status(404).type('html').send('<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Page not found</title><body style="font-family:system-ui,Segoe UI,Arial;max-width:640px;margin:14vh auto;padding:0 24px;text-align:center;color:#17211b"><h1 style="font-size:2rem;margin:0 0 8px">404 — Page not found</h1><p style="color:#5f6a62">This page is not currently available.</p><p><a href="/" style="color:#1b7a3c">Return to the homepage</a></p></body>');
  }
  next();
});

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
