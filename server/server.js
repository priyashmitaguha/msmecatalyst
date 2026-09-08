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
const { cleanHtml, safeUrl, stripText, cleanByKind } = require('./sanitize');
const { normEmail, normPhone, phoneComparable, orgDomain } = require('./normalize');
const APP_BASE_URL = (process.env.APP_BASE_URL || '').replace(/\/$/, '');

seed(); // idempotent

const app = express();
const PORT = process.env.PORT || 4000;
const PRODUCTION = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
app.disable('x-powered-by');
// Restrictive Content Security Policy, compatible with the app:
// - scripts, styles, images, fonts, connections, workers all restricted to 'self'
//   (plus Google Fonts, and blob:/data: for the on-device OCR worker/images);
// - NO third-party script origins — the OCR runtime is self-hosted under /vendor;
// - 'unsafe-inline' is retained for the few inline <script>/<style> the static
//   pages use (stored-XSS is separately blocked by server-side sanitisation).
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"],
      'worker-src': ["'self'", 'blob:'],
      'child-src': ["'self'", 'blob:'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'", 'blob:'],
      'object-src': ["'none'"],
      'frame-ancestors': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': null,   // don't force https on localhost / the test harness
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Self-hosted Tesseract OCR assets (runtime + worker + wasm core + language model),
// all pinned via package.json and served same-origin — no third-party/CDN at runtime.
try {
  const tjs = path.dirname(require.resolve('tesseract.js/package.json'));
  const tcore = path.dirname(require.resolve('tesseract.js-core/package.json'));
  const tlang = path.dirname(require.resolve('@tesseract.js-data/eng/package.json'));
  app.use('/vendor/tesseract/js', express.static(path.join(tjs, 'dist'), { immutable: true, maxAge: '7d' }));
  app.use('/vendor/tesseract/core', express.static(tcore, { immutable: true, maxAge: '7d' }));
  app.use('/vendor/tesseract/lang', express.static(path.join(tlang, '4.0.0'), { immutable: true, maxAge: '7d' }));
} catch (e) { console.warn('OCR assets not resolved — run npm install:', e.message); }

// Strict limits in production; relaxed off-production so local dev and the test suite aren't throttled.
const publicWriteLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: PRODUCTION ? 60 : 100000, standardHeaders: 'draft-7', legacyHeaders: false });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: PRODUCTION ? 10 : 100000, standardHeaders: 'draft-7', legacyHeaders: false });
const scanLimit = rateLimit({ windowMs: 60 * 1000, limit: PRODUCTION ? 40 : 100000, standardHeaders: 'draft-7', legacyHeaders: false });

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
function isScanner(user)   { return !!(user && ROLES[user.role] && ROLES[user.role].scanner); }
// Who may submit a captured card: the Event Scanners, plus CRM-writers/Super Admin.
function canScan(user)     { return isScanner(user) || canCRMWrite(user); }
const forbid = (res) => res.status(403).json({ error: 'Forbidden' });

/* Robust CSRF defence for cookie-authenticated, state-changing API requests:
   strict verified same-origin using the Origin header (falling back to Referer).
   - Foreign or malformed origins are rejected.
   - A MISSING Origin AND Referer is rejected for any request that carries the
     session cookie (never silently accepted for an authenticated mutation).
   - Only req.headers.host (what the trusted proxy forwards) and an explicitly
     configured APP_BASE_URL are accepted — arbitrary X-Forwarded-* is not trusted.
   - Public (unauthenticated) POSTs and the pre-cookie login flow are unaffected. */
function allowedHosts(req) {
  const set = new Set();
  if (req.headers.host) set.add(String(req.headers.host).toLowerCase());
  if (APP_BASE_URL) { try { set.add(new URL(APP_BASE_URL).host.toLowerCase()); } catch (e) {} }
  return set;
}
function hostOf(url) { try { return new URL(url).host.toLowerCase(); } catch (e) { return null; } }
function csrfOk(req) {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return true;
  const hosts = allowedHosts(req);
  const origin = req.headers.origin;
  if (origin !== undefined) {                       // Origin present → must match exactly
    if (origin === 'null' || origin === '') return false;
    const oh = hostOf(origin);
    return !!oh && hosts.has(oh);
  }
  const ref = req.headers.referer || req.headers.referrer;   // no Origin → try Referer
  if (ref) { const rh = hostOf(ref); return !!rh && hosts.has(rh); }
  // Neither Origin nor Referer. Reject for cookie-authenticated requests.
  if (req.cookies && req.cookies.mc_session) return false;
  return true;                                      // unauthenticated (public form / pre-login)
}
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && !csrfOk(req)) return res.status(403).json({ error: 'Bad origin' });
  next();
});

/* Event Scanner lockdown — enforced server-side for EVERY /api request.
   A scanner may reach ONLY its own auth, the capture form config and card submit.
   Any other API path (dashboard, CRM, users, analytics, audit, CMS, settings …)
   returns 403, so a hand-entered URL or direct API call cannot leak data. */
