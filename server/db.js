'use strict';
/* MSME Catalyst — database layer (better-sqlite3)
   Generic CMS "entries" table + dedicated membership CRM tables. */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { normEmail, normPhone, domainFromWebsite, domainFromEmail } = require('./normalize');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'msme-catalyst.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* -------------------- Roles & permissions --------------------
   Role flags (enforced server-side in server.js):
     all        → full access to everything (Super Admin)
     content    → all website content collections + page copy + visibility (no CRM, no user mgmt)
     editorScoped → access ONLY the collections listed in that user's per-user `perms`
     crm        → may read the CRM;  crmWrite (default true) → may modify the CRM
     users      → may manage admin users (Super Admin only)
     odr        → may manage ODR applications
   Legacy roles are retained so existing accounts keep working. */
const CONTENT_COLLECTIONS = ['council','advisory','secretariat','blogs','reports','events','podcasts','odr_providers','odr_resources','pages','media','social'];
const ROLES = {
  super_admin: { label: 'Super Admin', all: true, users: true, crm: true, crmWrite: true, odr: true },
  cms_admin:   { label: 'CMS Admin',   content: true, odr: true, collections: CONTENT_COLLECTIONS },
  editor:      { label: 'Editor (assigned sections)', editorScoped: true, publish: true, collections: [] },
  crm_admin:   { label: 'CRM Admin',   crm: true, crmWrite: true },
  crm_viewer:  { label: 'CRM Viewer (read-only)', crm: true, crmWrite: false },
  // Event Scanner: capture visiting cards at events ONLY. No dashboard, CRM
  // browsing, analytics, users, audit, CMS or settings — enforced server-side.
  event_scanner: { label: 'Event Scanner (card capture)', scanner: true },
  // ---- legacy roles (kept for backward compatibility with existing accounts) ----
  content_admin:    { label: 'Content Admin (legacy)',    content: true, collections: CONTENT_COLLECTIONS },
  membership_admin: { label: 'Membership Admin (legacy)', crm: true, crmWrite: true, collections: ['media'] },
  governance_admin: { label: 'Governance Admin (legacy)', collections: ['council','advisory','secretariat','media'] },
  odr_admin:        { label: 'ODR Admin (legacy)',        collections: ['odr_providers','odr_resources','media'], odr: true },
};

