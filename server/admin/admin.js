'use strict';
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
async function api(url, opts) {
  const r = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  if (r.status === 401) { show('#login'); throw new Error('auth'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}
function show(sel) { $('#login').style.display = sel === '#login' ? 'grid' : 'none'; $('#app').style.display = sel === '#app' ? 'grid' : 'none'; }

let ME = null, DEF = null, ROLES = null, CAPS = {};

/* ---------------- login ---------------- */
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault(); const err = $('#li-err'); err.style.display = 'none';
  try {
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: $('#li-email').value, password: $('#li-pass').value }) });
    boot();
  } catch (ex) { err.textContent = 'Invalid credentials.'; err.style.display = 'block'; }
});
$('#logout').addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); location.reload(); });

/* ---------------- forgot password ---------------- */
(function () {
  const link = document.getElementById('li-forgot'), back = document.getElementById('fp-back');
  const lf = document.getElementById('login-form'), ff = document.getElementById('forgot-form');
  if (!link) return;
  link.addEventListener('click', e => { e.preventDefault(); lf.style.display = 'none'; ff.style.display = ''; const em = document.getElementById('li-email'); if (em.value) document.getElementById('fp-email').value = em.value; });
  back.addEventListener('click', e => { e.preventDefault(); ff.style.display = 'none'; lf.style.display = ''; });
  ff.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('fp-msg'); msg.style.display = 'block'; msg.style.color = 'var(--muted,#666)'; msg.textContent = 'Sending…';
    try {
      await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('fp-email').value }) });
    } catch (ex) { }
    msg.style.color = 'var(--green,#15803d)';
    msg.textContent = 'If that email is registered, a secure reset link (valid one hour, one-time use) has been sent. Check your inbox.';
  });
})();

/* ---------------- boot / nav ---------------- */
let ROLE = null;
async function boot() {
  const me = await api('/api/auth/me'); ME = me.user; DEF = me.collections; ROLES = me.roles;
  const role = me.role; ROLE = role; CAPS = me.caps || {};
  // Event Scanners never see the admin panel — send them straight to the capture form.
  if (CAPS.scanner) { location.replace('/admin/scan.html'); return; }
  show('#app');
  $('#side-role').textContent = role.label + ' · ' + ME.name + (CAPS.crmRead && !CAPS.crmWrite ? '' : '');
  const nav = $('#side-nav'); nav.innerHTML = '';
  const add = (key, label) => { const b = el('button', '', label); b.dataset.key = key; b.onclick = () => route(key); nav.appendChild(b); };
  const groupLabel = t => { const d = el('div', 'navgroup', t); nav.appendChild(d); };

  if (role.all || CAPS.crmRead || CAPS.odr) { add('dashboard', '▸ Dashboard'); }
  // Governance
  const gov = ['council', 'advisory', 'secretariat'].filter(c => allowed(c));
  if (gov.length) { groupLabel('Governance'); gov.forEach(c => add('col:' + c, DEF[c].label)); }
  // Content
  const content = ['blogs', 'reports', 'events', 'podcasts', 'social'].filter(c => allowed(c));
  const hasPages = allowed('pages') || CAPS.settings;
  if (content.length || hasPages) {
    groupLabel('Content');
    if (hasPages) add('pagecopy', '✎ Page Content');
    if (hasPages) add('visibility', '👁 Section Visibility');
    if (CAPS.settings) add('pages', '📄 Page Publishing');
    content.forEach(c => add('col:' + c, DEF[c].label));
  }
  // ODR
  if (CAPS.odr) { groupLabel('ODR'); add('col:odr_providers', DEF.odr_providers.label); add('col:odr_resources', DEF.odr_resources.label); add('odr', 'ODR Applications'); }
  // Membership CRM
  if (CAPS.crmRead) { groupLabel('Membership'); add('crm', 'Membership CRM' + (CAPS.crmWrite ? '' : ' (read-only)')); add('scans', '🪪 Scanned Cards'); }
  // Media + analytics
  const util = [];
  if (allowed('media')) util.push(['col:media', DEF.media.label]);
  if (role.all) util.push(['analytics', 'Analytics']);
  if (util.length) { groupLabel('Utilities'); util.forEach(([k, l]) => add(k, l)); }
  // Administration
  const admin = [];
  admin.push(['account', '🔐 Account & Security']);
  if (CAPS.users) admin.push(['users', '👥 Admin Users']);
  if (role.all) admin.push(['scancfg', '🎪 Event Scanner']);
  if (CAPS.users || role.content) admin.push(['audit', '🧾 Audit Log']);
  groupLabel('Administration'); admin.forEach(([k, l]) => add(k, l));

  // Force a password change first if the account was flagged (new user / admin reset).
  if (ME.must_change) { route('account'); return; }
  const first = (role.all || CAPS.crmRead || CAPS.odr) ? 'dashboard'
    : (gov.concat(content)[0] ? 'col:' + gov.concat(content)[0] : 'account');
  route(first);
}
// Mirrors the server's canManage(): never trust this for security — the API re-checks.
function allowed(c) {
  if (!ROLE) return false;
  if (ROLE.all || ROLE.content) return true;
  if (ROLE.editorScoped) return Array.isArray(ME.perms) && ME.perms.includes(c);
  return Array.isArray(ROLE.collections) && ROLE.collections.includes(c);
}

function route(key) {
  document.querySelectorAll('#side-nav button').forEach(b => b.classList.toggle('active', b.dataset.key === key));
  $('#top-actions').innerHTML = '';
  if (key === 'dashboard') return viewDashboard();
  if (key === 'pagecopy') return viewPageContent();
  if (key === 'visibility') return viewVisibility();
  if (key === 'pages') return viewPages();
  if (key === 'crm') return viewCRM();
  if (key === 'odr') return viewODR();
  if (key === 'analytics') return viewAnalytics();
  if (key === 'account') return viewAccount();
  if (key === 'users') return viewUsers();
  if (key === 'audit') return viewAudit();
  if (key === 'scans') return viewScans();
  if (key === 'scancfg') return viewScanConfig();
  if (key.startsWith('col:')) return viewCollection(key.slice(4));
}