const SCANNER_ALLOW = [
  /^\/api\/health$/, /^\/api\/auth\/(me|logout|login|change-password)$/,
  /^\/api\/scan\/(config|card)$/,
];
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  const u = currentUser(req);
  if (u && isScanner(u) && !SCANNER_ALLOW.some(re => re.test(req.path)))
    return res.status(403).json({ error: 'Forbidden' });
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
    caps: { crmRead: canCRMRead(req.user), crmWrite: canCRMWrite(req.user), users: canUsers(req.user), odr: canODR(req.user), settings: canSettings(req.user), scanner: isScanner(req.user), scan: canScan(req.user) },
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

/* Sanitise a collection entry's data by its field types before storing:
   url/file → validated URL (reject dangerous); richtext + embed → allowlist HTML.
   Other text is stored as-is and HTML-escaped on output by the public renderers. */
function sanitizeCollectionData(name, data) {
  const def = COLLECTIONS[name];
  if (!def || !data || typeof data !== 'object') return { data };
  const out = { ...data };
  for (const [k, , type] of def.fields) {
    if (out[k] == null || out[k] === '') continue;
    if (type === 'url') {
      const u = safeUrl(out[k], { schemes: ['http', 'https', 'mailto', 'tel'] });
      if (u === null) return { error: `“${k}” is not a valid or safe URL.` };
      out[k] = u;
    } else if (type === 'file') {
      const u = safeUrl(out[k], { schemes: ['http', 'https'] });
      if (u === null) return { error: `“${k}” is not a valid or safe URL.` };
      out[k] = u;
    } else if (type === 'richtext' || k === 'embed') {
      out[k] = cleanHtml(out[k]);
    }
  }
  return { data: out };
}

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
  const s = sanitizeCollectionData(name, data);
  if (s.error) return res.status(400).json({ error: s.error });
  const info = db.prepare('INSERT INTO entries(collection,data,status,display_order,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
    .run(name, JSON.stringify(s.data), status, display_order, req.user.id, nowISO(), nowISO());
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
  let data = cur.data;
  if (req.body.data) {
    const s = sanitizeCollectionData(name, req.body.data);
    if (s.error) return res.status(400).json({ error: s.error });
    data = JSON.stringify(s.data);
  }
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
// Validate the CRM URL/image fields (website link, member logo) on write.
function crmUrlCheck(obj) {
  if ('website' in obj && obj.website) { const u = safeUrl(obj.website, { schemes: ['http','https','mailto','tel'] }); if (u === null) return 'The website is not a valid or safe URL.'; obj.website = u; }
  if ('logo' in obj && obj.logo) { const u = safeUrl(obj.logo, { schemes: ['http','https'] }); if (u === null) return 'The logo is not a valid or safe URL.'; obj.logo = u; }
  return null;
}
app.post('/api/crm/organisations', requireAuth, (req, res) => {
  if (!canCRMWrite(req.user)) return forbid(res);
  const b = req.body || {};
  const urlErr = crmUrlCheck(b); if (urlErr) return res.status(400).json({ error: urlErr });
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
  const urlErr = crmUrlCheck(merged); if (urlErr) return res.status(400).json({ error: urlErr });
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
  // Tell the client which overridden fields are multiline, so paragraph breaks are
  // preserved as semantic <p> elements when rendered.
  const multiline = Object.keys(copy).filter(k => REGISTRY[k] && REGISTRY[k].multiline);
  res.json({ copy, multiline });
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
  const raw = (req.body && req.body.value) || '';
  // Sanitise on the way in, by the field's declared kind. URL fields that fail
  // validation are rejected outright; HTML is allowlist-cleaned; text is stripped.
  let value = cleanByKind(REGISTRY[key].kind || 'html', raw);
  if (value === null) return res.status(400).json({ error: 'That link is not a valid or safe URL.' });
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
  // Blogs/Podcasts/Papers are NOT separate ODR libraries — they live in the shared
  // Knowledge Hub (main-site blogs/podcasts/reports), so no odr-blogs/-papers/-podcasts.
  ['odr-index','ODR · Home'], ['odr-about','ODR · About the Programme'], ['odr-how-it-works','ODR · How It Works'],
  ['odr-choose-provider','ODR · Choose a Provider'], ['odr-apply','ODR · Apply'], ['odr-resources','ODR · Resources'],
  ['odr-contact','ODR · Contact'],
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

/* ==================== Event card scanner (reusable for any event) ==================== */
// A permanent, always-available source so the scanner is never tied to one event.
const PERMANENT_EVENT = 'General Meeting';
const SCAN_DEFAULTS = {
  // event sources are {name, active}. Historical scans keep their own string label,
  // so deactivating a source never detaches past scans.
  event_sources: [{ name: PERMANENT_EVENT, active: true }, { name: 'GFF 2026', active: true }],
  email_subject: 'Thank you for meeting MSME Catalyst at {{event}}',
  email_body: 'Dear {{first_name}},\n\nThank you for connecting with {{rep}} of MSME Catalyst at {{event}}. It was a pleasure to meet you. We would be glad to stay in touch and explore how MSME Catalyst can be useful to you and your organisation.\n\nWe will follow up shortly. In the meantime, feel free to reply to this email with anything you would like to discuss.',
  email_from_name: 'MSME Catalyst',
  email_signature: 'Warm regards,\nMSME Catalyst\nDigital Growth Infrastructure Foundation (Section 8)',
  representatives: [],
};
function scanSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get('scan.' + key);
  if (!row) return SCAN_DEFAULTS[key];
  try { return JSON.parse(row.value); } catch (e) { return row.value; }
}
// Normalise stored sources to {name, active}; migrate old string arrays; ensure the
// permanent "General Meeting" source is always present and active.
function eventSources() {
  let raw = scanSetting('event_sources');
  if (!Array.isArray(raw)) raw = SCAN_DEFAULTS.event_sources;
  const out = [];
  const seen = new Set();
  for (const s of raw) {
    const name = (typeof s === 'string' ? s : (s && s.name) || '').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, active: typeof s === 'object' && s ? s.active !== false : true });
  }
  if (!seen.has(PERMANENT_EVENT.toLowerCase())) out.unshift({ name: PERMANENT_EVENT, active: true });
  else out.forEach(s => { if (s.name.toLowerCase() === PERMANENT_EVENT.toLowerCase()) s.active = true; });
  return out;
}
function activeEventNames() { return eventSources().filter(s => s.active).map(s => s.name); }
function scanConfig() {
  const active = activeEventNames();
  return {
    event_sources: eventSources(),
    active_events: active,
    default_event: active[0] || PERMANENT_EVENT,
    email_subject: scanSetting('email_subject'), email_body: scanSetting('email_body'),
    email_from_name: scanSetting('email_from_name'), email_signature: scanSetting('email_signature'),
    representatives: scanSetting('representatives') || [],
    email_configured: mailer.isConfigured(),
  };
}
function personalise(tmpl, vars) {
  return String(tmpl || '').replace(/\{\{\s*(first_name|event|rep|from_name)\s*\}\}/g, (_, k) => vars[k] != null ? vars[k] : '');
}
const validEmail = e => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
const validPhone = p => !p || /^[+0-9()\-.\s]{6,24}$/.test(String(p).trim());   // international-friendly
const scanMsg = s => ({
  sent: 'Saved and thank-you email sent.',
  queued: 'Saved; thank-you email queued — not yet sent.',
  failed: 'Saved; thank-you email failed and is available for retry.',
  skipped_duplicate: 'Saved; a thank-you already exists for this contact at this event.',
  skipped: 'Saved without a thank-you email (consent not provided).',
}[s] || 'Saved to CRM.');