/* -------------------- CMS collection definitions -------------------- */
/* status_set: which lifecycle applies. Fields drive the admin form. */
const COLLECTIONS = {
  council: { label: 'Governing Council', status_set: 'active', order: true, fields: [
    ['photo','Profile photo','file'],['name','Full name','text',true],['designation','Designation','text'],
    ['organisation','Organisation','text'],['role','Council role','text'],['bio','Short biography','textarea'],
    ['linkedin','LinkedIn URL','url'],['publish_date','Publish date','date'] ] },
  advisory: { label: 'Advisory Body', status_set: 'active', order: true, fields: [
    ['photo','Profile photo','file'],['name','Full name','text',true],['designation','Designation','text'],
    ['organisation','Organisation','text'],['expertise','Area of expertise','text'],['bio','Short biography','textarea'],
    ['linkedin','LinkedIn URL','url'] ] },
  secretariat: { label: 'Secretariat', status_set: 'active', order: true, fields: [
    ['photo','Profile photo','file'],['name','Full name','text',true],['designation','Designation','text'],
    ['department','Department / function','text'],['bio','Short biography','textarea'],
    ['email','Email (if public)','email'],['linkedin','LinkedIn URL','url'] ] },
  blogs: { label: 'Blogs', status_set: 'editorial', fields: [
    ['cover','Cover image','file'],['title','Blog title','text',true],['slug','URL slug','text'],
    ['summary','Short summary','textarea'],['body','Full article','richtext'],['author','Author name','text'],
    ['category','Category','text'],['tags','Tags (comma separated)','text'],['publish_date','Publication date','date'],
    ['featured','Featured article','bool'],['seo_title','SEO title','text'],['meta_desc','Meta description','textarea'],
    ['social_image','Social-share image','file'] ] },
  reports: { label: 'Reports & Papers', status_set: 'publish', fields: [
    ['cover','Cover / thumbnail','file'],['title','Title','text',true],['summary','Summary','textarea'],
    ['category','Category (Report / White paper / Cluster map / Scorecard / Research)','text'],['tags','Tags','text'],['author','Author / org','text'],
    ['publish_date','Publication date','date'],['file','PDF / document','file'],['link','External link','url'],
    ['featured','Featured','bool'],['seo_title','SEO title','text'],['meta_desc','Meta description','textarea'] ] },
  events: { label: 'Events & Labs', status_set: 'publish', fields: [
    ['cover','Cover / thumbnail','file'],['title','Title','text',true],['summary','Summary','textarea'],
    ['category','Category (Working lab / Roundtable / Event)','text'],['tags','Tags','text'],['location','Location','text'],
    ['publish_date','Date','date'],['link','External link / registration','url'],
    ['featured','Featured','bool'],['seo_title','SEO title','text'],['meta_desc','Meta description','textarea'] ] },
  podcasts: { label: 'Podcasts', status_set: 'publish', fields: [
    ['cover','Cover artwork','file'],['title','Episode title','text',true],['guest','Guest name','text'],
    ['guest_org','Guest organisation & designation','text'],['description','Episode description','textarea'],
    ['spotify','Spotify link','url'],['youtube','YouTube link','url'],['apple','Apple Podcasts link','url'],
    ['embed','Audio/video embed','textarea'],['transcript','Transcript','textarea'],['tags','Tags','text'],
    ['related','Related blogs & papers','text'],['publish_date','Publication date','date'] ] },
  odr_providers: { label: 'ODR Providers', status_set: 'active', order: true, fields: [
    ['logo','Provider logo','file'],['name','Provider name','text',true],['description','Description','textarea'],
    ['url','Website redirect URL','url'],['support','Areas of support','text'] ] },
  odr_resources: { label: 'ODR Resources', status_set: 'publish', fields: [
    ['cover','Thumbnail','file'],['title','Title','text',true],['category','Category','text'],['tags','Tags','text'],
    ['file','PDF','file'],['summary','Summary','textarea'],['publish_date','Upload date','date'] ] },
  pages: { label: 'Website Pages', status_set: 'publish', fields: [
    ['page','Page key','text',true],['title','SEO title','text'],['meta_desc','Meta description','textarea'],
    ['content','Editable copy (JSON/markdown)','richtext'] ] },
  media: { label: 'Media Library', status_set: 'active', fields: [
    ['file','Asset','file',true],['filename','File name','text'],['alt','Alt text','text'],['caption','Caption','text'],
    ['usage','Usage location','text'] ] },
  social: { label: 'Social Links', status_set: 'active', fields: [
    ['platform','Platform','text',true],['url','URL','url'],['icon','Icon','text'] ] },
};