/* ---------------- Scanned Cards (CRM roles) ---------------- */
async function viewScans() {
  setTitle('Scanned Cards', 'Visiting cards captured at events — filter, review and export');
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { scans } = await api('/api/crm/scans');
  v.innerHTML = '';
  const bar = el('div', 'panel'); bar.innerHTML = '<div class="panel-body"></div>';
  const b = bar.querySelector('.panel-body'); b.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;align-items:end';
  const evs = Array.from(new Set(scans.map(s => s.event_source).filter(Boolean)));
  const stField = fieldFor('st', 'Email status', 'select', '', false, ['', 'sent', 'queued', 'failed', 'skipped', 'skipped_duplicate']);
  const evField = fieldFor('ev', 'Event', 'select', '', false, [''].concat(evs));
  const apply = el('button', 'btn btn-primary', 'Filter');
  const csv = el('button', 'btn btn-ghost', '⬇ Export CSV');
  csv.onclick = () => { window.open('/api/crm/scans.csv', '_blank'); };
  b.append(evField, stField, apply, csv);
  v.appendChild(bar);
  const listWrap = el('div', ''); v.appendChild(listWrap);
  const render = rows => {
    listWrap.innerHTML = '';
    const p = panel('Captured cards', rows.length + ' record(s)');
    const table = el('div', 'table-wrap');
    table.innerHTML = `<table class="tbl"><thead><tr><th>When</th><th>Contact</th><th>Organisation</th><th>Event</th><th>By</th><th>Email</th><th>Dup</th></tr></thead><tbody></tbody></table>`;
    const tb = table.querySelector('tbody');
    rows.forEach(s => {
      const tr = el('tr');
      const badge = { sent: 'st-ok', queued: 'st-warn', failed: 'st-off', skipped: 'st-warn', skipped_duplicate: 'st-warn' }[s.email_status] || 'st-warn';
      tr.innerHTML = `<td class="muted" style="font-size:.78rem;white-space:nowrap">${esc((s.created_at || '').slice(0, 16).replace('T', ' '))}</td>
        <td><b>${esc(s.contact_name || '—')}</b><br><span class="muted" style="font-size:.78rem">${esc(s.contact_email || '')}</span></td>
        <td>${esc(s.org_name || '—')}</td><td>${esc(s.event_source || '')}</td>
        <td class="muted" style="font-size:.8rem">${esc(s.submitter_email || '')}</td>
        <td><span class="st ${badge}">${esc(s.email_status || '')}</span></td>
        <td>${s.is_duplicate ? '⚠' : ''}</td>`;
      if ((s.email_status === 'failed' || s.email_status === 'queued') && CAPS.crmWrite) {
        const rt = el('button', 'mini', 'Retry email');
        rt.onclick = async () => { rt.textContent = '…'; try { await api('/api/crm/scans/' + s.id + '/retry-email', { method: 'POST' }); viewScans(); } catch (e) { alert(e.message); } };
        tr.lastChild.appendChild(rt);
      }
      tb.appendChild(tr);
    });
    if (!rows.length) p.body.innerHTML = '<p class="muted">No cards captured yet.</p>';
    else { p.body.style.padding = '0'; p.body.appendChild(table); }
    listWrap.appendChild(p.wrap);
  };
  apply.onclick = async () => {
    const q = [];
    const ev = evField.querySelector('[data-k]').value; const st = stField.querySelector('[data-k]').value;
    if (ev) q.push('event=' + encodeURIComponent(ev));
    if (st) q.push('email_status=' + encodeURIComponent(st));
    const r = await api('/api/crm/scans' + (q.length ? '?' + q.join('&') : ''));
    render(r.scans);
  };
  render(scans);
}