/* Thank-you email idempotency key: at most one record per recipient (or contact)
   per event. A durable UNIQUE index on this key enforces it even under concurrency. */
function thankyouIdemKey(event, emailNorm, contactId) {
  return 'thankyou|' + String(event) + '|' + (emailNorm || ('c' + contactId));
}
// Recover an email abandoned mid-send (a process died after claiming it) back to
// 'queued' so it can be retried. Staleness is judged ONLY by sending_started_at —
// the moment the row was claimed — never by created_at. A row claimed just now has
// a recent sending_started_at and is left alone even if it was created long ago, so
// a concurrent request can never reset-and-reclaim an in-flight send. A 'sending'
// row with a missing claim time is a pre-migration leftover and is safe to recover.
function recoverStaleSending(maxAgeMs = 5 * 60 * 1000) {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  db.prepare("UPDATE emails SET status='queued', sending_started_at=NULL WHERE status='sending' AND sent_at IS NULL AND (sending_started_at IS NULL OR sending_started_at < ?)").run(cutoff);
}
let TEST_SMTP_CALLS = 0;   // test-only counter (see /api/test/* hooks, gated by ALLOW_TEST_HOOKS)
/* Atomically claim a sendable email (queued/failed → sending, stamping
   sending_started_at) then send and settle to sent/failed/queued, clearing
   sending_started_at. Only ONE caller can win the claim, so concurrent card
   submits or concurrent retries can never send the same message twice. */