/* -------------------- Schema -------------------- */
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'editor', created_at TEXT);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY, user_id INTEGER, expires INTEGER);
CREATE TABLE IF NOT EXISTS entries(
  id INTEGER PRIMARY KEY, collection TEXT NOT NULL, data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', display_order INTEGER DEFAULT 0,
  created_by INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS entry_versions(
  id INTEGER PRIMARY KEY, entry_id INTEGER, data TEXT, status TEXT, saved_at TEXT, saved_by INTEGER);
CREATE TABLE IF NOT EXISTS organisations(
  id INTEGER PRIMARY KEY,
  legal_name TEXT, brand_name TEXT, category TEXT, industry TEXT, website TEXT,
  address TEXT, gstin_pan TEXT, logo TEXT, logo_consent INTEGER DEFAULT 0,
  website_display_status TEXT DEFAULT 'Draft',          -- Draft/Pending Payment/Paid and Live/Hidden
  membership_status TEXT DEFAULT 'Applied',             -- Prospect/Applied/Approved/Invoice Sent/Paid/Active/Expiring/Expired/Cancelled
  secretariat_hidden INTEGER DEFAULT 0,                 -- manual override
  application_date TEXT, approval_date TEXT, start_date TEXT, end_date TEXT, renewal_due TEXT,
  fee REAL, invoice_number TEXT, invoice_date TEXT, payment_status TEXT DEFAULT 'Unpaid',
  payment_date TEXT, renewal_invoice_status TEXT, notes TEXT, documents TEXT,
  created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS contacts(
  id INTEGER PRIMARY KEY, org_id INTEGER, type TEXT, name TEXT, designation TEXT,
  email TEXT, phone TEXT, is_primary INTEGER DEFAULT 0,
  FOREIGN KEY(org_id) REFERENCES organisations(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS odr_applications(
  id INTEGER PRIMARY KEY, applicant TEXT, enterprise TEXT, mobile TEXT, email TEXT,
  location TEXT, cluster TEXT, counterparty TEXT, amount REAL, invoice_details TEXT,
  due_date TEXT, issue TEXT, action_taken TEXT, documents TEXT, consent INTEGER,
  status TEXT DEFAULT 'Received', provider_selected TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS messages(
  id INTEGER PRIMARY KEY, kind TEXT, name TEXT, email TEXT, org TEXT, enquiry_type TEXT,
  message TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS newsletter(
  id INTEGER PRIMARY KEY, email TEXT UNIQUE, created_at TEXT);
CREATE TABLE IF NOT EXISTS tasks(
  id INTEGER PRIMARY KEY, title TEXT, due TEXT, org_id INTEGER, done INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS emails(   -- email automation outbox (simulated; wire to real ESP)
  id INTEGER PRIMARY KEY, to_addr TEXT, subject TEXT, body TEXT, template TEXT, org_id INTEGER, created_at TEXT, sent INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS analytics(
  id INTEGER PRIMARY KEY, event TEXT, meta TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS pagecopy(   -- editable page-copy overrides (defaults live in the HTML/registry)
  key TEXT PRIMARY KEY, value TEXT, updated_at TEXT, updated_by INTEGER);
CREATE TABLE IF NOT EXISTS settings(   -- key/value site settings (e.g. section visibility flags)
  key TEXT PRIMARY KEY, value TEXT, updated_at TEXT, updated_by INTEGER);
`);

/* -------------------- Migrations (additive, non-destructive) --------------------
   Safe to run on every boot: new tables use IF NOT EXISTS; new columns are only
   added when missing. No existing row or column is ever dropped or modified. */
function runMigrations() {
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
  const addColumn = (t, col, ddl) => { if (!cols(t).includes(col)) { db.exec(`ALTER TABLE ${t} ADD COLUMN ${ddl}`); } };

  // users: activation, forced password change, per-user section permissions, audit stamps
  addColumn('users', 'active', 'active INTEGER NOT NULL DEFAULT 1');
  addColumn('users', 'must_change', 'must_change INTEGER NOT NULL DEFAULT 0');
  addColumn('users', 'perms', 'perms TEXT');                 // JSON array of collection keys (editor role)
  addColumn('users', 'updated_at', 'updated_at TEXT');
  addColumn('users', 'created_by', 'created_by INTEGER');

  // sessions: creation stamp (for "logout everywhere" auditing)
  addColumn('sessions', 'created_at', 'created_at TEXT');

  // single-use, expiring password-reset tokens (only a HASH of the token is stored)
  db.exec(`CREATE TABLE IF NOT EXISTS password_resets(
    id INTEGER PRIMARY KEY, user_id INTEGER, token_hash TEXT, expires INTEGER,
    used INTEGER NOT NULL DEFAULT 0, created_at TEXT, ip TEXT);`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_resets(user_id)');

  // audit trail — who did what, when
  db.exec(`CREATE TABLE IF NOT EXISTS audit_log(
    id INTEGER PRIMARY KEY, actor_id INTEGER, actor_email TEXT, action TEXT,
    entity TEXT, entity_id TEXT, detail TEXT, ip TEXT, created_at TEXT);`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)');

  db.exec('CREATE INDEX IF NOT EXISTS idx_entries_collection ON entries(collection)');

  // ---- Event card scanner (GFF) — all additive, existing data preserved ----
  // Extra organisation locality fields (website/address already exist).
  addColumn('organisations', 'city', 'city TEXT');
  addColumn('organisations', 'state', 'state TEXT');
  addColumn('organisations', 'country', 'country TEXT');
  addColumn('organisations', 'domain', 'domain TEXT');            // normalised, for de-duplication
  // Extra contact fields captured from a visiting card.
  addColumn('contacts', 'phone_alt', 'phone_alt TEXT');
  addColumn('contacts', 'linkedin', 'linkedin TEXT');
  addColumn('contacts', 'notes', 'notes TEXT');
  addColumn('contacts', 'areas_of_interest', 'areas_of_interest TEXT');
  addColumn('contacts', 'email_norm', 'email_norm TEXT');         // normalised, for de-duplication
  addColumn('contacts', 'phone_norm', 'phone_norm TEXT');         // normalised, for de-duplication
  addColumn('contacts', 'source', 'source TEXT');
  addColumn('contacts', 'event_source', 'event_source TEXT');
  addColumn('contacts', 'submitted_by', 'submitted_by INTEGER');
  addColumn('contacts', 'created_at', 'created_at TEXT');
  addColumn('contacts', 'updated_at', 'updated_at TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_emailnorm ON contacts(email_norm)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_phonenorm ON contacts(phone_norm)');

  // Email outbox: queue / retry / status tracking.
  // IMPORTANT (one-time, guarded): introducing `status` must NOT make historical
  // rows eligible for an accidental resend. We detect whether the column existed
  // BEFORE this migration and, only on its first introduction, map from the legacy
  // `sent` field: sent=1 → 'sent'; every other historical row → 'legacy_unsent',
  // a terminal status that the retry/send logic never picks up. Later boots see the
  // column already present and never rewrite statuses (idempotent).
  const hadEmailStatus = cols('emails').includes('status');
  addColumn('emails', 'status', "status TEXT DEFAULT 'queued'");   // default only affects genuinely NEW rows
  addColumn('emails', 'attempts', 'attempts INTEGER DEFAULT 0');
  addColumn('emails', 'last_error', 'last_error TEXT');
  addColumn('emails', 'contact_id', 'contact_id INTEGER');
  addColumn('emails', 'event_source', 'event_source TEXT');
  addColumn('emails', 'sent_at', 'sent_at TEXT');
  addColumn('emails', 'idem_key', 'idem_key TEXT');                // thank-you idempotency key
  addColumn('emails', 'sending_started_at', 'sending_started_at TEXT');  // when a row was claimed for send (stale-recovery clock)
  if (!hadEmailStatus) {
    // First introduction only. ADD COLUMN set every existing row to 'queued';
    // immediately correct that from the legacy `sent` flag. No live rows exist yet
    // (this runs at boot before requests are served), so updating all rows is safe.
    const n = db.prepare("UPDATE emails SET status = CASE WHEN sent=1 THEN 'sent' ELSE 'legacy_unsent' END").run().changes;
    if (n) console.log(`  emails.status introduced: mapped ${n} historical row(s) from 'sent' (sent→sent, else→legacy_unsent).`);
  }
  // Idempotency: at most one thank-you record per (recipient/contact + event).
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_idem ON emails(idem_key) WHERE idem_key IS NOT NULL');
  db.exec('CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status)');

  // Follow-up ownership as a stable reference (not just free text in the title).
  addColumn('tasks', 'owner_id', 'owner_id INTEGER');
  addColumn('tasks', 'owner_name', 'owner_name TEXT');
  addColumn('tasks', 'event_source', 'event_source TEXT');

  // One row per captured card — attribution, email status and review audit.
  db.exec(`CREATE TABLE IF NOT EXISTS card_scans(
    id INTEGER PRIMARY KEY, submitter_id INTEGER, submitter_email TEXT, submitter_name TEXT,
    org_id INTEGER, contact_id INTEGER, event_source TEXT, follow_up_owner TEXT, follow_up_owner_id INTEGER, follow_up_date TEXT,
    consent INTEGER DEFAULT 0, is_duplicate INTEGER DEFAULT 0,
    email_status TEXT, email_id INTEGER, email_attempts INTEGER DEFAULT 0, email_last_error TEXT, email_sent_at TEXT,
    raw_json TEXT, ip TEXT, created_at TEXT);`);
  addColumn('card_scans', 'follow_up_owner_id', 'follow_up_owner_id INTEGER');   // for DBs created before this column
  addColumn('card_scans', 'email_id', 'email_id INTEGER');
  db.exec('CREATE INDEX IF NOT EXISTS idx_scans_event ON card_scans(event_source)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_scans_submitter ON card_scans(submitter_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_scans_created ON card_scans(created_at)');

  // ---- One-time, idempotent backfill of the new de-duplication columns ----
  // Existing production contacts/organisations have blank email_norm/phone_norm/
  // domain. Fill ONLY blanks (so re-running never rewrites corrected values).
  backfillNormalisation();

  console.log('Migrations applied (additive; existing data preserved).');
}

// Idempotent backfill: fills ONLY blank normalisation columns, so it is safe to
// run on every boot and never rewrites a value that already exists.
function backfillNormalisation() {
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
  if (!cols('contacts').includes('email_norm')) return;
  const cRows = db.prepare("SELECT id,email,phone,email_norm,phone_norm FROM contacts WHERE email_norm IS NULL OR email_norm='' OR phone_norm IS NULL OR phone_norm=''").all();
  const setC = db.prepare('UPDATE contacts SET email_norm=?, phone_norm=? WHERE id=?');
  const tx = db.transaction(rows => {
    for (const r of rows) {
      const en = (r.email_norm && r.email_norm !== '') ? r.email_norm : normEmail(r.email);
      const pn = (r.phone_norm && r.phone_norm !== '') ? r.phone_norm : normPhone(r.phone);
      setC.run(en, pn, r.id);
    }
  });
  if (cRows.length) tx(cRows);

  // Organisation domain: website first; else a BUSINESS email of one of its
  // contacts (never a free consumer mailbox). Blanks only.
  const oRows = db.prepare("SELECT id,website,domain FROM organisations WHERE domain IS NULL OR domain=''").all();
  const setO = db.prepare('UPDATE organisations SET domain=? WHERE id=?');
  const oneContactEmail = db.prepare("SELECT email FROM contacts WHERE org_id=? AND email IS NOT NULL AND email<>'' ");
  const txo = db.transaction(rows => {
    for (const o of rows) {
      let d = domainFromWebsite(o.website);
      if (!d) { for (const c of oneContactEmail.all(o.id)) { d = domainFromEmail(c.email); if (d) break; } }
      if (d) setO.run(d, o.id);
    }
  });
  if (oRows.length) txo(oRows);
  if (cRows.length || oRows.length) console.log(`  backfilled normalisation: ${cRows.length} contact(s), ${oRows.length} organisation(s).`);
}
runMigrations();

const nowISO = () => new Date().toISOString();

/* -------------------- Seed -------------------- */
function seed() {
  const count = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (count > 0) { console.log('Seed skipped — data already present.'); return; }
  console.log('Seeding database…');
  const ins = db.prepare('INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)');
  const production = process.env.NODE_ENV === 'production';
  const adminEmail = (process.env.ADMIN_EMAIL || (production ? '' : 'admin@msmecatalyst.org')).toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || (production ? '' : 'local-development-only');
  if (!adminEmail || adminPassword.length < 12) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before first production start.');
  }
  const pw = bcrypt.hashSync(adminPassword, 12);
  ins.run('Super Admin', adminEmail, pw, 'super_admin', nowISO());

  const addEntry = db.prepare('INSERT INTO entries(collection,data,status,display_order,created_at,updated_at) VALUES(?,?,?,?,?,?)');
  const roles = ['Chair / Independent Member','Banking or Financial Institution Member','NBFC / Alternative Lender Member',
    'Fintech / Digital Infrastructure Member','Anchor Corporate / Market Access Member','MSME / Cluster Representative',
    'Capability / Academic Institution Member','Legal / Receivables / ODR Ecosystem Member',
    'Independent Governance or Risk Expert','Independent Sector / Development Expert'];
  roles.forEach((role,i) => addEntry.run('council', JSON.stringify({
    name:'Member to be announced', role, designation:'Designation', organisation:'Organisation',
    bio:'Short biography managed in the CMS.', linkedin:'' }), 'active', i+1, nowISO(), nowISO()));

  ['Chief Executive Officer','Cluster Programmes','Partnerships & Membership','Research, Data & Learning','Operations & Communications']
    .forEach((d,i)=>addEntry.run('secretariat', JSON.stringify({name:'Appointment in progress',designation:d,department:d,bio:'Role summary.'}),'active',i+1,nowISO(),nowISO()));

  [1,2,3,4].forEach(i=>addEntry.run('advisory', JSON.stringify({name:'Advisor to be announced',designation:'Advisory Body (non-executive)',expertise:'Area of expertise',bio:'Strategic guidance only.'}),'active',i,nowISO(),nowISO()));

  const providers = [
    {name:'Provider A', description:'Independent ODR provider — mediation and conciliation.', url:'https://example-provider-a.org', support:'Mediation, Conciliation'},
    {name:'Provider B', description:'Independent ODR provider — arbitration and online dispute resolution.', url:'https://example-provider-b.org', support:'Arbitration, ODR'},
    {name:'Provider C', description:'Independent ODR provider — mediation and arbitration.', url:'https://example-provider-c.org', support:'Mediation, Arbitration'},
  ];
  providers.forEach((p,i)=>addEntry.run('odr_providers', JSON.stringify(p), 'active', i+1, nowISO(), nowISO()));

  ['The convergence gap in MSME finance','Why receivables break small businesses','Reading a cluster scorecard']
    .forEach((t,i)=>addEntry.run('blogs', JSON.stringify({title:t,slug:t.toLowerCase().replace(/[^a-z]+/g,'-'),summary:'Summary text.',author:'MSME Catalyst',category:['Convergence','Receivables','Clusters'][i],tags:'msme,convergence',featured:i===0,publish_date:'2026-06-0'+(i+1)}), i===0?'published':'draft', 0, nowISO(), nowISO()));

  ['Cluster readiness baseline 2026','MSME receivables friction: a policy note']
    .forEach((t,i)=>addEntry.run('reports', JSON.stringify({title:t,summary:'Summary.',category:i?'White papers':'Reports',author:'Research, Data & Learning',publish_date:'2026-05-1'+i}),'published',0,nowISO(),nowISO()));

  addEntry.run('podcasts', JSON.stringify({title:'Making support converge — episode 1',guest:'Guest name',guest_org:'Organisation',description:'Pilot episode.',spotify:'',youtube:'',apple:''}),'published',0,nowISO(),nowISO());

  [['Cluster receivables working lab','Working lab'],['Convergence roundtable — Mumbai','Roundtable']]
    .forEach(([t,c],i)=>addEntry.run('events', JSON.stringify({title:t,category:c,summary:'Summary managed in the CMS.',location:'Mumbai',publish_date:'2026-07-0'+(i+1)}),'published',0,nowISO(),nowISO()));

  // Members (for logo wall). One active+paid+consent -> visible; others not.
  const io = db.prepare(`INSERT INTO organisations(legal_name,brand_name,category,industry,website,logo_consent,
    website_display_status,membership_status,application_date,approval_date,start_date,end_date,renewal_due,fee,
    payment_status,payment_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const y = (d)=>d;
  io.run('Sample Bank Ltd','Sample Bank','Lenders','Banking','https://example.com',1,'Paid and Live','Active','2026-01-01','2026-01-05','2026-01-10','2027-01-10','2026-12-11',250000,'Paid','2026-01-08',nowISO(),nowISO());
  io.run('Sample Fintech Pvt Ltd','SampleFin','Fintechs','Fintech','https://example.com',1,'Paid and Live','Active','2026-02-01','2026-02-04','2026-02-08','2027-02-08','2027-01-09',150000,'Paid','2026-02-06',nowISO(),nowISO());
  io.run('Applied Anchor Co','Anchor Co','Anchors','Manufacturing','https://example.com',0,'Pending Payment','Invoice Sent','2026-07-01',null,null,null,null,150000,'Unpaid',null,nowISO(),nowISO());

  db.prepare('INSERT INTO odr_applications(applicant,enterprise,mobile,email,location,cluster,counterparty,amount,issue,consent,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
    .run('Sample Applicant','Sample Enterprise','9800000000','owner@example.com','Pune','Auto components','Buyer Corp',480000,'Invoice overdue by 120 days.',1,'Received',nowISO());

  console.log(`Seed complete. Super Admin: ${adminEmail}`);
}

module.exports = { db, ROLES, COLLECTIONS, CONTENT_COLLECTIONS, seed, nowISO, runMigrations };

if (require.main === module) {
  // `node db.js --migrate` runs migrations only; `node db.js --seed` also seeds.
  if (process.argv.includes('--seed')) seed();
  else console.log('Migrations complete.');
}