/* ---------------- Event Scanner settings (Super Admin) ---------------- */
async function viewScanConfig() {
  setTitle('Event Scanner', 'GFF card-capture settings, event sources and the thank-you email');
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { config } = await api('/api/settings/scan');
  v.innerHTML = '';
  const note = el('p', 'notice', 'Create Event Scanner accounts in Admin Users (role “Event Scanner”). Each scanner signs in and is taken straight to the mobile capture form — they cannot see the CRM or any admin area.');
  v.appendChild(note);
  const p = panel('Capture settings', config.email_configured ? 'Email is configured' : 'Email not configured — thank-yous will queue');
  const form = el('div', 'form');
  const sources = fieldFor('event_sources', 'Event sources (one per line; the first is the default)', 'textarea', (config.event_sources || []).join('\n'));
  const reps = fieldFor('representatives', 'Representatives (one per line, optional)', 'textarea', (config.representatives || []).join('\n'));
  const fromName = fieldFor('email_from_name', 'Email sender name', 'text', config.email_from_name);
  const subject = fieldFor('email_subject', 'Email subject', 'text', config.email_subject);
  const bodyF = fieldFor('email_body', 'Email body', 'textarea', config.email_body);
  const sig = fieldFor('email_signature', 'Email signature', 'textarea', config.email_signature);
  const help = el('p', 'notice', 'Personalisation tokens: {{first_name}}, {{event}}, {{rep}}, {{from_name}}.');
  const save = el('button', 'btn btn-primary', 'Save settings');
  const msg = el('span', 'muted'); msg.style.marginLeft = '10px';
  save.onclick = async () => {
    save.textContent = 'Saving…';
    const payload = {
      event_sources: sources.querySelector('[data-k]').value.split('\n').map(s => s.trim()).filter(Boolean),
      representatives: reps.querySelector('[data-k]').value.split('\n').map(s => s.trim()).filter(Boolean),
      email_from_name: fromName.querySelector('[data-k]').value,
      email_subject: subject.querySelector('[data-k]').value,
      email_body: bodyF.querySelector('[data-k]').value,
      email_signature: sig.querySelector('[data-k]').value,
    };
    try { await api('/api/settings/scan', { method: 'PUT', body: JSON.stringify(payload) }); msg.textContent = 'Saved ✓'; } catch (e) { msg.textContent = e.message; }
    save.textContent = 'Save settings';
  };
  form.append(sources, reps, fromName, subject, bodyF, sig, help, save, msg);
  p.body.appendChild(form); v.appendChild(p.wrap);

  // Test email
  const tp = panel('Send a test email', 'Verify your SMTP settings and template');
  const tform = el('div', 'form');
  const to = fieldFor('to', 'Send test to', 'email', ME.email);
  const tb = el('button', 'btn btn-ghost', 'Send test email');
  const tmsg = el('span', 'muted'); tmsg.style.marginLeft = '10px';
  tb.onclick = async () => {
    tb.textContent = 'Sending…'; tmsg.textContent = '';
    try {
      const r = await fetch('/api/settings/scan/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: to.querySelector('[data-k]').value }) });
      const j = await r.json().catch(() => ({}));
      tmsg.textContent = j.message || (r.ok ? 'Sent' : 'Failed');
    } catch (e) { tmsg.textContent = e.message; }
    tb.textContent = 'Send test email';
  };
  tform.append(to, tb, tmsg); tp.body.appendChild(tform); v.appendChild(tp.wrap);
}

/* ---------------- Dashboard ---------------- */
async function viewDashboard() {
  setTitle('Dashboard', 'Overview of membership, renewals and pipeline');
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  let d = {};
  try { d = await api('/api/crm/dashboard'); } catch (e) { }
  let a = {};
  if (ME && ROLES[ME.role].all) { try { a = await api('/api/analytics/summary'); } catch (e) { } }
  v.innerHTML = '';
  const stats = el('div', 'stat-grid');
  const S = (b, s, cls) => { const x = el('div', 'stat ' + (cls || '')); x.innerHTML = `<b>${b}</b><span>${s}</span>`; return x; };
  stats.append(
    S(d.active ?? '—', 'Active members', 'green'),
    S(d.expiring ?? '—', 'Expiring soon', 'accent'),
    S(d.overdue ?? '—', 'Overdue renewals'),
    S(d.pending_apps ?? '—', 'Pending applications'),
    S('₹' + fmt(d.revenue_due || 0), 'Revenue due'),
    S(d.live_logos ?? '—', 'Live member logos', 'green'),
  );
  v.appendChild(stats);

  if (d.tasks) {
    const p = panel('Team tasks', '');
    if (!d.tasks.length) p.body.innerHTML = '<p class="muted">No open tasks.</p>';
    d.tasks.forEach(t => p.body.appendChild(row({ title: esc(t.title), sub: 'Due ' + esc(t.due || '—') })));
    v.appendChild(p.wrap);
  }
  if (d.emails) {
    const p = panel('Email automation outbox', 'Renewal reminders & notices queued for the ESP');
    if (!d.emails.length) p.body.innerHTML = '<p class="muted">No emails queued.</p>';
    d.emails.forEach(e => p.body.appendChild(row({ title: esc(e.subject), sub: '→ ' + esc(e.to_addr) + ' · ' + esc(e.template) })));
    v.appendChild(p.wrap);
  }
  if (a.events) {
    const p = panel('Analytics', 'Captured events');
    a.events.forEach(ev => p.body.appendChild(row({ title: esc(ev.event), sub: ev.c + ' events' })));
    p.body.appendChild(row({ title: 'Newsletter sign-ups', sub: (a.newsletter || 0) + '' }));
    p.body.appendChild(row({ title: 'Contact messages', sub: (a.messages || 0) + '' }));
    v.appendChild(p.wrap);
  }
}

/* ---------------- Page Content (editable copy) ---------------- */
async function viewPageContent() {
  setTitle('Page Content', 'Edit the words on the live public pages — no code needed');
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { groups } = await api('/api/pagecopy');
  v.innerHTML = '';
  const order = ['global', 'home', 'about', 'approach', 'programmes', 'odr_support', 'membership', 'funding', 'reports', 'podcasts', 'blogs', 'contact'];
  const names = Object.keys(groups).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const pretty = s => s === 'global' ? 'Global (header, footer, CTA)' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  names.forEach(pg => {
    const p = panel(pretty(pg), groups[pg].length + ' editable block(s)');
    groups[pg].forEach(f => {
      const wrap = el('div', 'field');
      const edited = f.value && f.value !== f.default;
      wrap.innerHTML = `<label>${esc(f.label)} ${edited ? '<span class="st st-ok" style="font-size:.65rem">edited</span>' : ''}
        <span class="muted" style="font-weight:400;font-size:.75rem">· ${esc(f.key)}</span></label>`;
      const ctrl = f.multiline ? el('textarea', 'textarea') : el('input', 'input');
      ctrl.value = f.value || f.default;
      wrap.appendChild(ctrl);
      const bar = el('div', 'row-actions', ''); bar.style.marginTop = '8px';
      const save = el('button', 'mini primary', 'Save'); const reset = el('button', 'mini', 'Reset to default');
      const note = el('span', 'muted', ''); note.style.fontSize = '.8rem'; note.style.marginLeft = '8px';
      save.onclick = async () => { save.textContent = 'Saving…'; await api('/api/pagecopy/' + encodeURIComponent(f.key), { method: 'PUT', body: JSON.stringify({ value: ctrl.value }) }); save.textContent = 'Saved ✓'; note.textContent = 'Live on the site now.'; setTimeout(() => save.textContent = 'Save', 1500); };
      reset.onclick = async () => { await api('/api/pagecopy/' + encodeURIComponent(f.key), { method: 'PUT', body: JSON.stringify({ value: '' }) }); ctrl.value = f.default; note.textContent = 'Reset to default.'; };
      bar.append(save, reset, note); wrap.appendChild(bar);
      p.body.appendChild(wrap);
      const hr = el('hr', 'divider'); hr.style.margin = '18px 0'; p.body.appendChild(hr);
    });
    v.appendChild(p.wrap);
  });
  if (!names.length) v.innerHTML = '<p class="muted">No editable content registry found. Run <code>python3 build.py</code> to generate it.</p>';
}

/* ---------------- Visibility (hide links for sections not yet live) ---------------- */
async function viewVisibility() {
  setTitle('Visibility', 'Hide menu links for sections you have not published yet');
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { sections } = await api('/api/settings/visibility');
  v.innerHTML = '';
  const p = panel('Public sections', 'Turn a section off to remove its links from the menu, footer and Knowledge Hub until you are ready.');
  sections.forEach(s => {
    const r = el('div', 'item-row');
    r.innerHTML = `<div class="grow"><b>${esc(s.label)}</b><span>${s.visible ? 'Shown on the site' : 'Hidden from the site'}</span></div>`;
    const wrap = el('label', ''); wrap.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:.85rem;cursor:pointer';
    const cb = el('input', ''); cb.type = 'checkbox'; cb.checked = s.visible; cb.style.cssText = 'width:18px;height:18px;accent-color:var(--green)';
    const txt = el('span', '', s.visible ? 'Visible' : 'Hidden');
    cb.onchange = async () => {
      await api('/api/settings/visibility/' + s.key, { method: 'PUT', body: JSON.stringify({ visible: cb.checked }) });
      txt.textContent = cb.checked ? 'Visible' : 'Hidden';
      r.querySelector('.grow span').textContent = cb.checked ? 'Shown on the site' : 'Hidden from the site';
    };
    wrap.append(cb, txt); r.appendChild(wrap); p.body.appendChild(r);
  });
  p.body.appendChild(el('p', 'notice', 'Changes apply to the live public site immediately (a visitor refresh shows them). The page itself still exists — this only hides the links to it.'));
  v.appendChild(p.wrap);
}

/* ---------------- Collections ---------------- */
async function viewCollection(name) {
  const def = DEF[name]; setTitle(def.label, statusHelp(def));
  const btn = el('button', 'btn btn-primary', '+ New'); btn.onclick = () => editEntry(name, null); $('#top-actions').innerHTML = ''; $('#top-actions').appendChild(btn);
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { items } = await api('/api/collections/' + name);
  v.innerHTML = '';
  const p = panel(def.label, items.length + ' item(s)');
  if (!items.length) p.body.innerHTML = '<p class="muted">Nothing yet. Click “+ New”.</p>';
  items.forEach(it => {
    const title = it.data.name || it.data.title || it.data.page || it.data.filename || it.data.platform || ('#' + it.id);
    const sub = [it.data.role || it.data.category || it.data.designation || it.data.guest || '', statusBadge(it.status)].filter(Boolean).join(' · ');
    const r = row({ title: esc(title), sub, thumb: it.data.photo || it.data.cover || it.data.logo || it.data.file });
    const ed = el('button', 'mini', 'Edit'); ed.onclick = () => editEntry(name, it);
    const del = el('button', 'mini danger', 'Delete'); del.onclick = () => delEntry(name, it.id);
    r.querySelector('.row-actions').append(ed, del);
    p.body.appendChild(r);
  });
  v.appendChild(p.wrap);
}
function statusHelp(def) {
  return { editorial: 'Draft → Review → Published → Archived', publish: 'Draft / Published', active: 'Active / Inactive' }[def.status_set] || '';
}
function statusOptions(def) {
  return { editorial: ['draft', 'review', 'published', 'archived'], publish: ['draft', 'published'], active: ['active', 'inactive'] }[def.status_set] || ['draft', 'published'];
}
function editEntry(name, it) {
  const def = DEF[name];
  const data = it ? Object.assign({}, it.data) : {};
  const body = el('div', 'form');
  def.fields.forEach(([k, label, type, req]) => body.appendChild(fieldFor(k, label, type, data[k], req)));
  // order + status
  if (def.order) body.appendChild(fieldFor('__order', 'Display order', 'number', it ? it.display_order : 0));
  const statusSel = el('div', 'field'); statusSel.innerHTML = `<label>Status</label>`;
  const sel = el('select', 'select'); statusOptions(def).forEach(o => { const op = el('option', '', o); if ((it && it.status) === o) op.selected = true; sel.appendChild(op); });
  const canPub = ROLES[ME.role].all || ROLES[ME.role].publish !== false;
  if (!canPub) Array.from(sel.options).forEach(o => { if (['published', 'active'].includes(o.value)) o.disabled = true; });
  statusSel.appendChild(sel); body.appendChild(statusSel);
  if (!canPub) body.appendChild(el('p', 'notice', 'Your role can save drafts/review only — publishing needs an admin.'));

  openModal(it ? 'Edit ' + def.label : 'New ' + def.label, body, async () => {
    const out = {};
    def.fields.forEach(([k, , type]) => { const inp = body.querySelector(`[data-k="${k}"]`); out[k] = type === 'bool' ? inp.checked : inp.value; });
    const payload = { data: out, status: sel.value };
    if (def.order) payload.display_order = Number(body.querySelector('[data-k="__order"]').value) || 0;
    if (it) await api(`/api/collections/${name}/${it.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await api('/api/collections/' + name, { method: 'POST', body: JSON.stringify(payload) });
    closeModal(); viewCollection(name);
  });
}
async function delEntry(name, id) { if (!confirmBox('Delete this item?')) return; await api(`/api/collections/${name}/${id}`, { method: 'DELETE' }); viewCollection(name); }

/* ---------------- Membership CRM ---------------- */
async function viewCRM() {
  setTitle('Membership CRM', 'Organisations, contacts, invoicing and renewal automation');
  const btn = el('button', 'btn btn-primary', '+ New organisation'); btn.onclick = () => editOrg(null); $('#top-actions').innerHTML = ''; $('#top-actions').appendChild(btn);
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { organisations } = await api('/api/crm/organisations');
  v.innerHTML = '';
  const p = panel('Members & applicants', organisations.length + ' record(s)');
  const table = el('div', 'table-wrap'); table.innerHTML = `<table class="tbl"><thead><tr>
    <th>Organisation</th><th>Category</th><th>Membership</th><th>Payment</th><th>Website</th><th>Ends</th><th></th></tr></thead><tbody></tbody></table>`;
  const tb = table.querySelector('tbody');
  organisations.forEach(o => {
    const tr = el('tr');
    tr.innerHTML = `<td><b>${esc(o.brand_name || o.legal_name || '—')}</b><br><span class="muted" style="font-size:.8rem">${esc(o.legal_name || '')}</span></td>
      <td>${esc(o.category || '—')}</td>
      <td>${crmBadge(o.membership_status)}</td>
      <td>${crmBadge(o.payment_status)}</td>
      <td>${esc(o.website_display_status || '—')}${o.secretariat_hidden ? ' 🚫' : ''}</td>
      <td>${esc(o.end_date || '—')}</td><td></td>`;
    const b = el('button', 'mini primary', 'Manage'); b.onclick = () => editOrg(o); tr.lastChild.appendChild(b);
    tb.appendChild(tr);
  });
  p.body.style.padding = '0'; p.body.appendChild(table); v.appendChild(p.wrap);
}
function editOrg(o) {
  const isNew = !o; o = o || {};
  const body = el('div', 'form');
  const F = (k, l, t, opts) => body.appendChild(fieldFor(k, l, t, o[k], false, opts));
  F('legal_name', 'Legal entity name', 'text'); F('brand_name', 'Brand / display name', 'text');
  F('category', 'Membership category', 'select', ['Lenders', 'Fintechs', 'Infrastructure', 'Anchors', 'Ecosystem Institutions', 'ODR Providers', 'Donors & Funding Partners']);
  F('industry', 'Industry type', 'text'); F('website', 'Website', 'url');
  F('address', 'Registered address', 'textarea'); F('gstin_pan', 'GSTIN / PAN', 'text');
  body.appendChild(logoField(o.logo)); F('logo_consent', 'Logo display consent', 'bool');
  if (!isNew) {
    body.appendChild(el('hr', 'divider'));
    F('membership_status', 'Membership status', 'select', ['Prospect', 'Applied', 'Approved', 'Invoice Sent', 'Paid', 'Active', 'Expiring', 'Expired', 'Cancelled']);
    F('website_display_status', 'Website display status', 'select', ['Draft', 'Pending Payment', 'Paid and Live', 'Hidden']);
    F('secretariat_hidden', 'Secretariat override: hide logo', 'bool');
    F('start_date', 'Membership start date', 'date'); F('end_date', 'End date (auto = start + 1yr)', 'date');
    F('fee', 'Membership fee (₹)', 'number');
    F('invoice_number', 'Invoice number', 'text'); F('invoice_date', 'Invoice date', 'date');
    F('payment_status', 'Payment status', 'select', ['Unpaid', 'Paid', 'Overdue']);
    F('payment_date', 'Payment date', 'date');
    F('notes', 'Notes', 'textarea');
    body.appendChild(el('p', 'notice', 'Automations: end date = start + 1 year · Paid → Active + Paid and Live · expiry & overrides remove the public logo automatically · reminders at 30/15/7/0 days.'));
  }
  openModal(isNew ? 'New organisation' : 'Manage: ' + (o.brand_name || o.legal_name), body, async () => {
    const out = {};
    body.querySelectorAll('[data-k]').forEach(inp => { const k = inp.dataset.k; out[k] = inp.type === 'checkbox' ? (inp.checked ? 1 : 0) : inp.value; });
    if (isNew) await api('/api/crm/organisations', { method: 'POST', body: JSON.stringify(out) });
    else await api('/api/crm/organisations/' + o.id, { method: 'PUT', body: JSON.stringify(out) });
    closeModal(); viewCRM();
  }, isNew ? null : contactsPanel(o));
}
function contactsPanel(o) {
  const wrap = el('div', '', '<hr class="divider" style="margin:18px 0"><h4 style="font-family:var(--font-display)">Contacts</h4>');
  const list = el('div', ''); wrap.appendChild(list);
  (o.contacts || []).forEach(c => {
    const r = row({ title: esc(c.name || '—') + (c.is_primary ? ' ★' : ''), sub: esc(c.type || '') + ' · ' + esc(c.email || '') + ' · ' + esc(c.phone || '') });
    const del = el('button', 'mini danger', 'Remove'); del.onclick = async () => { await api('/api/crm/contacts/' + c.id, { method: 'DELETE' }); closeModal(); editOrg(await refreshOrg(o.id)); };
    r.querySelector('.row-actions').appendChild(del); list.appendChild(r);
  });
  const add = el('div', 'form', '<div class="notice">Add contact</div>');
  const t = fieldFor('type', 'Type', 'select', 'CEO / authorised signatory', false, ['CEO / authorised signatory', 'Marketing SPOC', 'Technology SPOC', 'Finance SPOC', 'Partnerships / programme SPOC', 'Other contact']);
  const n = fieldFor('name', 'Name', 'text'); const em = fieldFor('email', 'Email', 'email'); const ph = fieldFor('phone', 'Phone', 'text'); const pr = fieldFor('is_primary', 'Primary contact', 'bool');
  add.append(t, n, em, ph, pr);
  const b = el('button', 'btn btn-ghost', 'Add contact'); b.type = 'button';
  b.onclick = async () => {
    await api('/api/crm/organisations/' + o.id + '/contacts', { method: 'POST', body: JSON.stringify({
      type: t.querySelector('[data-k]').value, name: n.querySelector('[data-k]').value, email: em.querySelector('[data-k]').value,
      phone: ph.querySelector('[data-k]').value, is_primary: pr.querySelector('[data-k]').checked }) });
    closeModal(); editOrg(await refreshOrg(o.id));
  };
  add.appendChild(b); wrap.appendChild(add); return wrap;
}
async function refreshOrg(id) { const { organisations } = await api('/api/crm/organisations'); return organisations.find(x => x.id === id); }

// Member logo: upload a file (or paste a URL). The hidden text input carries data-k="logo".
function logoField(current) {
  const f = el('div', 'field');
  f.innerHTML = `<label>Member logo <span class="muted" style="font-weight:400;font-size:.78rem">· upload a PNG/SVG, or paste a URL</span></label>`;
  const preview = el('div', ''); preview.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:8px';
  const img = el('img', ''); img.style.cssText = 'height:40px;max-width:150px;object-fit:contain;background:var(--sand);border:1px solid var(--line);border-radius:8px;padding:4px' + (current ? '' : ';display:none');
  if (current) img.src = current;
  const status = el('span', 'muted'); status.style.fontSize = '.82rem';
  preview.append(img, status);
  const url = el('input', 'input'); url.setAttribute('data-k', 'logo'); url.value = current || ''; url.placeholder = '/uploads/… or https://…';
  url.addEventListener('input', () => { if (url.value) { img.src = url.value; img.style.display = ''; } });
  const file = el('input', 'input'); file.type = 'file'; file.accept = 'image/*'; file.style.marginBottom = '8px';
  file.addEventListener('change', async () => {
    if (!file.files[0]) return;
    status.textContent = 'Uploading…';
    const fd = new FormData(); fd.append('file', file.files[0]);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (j.url) { url.value = j.url; img.src = j.url; img.style.display = ''; status.textContent = 'Uploaded ✓'; }
      else status.textContent = 'Upload failed';
    } catch (e) { status.textContent = 'Upload failed'; }
  });
  f.append(preview, file, url);
  return f;
}

/* ---------------- ODR applications ---------------- */
async function viewODR() {
  setTitle('ODR Applications', 'Cases submitted for support');
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { applications } = await api('/api/odr/applications');
  v.innerHTML = '';
  const p = panel('Applications', applications.length + ' case(s)');
  if (!applications.length) p.body.innerHTML = '<p class="muted">No applications yet.</p>';
  applications.forEach(a => {
    const r = row({ title: esc(a.enterprise || a.applicant || '#' + a.id), sub: `${esc(a.counterparty || '')} · ₹${fmt(a.amount || 0)} · ${statusBadge(a.status)}` });
    const sel = el('select', 'mini'); ['Received', 'Screening', 'Case preparation', 'Referred', 'Closed'].forEach(s => { const o = el('option', '', s); if (a.status === s) o.selected = true; sel.appendChild(o); });
    sel.onchange = async () => { await api('/api/odr/applications/' + a.id, { method: 'PUT', body: JSON.stringify({ status: sel.value }) }); };
    r.querySelector('.row-actions').appendChild(sel); p.body.appendChild(r);
  });
  v.appendChild(p.wrap);
}

/* ---------------- Analytics ---------------- */
async function viewAnalytics() {
  setTitle('Analytics', 'Applications, redirects, downloads, engagement');
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const a = await api('/api/analytics/summary'); v.innerHTML = '';
  const p = panel('Events', ''); a.events.forEach(e => p.body.appendChild(row({ title: esc(e.event), sub: e.c + ' events' })));
  p.body.appendChild(row({ title: 'Newsletter sign-ups', sub: a.newsletter + '' }));
  p.body.appendChild(row({ title: 'Contact messages', sub: a.messages + '' }));
  v.appendChild(p.wrap);
}

/* ---------------- Account & Security (change password) ---------------- */
async function viewAccount() {
  setTitle('Account & Security', 'Change your password — we never store or email your existing password');
  const v = $('#view'); v.innerHTML = '';
  if (ME.must_change) {
    const warn = el('p', 'notice');
    warn.style.cssText = 'background:#fff7ed;border-color:#fed7aa;color:#9a3412';
    warn.textContent = 'For your security, please set a new password before continuing. A temporary password was set by an administrator or on first login.';
    v.appendChild(warn);
  }
  const p = panel('Change password', 'Signed in as ' + esc(ME.email));
  const form = el('div', 'form');
  const cur = fieldFor('current', 'Current password', 'password');
  const nx = fieldFor('next', 'New password', 'password');
  const cf = fieldFor('confirm', 'Confirm new password', 'password');
  const help = el('p', 'notice', 'Minimum 12 characters, including at least one letter and one number, and must not contain your email name.');
  const msg = el('p', ''); msg.style.cssText = 'font-size:.85rem;margin-top:8px;display:none';
  const btn = el('button', 'btn btn-primary', 'Update password'); btn.style.marginTop = '8px';
  btn.onclick = async () => {
    msg.style.display = 'none';
    const current = cur.querySelector('[data-k]').value;
    const next = nx.querySelector('[data-k]').value;
    const confirm = cf.querySelector('[data-k]').value;
    if (next !== confirm) { msg.style.display = 'block'; msg.style.color = 'var(--danger,#b91c1c)'; msg.textContent = 'New password and confirmation do not match.'; return; }
    try {
      btn.textContent = 'Updating…'; btn.disabled = true;
      await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ current, next, confirm }) });
      msg.style.display = 'block'; msg.style.color = 'var(--green,#15803d)';
      msg.textContent = 'Password updated. All your other sessions have been signed out.';
      ME.must_change = 0;
      cur.querySelector('[data-k]').value = nx.querySelector('[data-k]').value = cf.querySelector('[data-k]').value = '';
    } catch (e) { msg.style.display = 'block'; msg.style.color = 'var(--danger,#b91c1c)'; msg.textContent = e.message; }
    finally { btn.textContent = 'Update password'; btn.disabled = false; }
  };
  form.append(cur, nx, cf, help, btn, msg);
  p.body.appendChild(form); v.appendChild(p.wrap);

  const info = panel('Forgot your password?', '');
  info.body.innerHTML = '<p class="muted" style="font-size:.9rem">If you are ever locked out, use the “Forgot password?” link on the sign-in screen. We send a single-use link that expires in one hour and never reveal or email your existing password — it can only be securely reset.</p>';
  v.appendChild(info.wrap);
}

/* ---------------- Page Publishing (hide/show whole pages) ---------------- */
async function viewPages() {
  setTitle('Page Publishing', 'Publish or hide entire pages. A hidden page returns 404 and its links are removed from the public site — the content is kept in the CMS.');
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { pages } = await api('/api/settings/pages');
  v.innerHTML = '';
  const p = panel('Public pages', pages.length + ' page(s)');
  pages.forEach(pg => {
    const r = el('div', 'item-row');
    r.innerHTML = `<div class="grow"><b>${esc(pg.label)}</b><span>${pg.published ? 'Published — live at /' + esc(pg.slug) + '.html' : 'Hidden — direct access returns 404'}</span></div>`;
    const wrap = el('label', ''); wrap.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:.85rem;cursor:pointer';
    const cb = el('input', ''); cb.type = 'checkbox'; cb.checked = pg.published; cb.style.cssText = 'width:18px;height:18px;accent-color:var(--green)';
    const txt = el('span', '', pg.published ? 'Published' : 'Hidden');
    cb.onchange = async () => {
      cb.disabled = true;
      try {
        await api('/api/settings/pages/' + encodeURIComponent(pg.slug), { method: 'PUT', body: JSON.stringify({ published: cb.checked }) });
        txt.textContent = cb.checked ? 'Published' : 'Hidden';
        r.querySelector('.grow span').textContent = cb.checked ? 'Published — live at /' + pg.slug + '.html' : 'Hidden — direct access returns 404';
      } catch (e) { cb.checked = !cb.checked; alert(e.message); }
      finally { cb.disabled = false; }
    };
    wrap.append(cb, txt); r.appendChild(wrap); p.body.appendChild(r);
  });
  p.body.appendChild(el('p', 'notice', 'Hiding a page removes it from the public site immediately: the page URL returns 404 and menu/button/text links to it are dropped. Nothing is deleted — re-publish any time to restore it.'));
  v.appendChild(p.wrap);
}

/* ---------------- Admin Users (Super Admin) ---------------- */
async function viewUsers() {
  setTitle('Admin Users', 'Add, edit, deactivate or delete admin accounts and assign roles & page-level permissions');
  let META = null;
  const btn = el('button', 'btn btn-primary', '+ New admin user'); btn.onclick = () => editUser(null, META);
  $('#top-actions').innerHTML = ''; $('#top-actions').appendChild(btn);
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { users, roles, collections, pages, sections } = await api('/api/users');
  const meta = { roles, collections, pages: pages || [], sections: sections || [] }; META = meta;
  const pageLabel = {}; (pages || []).forEach(p => pageLabel['page:' + p.slug] = p.label);
  const secLabel = {}; (sections || []).forEach(s => secLabel['sec:' + s.key] = s.label);
  const permLabel = x => (DEF[x] && DEF[x].label) || pageLabel[x] || secLabel[x] || x;
  v.innerHTML = '';
  const p = panel('Admin accounts', users.length + ' user(s)');
  const table = el('div', 'table-wrap');
  table.innerHTML = `<table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Scope</th><th>Status</th><th></th></tr></thead><tbody></tbody></table>`;
  const tb = table.querySelector('tbody');
  users.forEach(u => {
    const roleLabel = (roles[u.role] && roles[u.role].label) || u.role;
    const scope = (roles[u.role] && roles[u.role].editorScoped)
      ? ((u.perms && u.perms.length) ? u.perms.map(permLabel).join(', ') : 'none assigned')
      : '—';
    const tr = el('tr');
    tr.innerHTML = `<td><b>${esc(u.name)}</b>${u.id === ME.id ? ' <span class="muted">(you)</span>' : ''}</td>
      <td>${esc(u.email)}</td><td>${esc(roleLabel)}</td>
      <td class="muted" style="font-size:.82rem">${esc(scope)}</td>
      <td>${u.active ? '<span class="st st-ok">Active</span>' : '<span class="st st-off">Deactivated</span>'}</td><td></td>`;
    const cell = tr.lastChild;
    const ed = el('button', 'mini primary', 'Edit'); ed.onclick = () => editUser(u, meta);
    cell.appendChild(ed);
    if (u.id !== ME.id) {
      const tog = el('button', 'mini', u.active ? 'Deactivate' : 'Reactivate');
      tog.onclick = async () => {
        if (u.active && !confirmBox('Deactivate ' + u.email + '? They will be signed out and cannot log in until reactivated.')) return;
        await api('/api/users/' + u.id, { method: 'PUT', body: JSON.stringify({ active: !u.active }) });
        viewUsers();
      };
      const del = el('button', 'mini danger', 'Delete');
      del.onclick = async () => {
        if (!confirmBox('Permanently delete ' + u.email + '? This cannot be undone. Consider deactivating instead.')) return;
        try { await api('/api/users/' + u.id, { method: 'DELETE' }); viewUsers(); } catch (e) { alert(e.message); }
      };
      cell.append(tog, del);
    }
    tb.appendChild(tr);
  });
  p.body.style.padding = '0'; p.body.appendChild(table); v.appendChild(p.wrap);
  v.appendChild(el('p', 'notice', 'Deactivating keeps the account and its history but blocks sign-in — preferred over deletion. The last active Super Admin cannot be deleted, and you cannot delete or deactivate your own account.'));
}

function editUser(u, meta) {
  const isNew = !u;
  const roles = (meta && meta.roles) || ROLES;
  const collections = (meta && meta.collections) || Object.keys(DEF);
  const body = el('div', 'form');
  const name = fieldFor('name', 'Full name', 'text', u ? u.name : '');
  const email = fieldFor('email', 'Email', 'email', u ? u.email : '');
  if (!isNew) email.querySelector('[data-k]').disabled = true;
  // Role selector
  const roleWrap = el('div', 'field'); roleWrap.innerHTML = '<label>Role</label>';
  const roleSel = el('select', 'select');
  Object.keys(roles).forEach(rk => { const o = el('option', '', roles[rk].label + ' (' + rk + ')'); o.value = rk; if (u && u.role === rk) o.selected = true; roleSel.appendChild(o); });
  if (isNew) roleSel.value = 'editor';
  roleWrap.appendChild(roleSel);
  // Password
  const pw = fieldFor('password', isNew ? 'Temporary password' : 'Reset password (leave blank to keep)', 'password', '');
  const pwHelp = el('p', 'notice', 'Min 12 chars, a letter and a number, not containing the email name. The user is required to change it at next sign-in.');
  // Per-item permissions (only meaningful for the Editor / editorScoped role).
  const pages = (meta && meta.pages) || [];
  const sections = (meta && meta.sections) || [];
  const curPerms = (u && u.perms) || [];
  const permsWrap = el('div', 'field');
  permsWrap.innerHTML = '<label>Assigned access <span class="muted" style="font-weight:400;font-size:.78rem">· Editor role only — the backend enforces exactly these</span></label>';
  const permsBox = el('div', '');
  const group = (title, items, valueOf, labelOf) => {
    if (!items.length) return;
    permsBox.appendChild(el('div', 'muted', title)).style.cssText = 'font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 4px';
    const grid = el('div', ''); grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px';
    items.forEach(it => {
      const val = valueOf(it);
      const lab = el('label', ''); lab.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:.85rem';
      const cb = el('input', ''); cb.type = 'checkbox'; cb.value = val; cb.checked = curPerms.includes(val); cb.dataset.perm = val;
      lab.append(cb, document.createTextNode(labelOf(it))); grid.appendChild(lab);
    });
    permsBox.appendChild(grid);
  };
  group('Content types', collections, c => c, c => (DEF[c] && DEF[c].label) || c);
  group('Pages (content + publish/hide)', pages, p => 'page:' + p.slug, p => p.label);
  group('Sections (visibility)', sections, s => 'sec:' + s.key, s => s.label);
  permsWrap.appendChild(permsBox);
  const syncPerms = () => { const scoped = roles[roleSel.value] && roles[roleSel.value].editorScoped; permsWrap.style.display = scoped ? '' : 'none'; };
  roleSel.onchange = syncPerms;
  body.append(name, email, roleWrap, pw, pwHelp, permsWrap); syncPerms();

  openModal(isNew ? 'New admin user' : 'Edit: ' + u.email, body, async () => {
    const payload = {
      name: name.querySelector('[data-k]').value,
      role: roleSel.value,
      perms: Array.from(permsBox.querySelectorAll('input[type=checkbox]')).filter(x => x.checked).map(x => x.value),
    };
    const pwv = pw.querySelector('[data-k]').value;
    if (isNew) { payload.email = email.querySelector('[data-k]').value; payload.password = pwv; await api('/api/users', { method: 'POST', body: JSON.stringify(payload) }); }
    else { if (pwv) payload.password = pwv; await api('/api/users/' + u.id, { method: 'PUT', body: JSON.stringify(payload) }); }
    closeModal(); viewUsers();
  });
}

/* ---------------- Audit Log ---------------- */
async function viewAudit() {
  setTitle('Audit Log', 'Who changed what, and when — the 200 most recent actions');
  const v = $('#view'); v.innerHTML = '<p class="muted">Loading…</p>';
  const { audit } = await api('/api/audit');
  v.innerHTML = '';
  const p = panel('Recent activity', audit.length + ' record(s)');
  const table = el('div', 'table-wrap');
  table.innerHTML = `<table class="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead><tbody></tbody></table>`;
  const tb = table.querySelector('tbody');
  const pretty = a => esc(String(a || '').replace(/_/g, ' '));
  audit.forEach(a => {
    const tr = el('tr');
    const when = a.created_at ? new Date(a.created_at).toLocaleString() : '—';
    tr.innerHTML = `<td class="muted" style="font-size:.8rem;white-space:nowrap">${esc(when)}</td>
      <td>${esc(a.actor_email || 'system')}</td>
      <td>${pretty(a.action)}</td>
      <td class="muted" style="font-size:.82rem">${esc(a.entity || '')}${a.entity_id ? ' #' + esc(a.entity_id) : ''}</td>
      <td class="muted" style="font-size:.82rem">${esc(a.detail || '')}</td>`;
    tb.appendChild(tr);
  });
  if (!audit.length) p.body.innerHTML = '<p class="muted">No activity recorded yet.</p>';
  else { p.body.style.padding = '0'; p.body.appendChild(table); }
  v.appendChild(p.wrap);
}

/* ---------------- UI helpers ---------------- */
function setTitle(t, s) { $('#view-title').textContent = t; $('#view-sub').textContent = s || ''; }
function panel(title, sub) { const wrap = el('div', 'panel'); wrap.innerHTML = `<div class="panel-head"><div><h3>${esc(title)}</h3></div><span class="muted" style="font-size:.85rem">${esc(sub || '')}</span></div><div class="panel-body"></div>`; return { wrap, body: wrap.querySelector('.panel-body') }; }
function row(o) { const r = el('div', 'item-row'); r.innerHTML = `<div class="thumbx">${o.thumb ? `<img src="${esc(o.thumb)}" onerror="this.style.display='none'">` : (o.title || '?').slice(0, 1)}</div><div class="grow"><b>${o.title}</b><span>${o.sub || ''}</span></div><div class="row-actions"></div>`; return r; }
function fieldFor(k, label, type, val, req, opts) {
  const f = el('div', 'field'); const id = 'f_' + k + '_' + Math.random().toString(36).slice(2, 6);
  let ctrl;
  if (type === 'textarea' || type === 'richtext') ctrl = `<textarea class="textarea" data-k="${k}" id="${id}">${esc(val)}</textarea>`;
  else if (type === 'bool') ctrl = `<label class="checkrow"><input type="checkbox" data-k="${k}" id="${id}" ${val ? 'checked' : ''}> ${esc(label)}</label>`;
  else if (type === 'select') ctrl = `<select class="select" data-k="${k}" id="${id}">${(opts || []).map(o => `<option ${o == val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (type === 'file') ctrl = `<input class="input" data-k="${k}" id="${id}" value="${esc(val)}" placeholder="/uploads/… or paste a URL"><div class="notice" style="margin-top:6px">Media library / upload endpoint: POST /api/upload</div>`;
  else ctrl = `<input class="input" type="${type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'email' ? 'email' : type === 'url' ? 'url' : type === 'password' ? 'password' : 'text'}" data-k="${k}" id="${id}" value="${esc(val)}"${type === 'password' ? ' autocomplete="new-password"' : ''}>`;
  f.innerHTML = type === 'bool' ? ctrl : `<label for="${id}">${esc(label)}${req ? ' <span class="req">*</span>' : ''}</label>${ctrl}`;
  return f;
}
function statusBadge(s) { const map = { published: 'st-ok', active: 'st-ok', draft: 'st-warn', review: 'st-warn', archived: 'st-off', inactive: 'st-off' }; return `<span class="st ${map[s] || 'st-warn'}">${esc(s || 'draft')}</span>`; }
function crmBadge(s) { const ok = ['Active', 'Paid', 'Approved']; const bad = ['Expired', 'Cancelled', 'Overdue', 'Unpaid']; const cls = ok.includes(s) ? 'st-ok' : bad.includes(s) ? 'st-off' : 'st-warn'; return `<span class="st ${cls}">${esc(s || '—')}</span>`; }
function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }

let modalSave = null;
function openModal(title, body, onSave, extra) {
  $('#modal-title').textContent = title; const mb = $('#modal-body'); mb.innerHTML = ''; mb.appendChild(body); if (extra) mb.appendChild(extra);
  const foot = $('#modal-foot'); foot.innerHTML = '';
  const cancel = el('button', 'btn btn-ghost', 'Cancel'); cancel.onclick = closeModal;
  const save = el('button', 'btn btn-primary', 'Save'); save.onclick = async () => { try { save.textContent = 'Saving…'; await onSave(); } catch (e) { alert(e.message); save.textContent = 'Save'; } };
  foot.append(cancel, save); $('#modal').style.display = 'grid';
}
function closeModal() { $('#modal').style.display = 'none'; }
$('#modal-close').addEventListener('click', closeModal);
function confirmBox(m) { return window.confirm(m); }

/* start */
boot().catch(() => show('#login'));