async function sendClaimed(emailId, testMode) {
  const claimed = db.prepare("UPDATE emails SET status='sending', sending_started_at=?, attempts=attempts+1 WHERE id=? AND status IN ('queued','failed')")
    .run(nowISO(), emailId).changes === 1;
  if (!claimed) { const r = db.prepare('SELECT status FROM emails WHERE id=?').get(emailId); return { claimed: false, status: r ? r.status : 'unknown' }; }
  const e = db.prepare('SELECT * FROM emails WHERE id=?').get(emailId);
  if (process.env.ALLOW_TEST_HOOKS === '1') TEST_SMTP_CALLS++;               // count real send attempts in tests
  let sent;
  if (testMode) {
    if (testMode === 'sent-slow') { await new Promise(r => setTimeout(r, 80)); sent = { ok: true, configured: true }; }
    else sent = { ok: testMode === 'sent', configured: true, error: testMode === 'fail' ? 'simulated failure' : undefined };
  } else sent = await mailer.sendMail({ to: e.to_addr, subject: e.subject, text: e.body });
  let status;
  if (sent.ok) { status = 'sent'; db.prepare('UPDATE emails SET status=?,sent_at=?,last_error=NULL,sending_started_at=NULL WHERE id=?').run(status, nowISO(), emailId); }
  else if (sent.configured) { status = 'failed'; db.prepare('UPDATE emails SET status=?,last_error=?,sending_started_at=NULL WHERE id=?').run(status, String(sent.error || 'send failed').slice(0, 300), emailId); }
  else { status = 'queued'; db.prepare('UPDATE emails SET status=?,last_error=?,sending_started_at=NULL WHERE id=?').run(status, 'SMTP not configured', emailId); }
  return { claimed: true, status };
}

// Config for the capture form (scanner + admin). Only ACTIVE event sources and
// the (validated) representative list are exposed to the capture UI.
app.get('/api/scan/config', requireAuth, (req, res) => {
  if (!canScan(req.user)) return forbid(res);
  const c = scanConfig();
  res.json({ event_sources: c.active_events, default_event: c.default_event,
    representatives: c.representatives, email_configured: c.email_configured,
    me: { id: req.user.id, name: req.user.name, email: req.user.email } });
});

