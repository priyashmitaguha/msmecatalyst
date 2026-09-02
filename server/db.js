'use strict';
/* MSME Catalyst — database layer (better-sqlite3)
   Generic CMS "entries" table + dedicated membership CRM tables. */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'msme-catalyst.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* -------------------- Roles & permissions -------------------- */
const ROLES = {
  super_admin:      { label: 'Super Admin',      all: true },
  content_admin:    { label: 'Content Admin',    collections: ['blogs','reports','events','podcasts','pages','media','social'] },
  membership_admin: { label: 'Membership Admin', crm: true, collections: ['media'] },
  governance_admin: { label: 'Governance Admin', collections: ['council','advisory','secretariat','media'] },
  odr_admin:        { label: 'ODR Admin',        collections: ['odr_providers','odr_resources','media'], odr: true },
  editor:           { label: 'Editor / Reviewer',collections: ['blogs','reports','podcasts','pages'], publish: false },
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

module.exports = { db, ROLES, COLLECTIONS, seed, nowISO };

if (require.main === module && process.argv.includes('--seed')) seed();
