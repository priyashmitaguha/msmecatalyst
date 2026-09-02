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

let ME = null, DEF = null, ROLES = null;

/* ---------------- login ---------------- */
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault(); const err = $('#li-err'); err.style.display = 'none';
  try {
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: $('#li-email').value, password: $('#li-pass').value }) });
    boot();
  } catch (ex) { err.textContent = 'Invalid credentials.'; err.style.display = 'block'; }
});
$('#logout').addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); location.reload(); });

/* ---------------- boot / nav ---------------- */
async function boot() {
  const me = await api('/api/auth/me'); ME = me.user; DEF = me.collections; ROLES = me.roles;
  const role = me.role; show('#app');
  $('#side-role').textContent = role.label + ' · ' + ME.name;
  const nav = $('#side-nav'); nav.innerHTML = '';
  const add = (key, label, group) => { const b = el('button', '', label); b.dataset.key = key; b.onclick = () => route(key); nav.appendChild(b); };
  const groupLabel = t => { const d = el('div', 'navgroup', t); nav.appendChild(d); };

  if (role.all || role.crm || role.odr) { add('dashboard', '▸ Dashboard'); }
  // Governance
  const gov = ['council', 'advisory', 'secretariat'].filter(c => allowed(role, c));
  if (gov.length) { groupLabel('Governance'); gov.forEach(c => add('col:' + c, DEF[c].label)); }
  // Content
  const content = ['blogs', 'reports', 'events', 'podcasts', 'social'].filter(c => allowed(role, c));
  const hasPages = allowed(role, 'pages');
  if (content.length || hasPages) {
    groupLabel('Content');
    if (hasPages) add('pagecopy', '✎ Page Content');
    if (hasPages) add('visibility', '👁 Visibility');
    content.forEach(c => add('col:' + c, DEF[c].label));
  }
  // ODR
  if (role.all || role.odr) { groupLabel('ODR'); add('col:odr_providers', DEF.odr_providers.label); add('col:odr_resources', DEF.odr_resources.label); add('odr', 'ODR Applications'); }
  // Membership CRM
  if (role.all || role.crm) { groupLabel('Membership'); add('crm', 'Membership CRM'); }
  // Media + analytics
  const util = [];
  if (allowed(role, 'media')) util.push(['col:media', DEF.media.label]);
  if (role.all) util.push(['analytics', 'Analytics']);
  if (util.length) { groupLabel('Utilities'); util.forEach(([k, l]) => add(k, l)); }

  route((role.all || role.crm || role.odr) ? 'dashboard' : ('col:' + gov.concat(content)[0]));
}
function allowed(role, c) { return role.all || (Array.isArray(role.collections) && role.collections.includes(c)); }

function route(key) {
  document.querySelectorAll('#side-nav button').forEach(b => b.classList.toggle('active', b.dataset.key === key));
  $('#top-actions').innerHTML = '';
  if (key === 'dashboard') return viewDashboard();
  if (key === 'pagecopy') return viewPageContent();
  if (key === 'visibility') return viewVisibility();
  if (key === 'crm') return viewCRM();
  if (key === 'odr') return viewODR();
  if (key === 'analytics') return viewAnalytics();
  if (key.startsWith('col:')) return viewCollection(key.slice(4));
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
  else ctrl = `<input class="input" type="${type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'email' ? 'email' : type === 'url' ? 'url' : 'text'}" data-k="${k}" id="${id}" value="${esc(val)}">`;
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