// Submit a reviewed card. The image is NEVER uploaded — only reviewed fields.
app.post('/api/scan/card', requireAuth, scanLimit, async (req, res) => {
  if (!canScan(req.user)) return forbid(res);
  const b = req.body || {};
  // 1) Validate + sanitise every submitted value.
  const T = (v, n = 500) => stripText(v).slice(0, n);
  const name = T(b.full_name), designation = T(b.designation), org = T(b.organisation);
  const email = stripText(b.email).trim().slice(0, 200);
  const mobile = T(b.mobile, 40), alt = T(b.alternate, 40);
  const city = T(b.city), state = T(b.state), country = T(b.country);
  const address = T(b.address, 1000), notes = T(b.notes, 2000), interests = T(b.areas_of_interest, 500);
  const website = safeUrl(b.website, { schemes: ['http', 'https'] });
  const linkedin = safeUrl(b.linkedin, { schemes: ['http', 'https'] });
  if (website === null) return res.status(400).json({ error: 'The website is not a valid or safe URL.' });
  if (linkedin === null) return res.status(400).json({ error: 'The LinkedIn URL is not valid or safe.' });
  if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!validPhone(mobile) || !validPhone(alt)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (!name && !org && !email) return res.status(400).json({ error: 'Enter at least a name, organisation or email.' });

  const cfg = scanConfig();
  const active = cfg.active_events;
  let event = T(b.event_source, 80);
  if (!active.includes(event)) event = cfg.default_event;              // only ACTIVE configured sources
  const consent = b.consent === true || b.consent === 'true' || b.consent === 1;
  const followDate = /^\d{4}-\d{2}-\d{2}$/.test(b.follow_up_date || '') ? b.follow_up_date : null;
  // Follow-up owner: validate against configured representatives (or the submitter).
  // A scanner cannot assign work to an arbitrary unvalidated value.
  const reps = (cfg.representatives || []).map(r => String(r));
  const proposedOwner = T(b.follow_up_owner, 120);
  const ownerAllowed = proposedOwner && (reps.some(r => r.toLowerCase() === proposedOwner.toLowerCase()) || proposedOwner.toLowerCase() === (req.user.name || '').toLowerCase());
  const ownerName = ownerAllowed ? proposedOwner : (req.user.name || req.user.email);
  const ownerUser = ownerAllowed ? db.prepare('SELECT id FROM users WHERE lower(name)=? OR lower(email)=?').get(ownerName.toLowerCase(), ownerName.toLowerCase()) : { id: req.user.id };
  const ownerId = ownerUser ? ownerUser.id : req.user.id;

  const emailNorm = normEmail(email), phoneNorm = normPhone(mobile), domain = orgDomain(website, email);
  const wantEmail = consent && !!email && validEmail(email);
  const failAt = process.env.ALLOW_TEST_HOOKS === '1' ? req.headers['x-test-fail'] : null;
  const idemKey = wantEmail ? thankyouIdemKey(event, emailNorm, 0) : null;   // recipient+event (contact filled after upsert)

  // 2) & 3) Resolve de-duplication and write ALL CRM rows in ONE transaction.
  let result;
  try {
    result = db.transaction(() => {
      // -- de-duplication: email_norm → comparable phone_norm → org domain/name --
      let contact = null;
      if (emailNorm) contact = db.prepare('SELECT * FROM contacts WHERE email_norm=?').get(emailNorm);
      if (!contact && phoneComparable(phoneNorm)) contact = db.prepare("SELECT * FROM contacts WHERE phone_norm=? AND phone_norm<>''").get(phoneNorm);
      const isDup = !!contact;
      let org_id = contact ? contact.org_id : null;
      if (!contact) {
        let orgRow = null;
        if (domain) orgRow = db.prepare("SELECT * FROM organisations WHERE domain=? AND domain<>''").get(domain);
        if (!orgRow && org) orgRow = db.prepare('SELECT * FROM organisations WHERE lower(legal_name)=? OR lower(brand_name)=?').get(org.toLowerCase(), org.toLowerCase());
        if (orgRow) {
          org_id = orgRow.id;
          const upd = {}; const cand = { website: website || '', address, city, state, country, domain };
          Object.keys(cand).forEach(k => { if (cand[k] && !orgRow[k]) upd[k] = cand[k]; });
          const keys = Object.keys(upd);
          if (keys.length) db.prepare(`UPDATE organisations SET ${keys.map(k => k + '=?').join(',')},updated_at=? WHERE id=?`).run(...keys.map(k => upd[k]), nowISO(), orgRow.id);
        } else {
          const info = db.prepare('INSERT INTO organisations(legal_name,brand_name,website,address,city,state,country,domain,category,membership_status,application_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
            .run(org || name || '(from card)', org || '', website || '', address, city, state, country, domain, 'Prospect', 'Prospect', nowISO().slice(0, 10), nowISO(), nowISO());
          org_id = info.lastInsertRowid;
        }
      }
      if (failAt === 'org') throw new Error('injected failure: org');

      // -- contact: enrich blanks only, append the event interaction --
      let contact_id;
      if (contact) {
        const upd = {}; const cand = { name, designation, email, phone: mobile, phone_alt: alt, linkedin: linkedin || '', areas_of_interest: interests };
        Object.keys(cand).forEach(k => { if (cand[k] && !contact[k]) upd[k] = cand[k]; });
        const line = `[${event} · ${nowISO().slice(0, 10)}${req.user.name ? ' · ' + req.user.name : ''}] ${notes || 'card re-scanned'}`;
        upd.notes = (contact.notes ? contact.notes + '\n' : '') + line;
        upd.email_norm = contact.email_norm || emailNorm; upd.phone_norm = contact.phone_norm || phoneNorm;
        upd.event_source = contact.event_source || event; upd.updated_at = nowISO();
        const keys = Object.keys(upd);
        db.prepare(`UPDATE contacts SET ${keys.map(k => k + '=?').join(',')} WHERE id=?`).run(...keys.map(k => upd[k]), contact.id);
        contact_id = contact.id;
      } else {
        const info = db.prepare(`INSERT INTO contacts(org_id,type,name,designation,email,phone,phone_alt,linkedin,notes,areas_of_interest,email_norm,phone_norm,source,event_source,submitted_by,is_primary,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`).run(org_id, 'Event contact', name, designation, email, mobile, alt, linkedin || '', notes, interests, emailNorm, phoneNorm, 'card_scan', event, req.user.id, nowISO(), nowISO());
        contact_id = info.lastInsertRowid;
      }
      if (failAt === 'contact') throw new Error('injected failure: contact');

      // -- follow-up task (stable owner id + readable name) --
      db.prepare('INSERT INTO tasks(title,due,org_id,owner_id,owner_name,event_source,created_at) VALUES(?,?,?,?,?,?,?)')
        .run(`Follow up: ${name || org || email || 'contact'} (${event})`, followDate || '', org_id, ownerId, ownerName, event, nowISO());
      if (failAt === 'task') throw new Error('injected failure: task');

      // -- exactly one queued thank-you record (idempotent via unique idem_key) --
      let emailId = null, emailState = 'skipped';
      if (wantEmail) {
        const key = thankyouIdemKey(event, emailNorm, contact_id);
        const existing = db.prepare('SELECT id,status FROM emails WHERE idem_key=?').get(key);
        if (existing) {
          emailId = existing.id;
          emailState = (existing.status === 'sent' || existing.status === 'sending') ? 'skipped_duplicate' : 'reuse';
        } else {
          const first = (name || '').split(/\s+/)[0] || 'there';
          const rep = ownerName || cfg.email_from_name;
          const subject = personalise(cfg.email_subject, { first_name: first, event, rep, from_name: cfg.email_from_name });
          const bodyText = personalise(cfg.email_body, { first_name: first, event, rep, from_name: cfg.email_from_name }) + '\n\n' + cfg.email_signature;
          try {
            const eInfo = db.prepare('INSERT INTO emails(to_addr,subject,body,template,org_id,contact_id,event_source,status,attempts,idem_key,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
              .run(email, subject, bodyText, 'thankyou', org_id, contact_id, event, 'queued', 0, key, nowISO());
            emailId = eInfo.lastInsertRowid; emailState = 'new';
          } catch (e) {
            // Lost a concurrent race on the unique index → reuse the row the winner created.
            const row = db.prepare('SELECT id,status FROM emails WHERE idem_key=?').get(key);
            if (row) { emailId = row.id; emailState = (row.status === 'sent' || row.status === 'sending') ? 'skipped_duplicate' : 'reuse'; }
          }
        }
      }
      if (failAt === 'email') throw new Error('injected failure: email');

      const initialStatus = !wantEmail ? 'skipped' : (emailState === 'skipped_duplicate' ? 'skipped_duplicate' : 'pending');
      const scanInfo = db.prepare(`INSERT INTO card_scans(submitter_id,submitter_email,submitter_name,org_id,contact_id,event_source,follow_up_owner,follow_up_owner_id,follow_up_date,consent,is_duplicate,email_status,email_id,email_attempts,raw_json,ip,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(req.user.id, req.user.email, req.user.name || '', org_id, contact_id, event, ownerName, ownerId, followDate, consent ? 1 : 0, isDup ? 1 : 0,
          initialStatus, emailId, 0, JSON.stringify({ name, designation, org, email, mobile, alt, website, linkedin, city, state, country, address, interests, notes }), clientIp(req), nowISO());
      return { org_id, contact_id, scan_id: scanInfo.lastInsertRowid, isDup, emailId, emailState };
    })();
  } catch (e) {
    // Transaction rolled back — nothing partial persisted. Never leak internals.
    if (String(e.message || '').startsWith('injected failure')) return res.status(500).json({ error: 'Could not save the card (test-injected failure). Nothing was saved.' });
    console.error('scan/card transaction failed:', e.message);
    return res.status(500).json({ error: 'Could not save the card. Please try again.' });
  }

  // 4)–6) CRM is committed. Now attempt SMTP for a fresh/queued email and settle status.
  let emailStatus = result.emailState === 'skipped_duplicate' ? 'skipped_duplicate' : (wantEmail ? 'queued' : 'skipped');
  if (wantEmail && (result.emailState === 'new' || result.emailState === 'reuse') && result.emailId) {
    const tm = process.env.ALLOW_TEST_HOOKS === '1' ? req.headers['x-test-mail'] : null;
    recoverStaleSending();
    const r = await sendClaimed(result.emailId, tm);
    emailStatus = r.claimed ? r.status : (r.status === 'sent' ? 'skipped_duplicate' : r.status);
  }
  db.prepare('UPDATE card_scans SET email_status=?, email_attempts=(SELECT COALESCE(attempts,0) FROM emails WHERE id=?), email_sent_at=? WHERE id=?')
    .run(emailStatus, result.emailId, emailStatus === 'sent' ? nowISO() : null, result.scan_id);
  audit(req, 'card_captured', 'card_scan', result.scan_id, `${event} · ${email || name || org}${result.isDup ? ' · duplicate' : ''} · email:${emailStatus}`);
  res.json({ ok: true, duplicate: result.isDup, contact_id: result.contact_id, org_id: result.org_id, email_status: emailStatus, message: scanMsg(emailStatus) });
});

// Super Admin: scanner settings (event sources + editable email template).
app.get('/api/settings/scan', requireAuth, (req, res) => {
  if (!ROLES[req.user.role]?.all) return forbid(res);
  res.json({ config: scanConfig(), defaults: SCAN_DEFAULTS });
});
app.put('/api/settings/scan', requireAuth, (req, res) => {
  if (!ROLES[req.user.role]?.all) return forbid(res);
  const b = req.body || {};
  const save = (k, v) => db.prepare('INSERT INTO settings(key,value,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by')
    .run('scan.' + k, JSON.stringify(v), nowISO(), req.user.id);
  if (Array.isArray(b.event_sources)) {
    const cleaned = b.event_sources.map(s => {
      const name = stripText(typeof s === 'string' ? s : (s && s.name) || '').slice(0, 80);
      const activeFlag = typeof s === 'object' && s ? s.active !== false : true;
      return name ? { name, active: activeFlag } : null;
    }).filter(Boolean).slice(0, 100);
    // Never allow the permanent source to be dropped or deactivated.
    if (!cleaned.some(s => s.name.toLowerCase() === PERMANENT_EVENT.toLowerCase())) cleaned.unshift({ name: PERMANENT_EVENT, active: true });
    else cleaned.forEach(s => { if (s.name.toLowerCase() === PERMANENT_EVENT.toLowerCase()) s.active = true; });
    save('event_sources', cleaned);
  }
  if (Array.isArray(b.representatives)) save('representatives', b.representatives.map(s => stripText(s).slice(0, 120)).filter(Boolean).slice(0, 100));
  ['email_subject', 'email_from_name', 'email_signature'].forEach(k => { if (typeof b[k] === 'string') save(k, stripText(b[k]).slice(0, 400)); });
  if (typeof b.email_body === 'string') save('email_body', stripText(b.email_body).slice(0, 4000));
  audit(req, 'scan_settings_updated', 'settings', 'scan', null);
  res.json({ ok: true, config: scanConfig() });
});
// Super Admin: send a test thank-you email.
app.post('/api/settings/scan/test-email', requireAuth, async (req, res) => {
  if (!ROLES[req.user.role]?.all) return forbid(res);
  const to = stripText((req.body && req.body.email) || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ error: 'Enter a valid test recipient email.' });
  const cfg = scanConfig();
  const subject = personalise(cfg.email_subject, { first_name: 'there', event: cfg.default_event, rep: req.user.name || cfg.email_from_name, from_name: cfg.email_from_name });
  const bodyText = personalise(cfg.email_body, { first_name: 'there', event: cfg.default_event, rep: req.user.name || cfg.email_from_name, from_name: cfg.email_from_name }) + '\n\n' + cfg.email_signature;
  const sent = await mailer.sendMail({ to, subject, text: bodyText });
  audit(req, 'scan_test_email', 'settings', 'scan', sent.ok ? 'sent' : (sent.configured ? 'failed' : 'not_configured'));
  if (sent.ok) return res.json({ ok: true, message: 'Test email sent to ' + to });
  res.status(sent.configured ? 502 : 200).json({ ok: false, configured: sent.configured, message: sent.configured ? ('Send failed: ' + (sent.error || 'unknown')) : 'Email is not configured (SMTP env vars not set). Nothing was sent.' });
});

// CRM roles: browse / filter captured cards. Scanners are blocked (lockdown above).
// EXPLICIT column list — never returns raw_json, ip or internal error details.
app.get('/api/crm/scans', requireAuth, (req, res) => {
  if (!canCRMRead(req.user)) return forbid(res);
  const { event, user, from, to, email_status } = req.query;
  const where = [], args = [];
  if (event) { where.push('s.event_source=?'); args.push(event); }
  if (user) { where.push('s.submitter_id=?'); args.push(user); }
  if (email_status) { where.push('s.email_status=?'); args.push(email_status); }
  if (from) { where.push('s.created_at>=?'); args.push(from); }
  if (to) { where.push('s.created_at<=?'); args.push(to + 'T23:59:59'); }
  const sql = `SELECT s.id, s.created_at, s.event_source, s.submitter_id, s.submitter_email, s.submitter_name,
      s.follow_up_owner, s.follow_up_date, s.consent, s.is_duplicate, s.email_status, s.email_id, s.email_attempts,
      c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone, o.legal_name AS org_name
    FROM card_scans s LEFT JOIN contacts c ON c.id=s.contact_id LEFT JOIN organisations o ON o.id=s.org_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY s.id DESC LIMIT 1000`;
  res.json({ scans: db.prepare(sql).all(...args) });
});
// Authorized detail (CRM writers / Super Admin only): the full reviewed snapshot.
// raw_json is retained ONLY as a per-card audit of exactly what the representative
// confirmed; it is never in the list or CSV, and never reachable by a scanner.
app.get('/api/crm/scans/:id', requireAuth, (req, res) => {
  if (!canCRMWrite(req.user)) return forbid(res);
  const s = db.prepare(`SELECT s.id,s.created_at,s.event_source,s.submitter_email,s.submitter_name,s.follow_up_owner,s.follow_up_date,
      s.consent,s.is_duplicate,s.email_status,s.email_attempts,s.raw_json, c.name AS contact_name, c.email AS contact_email, o.legal_name AS org_name
    FROM card_scans s LEFT JOIN contacts c ON c.id=s.contact_id LEFT JOIN organisations o ON o.id=s.org_id WHERE s.id=?`).get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  let reviewed = {}; try { reviewed = JSON.parse(s.raw_json || '{}'); } catch (e) {}
  delete s.raw_json;
  audit(req, 'scan_detail_viewed', 'card_scan', s.id, null);
  res.json({ scan: s, reviewed });
});
app.get('/api/crm/scans.csv', requireAuth, (req, res) => {
  if (!canCRMRead(req.user)) return forbid(res);
  const rows = db.prepare(`SELECT s.created_at,s.event_source,s.submitter_email,c.name AS contact_name,c.email AS contact_email,
    c.phone AS contact_phone,o.legal_name AS org_name,s.email_status,s.is_duplicate,s.follow_up_owner,s.follow_up_date
    FROM card_scans s LEFT JOIN contacts c ON c.id=s.contact_id LEFT JOIN organisations o ON o.id=s.org_id ORDER BY s.id DESC LIMIT 5000`).all();
  const cols = ['created_at','event_source','submitter_email','contact_name','contact_email','contact_phone','org_name','email_status','is_duplicate','follow_up_owner','follow_up_date'];
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = [cols.join(',')].concat(rows.map(r => cols.map(c => esc(r[c])).join(','))).join('\r\n');
  audit(req, 'scans_exported', 'card_scan', null, rows.length + ' rows');
  res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="card-scans.csv"');
  res.send(csv);
});
// Retry a failed/queued thank-you email (Super Admin / CRM writers). Uses the
// atomic claim so two admins retrying at once cannot send twice. 'legacy_unsent'
// historical rows are never retriable (they are not queued/failed).
async function retryEmailRow(req, res, e) {
  // Recover any genuinely abandoned 'sending' row FIRST, then re-read this row and
  // decide eligibility on its post-recovery status — so a stuck 'sending' record can
  // be recovered through the retry flow instead of being rejected as ineligible.
  recoverStaleSending();
  e = db.prepare('SELECT * FROM emails WHERE id=?').get(e.id) || e;
  if (e.status === 'sent') return res.json({ ok: true, status: 'sent', message: 'Already sent.' });
  if (e.status === 'sending') return res.json({ ok: false, status: 'sending', claimed: false, message: 'Another process is currently sending this email.' });
  if (!['queued', 'failed'].includes(e.status)) return res.status(400).json({ error: 'This email is not eligible for retry.' });
  const tm = process.env.ALLOW_TEST_HOOKS === '1' ? req.headers['x-test-mail'] : null;
  const r = await sendClaimed(e.id, tm);
  if (e.contact_id) db.prepare("UPDATE card_scans SET email_status=?, email_attempts=(SELECT COALESCE(attempts,0) FROM emails WHERE id=?), email_sent_at=? WHERE email_id=?")
    .run(r.status, e.id, r.status === 'sent' ? nowISO() : null, e.id);
  audit(req, 'email_retried', 'email', e.id, r.claimed ? r.status : ('noop:' + r.status));
  res.json({ ok: r.status === 'sent', status: r.status, claimed: r.claimed,
    message: r.status === 'sent' ? 'Email sent.' : (r.claimed ? 'Kept for retry.' : 'Another process is handling this email.') });
}
app.post('/api/crm/emails/:id/retry', requireAuth, async (req, res) => {
  if (!canCRMWrite(req.user)) return forbid(res);
  const e = db.prepare('SELECT * FROM emails WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  return retryEmailRow(req, res, e);
});
app.post('/api/crm/scans/:id/retry-email', requireAuth, async (req, res) => {
  if (!canCRMWrite(req.user)) return forbid(res);
  const s = db.prepare('SELECT * FROM card_scans WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  const e = s.email_id ? db.prepare('SELECT * FROM emails WHERE id=?').get(s.email_id)
    : db.prepare("SELECT * FROM emails WHERE template='thankyou' AND contact_id=? AND event_source=? AND status IN ('queued','failed') ORDER BY id DESC").get(s.contact_id, s.event_source);
  if (!e) return res.status(400).json({ error: 'No queued or failed email to retry for this card.' });
  return retryEmailRow(req, res, e);
});

/* Test-only hooks (registered ONLY when ALLOW_TEST_HOOKS=1; never in production).
   They let the suite construct concurrency scenarios and observe SMTP call counts. */
if (process.env.ALLOW_TEST_HOOKS === '1') {
  app.post('/api/test/email-state', requireAuth, (req, res) => {
    if (!ROLES[req.user.role]?.all) return forbid(res);
    const b = req.body || {};
    const e = db.prepare('SELECT * FROM emails WHERE id=?').get(b.id);
    if (!e) return res.status(404).json({ error: 'Not found' });
    const fields = ['created_at', 'status', 'sending_started_at', 'sent_at', 'last_error'].filter(k => k in b);
    if (fields.length) db.prepare(`UPDATE emails SET ${fields.map(k => k + '=?').join(',')} WHERE id=?`).run(...fields.map(k => b[k]), e.id);
    res.json({ ok: true, email: db.prepare('SELECT id,status,created_at,sending_started_at,sent_at FROM emails WHERE id=?').get(e.id) });
  });
  app.get('/api/test/email/:id', requireAuth, (req, res) => {
    if (!ROLES[req.user.role]?.all) return forbid(res);
    res.json({ email: db.prepare('SELECT id,status,created_at,sending_started_at,sent_at,attempts FROM emails WHERE id=?').get(req.params.id) });
  });
  app.post('/api/test/recover-stale', requireAuth, (req, res) => {
    if (!ROLES[req.user.role]?.all) return forbid(res);
    recoverStaleSending(req.body && typeof req.body.maxAgeMs === 'number' ? req.body.maxAgeMs : undefined);
    res.json({ ok: true });
  });
  app.get('/api/test/smtp-calls', requireAuth, (req, res) => {
    if (!ROLES[req.user.role]?.all) return forbid(res);
    res.json({ calls: TEST_SMTP_CALLS });
  });
  app.post('/api/test/smtp-calls/reset', requireAuth, (req, res) => {
    if (!ROLES[req.user.role]?.all) return forbid(res);
    TEST_SMTP_CALLS = 0; res.json({ ok: true });
  });
}

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
