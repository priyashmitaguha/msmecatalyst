'use strict';
/* GFF visiting-card capture — mobile-first.
   OCR runs on-device (tesseract.js). The image is NEVER uploaded and is
   discarded after use; only the reviewed text fields are submitted. */
const $ = s => document.querySelector(s);
async function api(url, opts) {
  const r = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, data: j };
}
let CONFIG = null;

(async function init() {
  const me = await api('/api/auth/me');
  if (me.status === 401) { location.replace('/admin'); return; }
  if (!me.data.caps || !me.data.caps.scan) {
    $('#gate').innerHTML = '<p class="msg err">This account is not permitted to capture cards.</p><p style="margin-top:10px"><a class="btn btn-ghost" href="/admin">Back</a></p>';
    return;
  }
  $('#who-name').textContent = (me.data.user.name || me.data.user.email);
  const cfg = await api('/api/scan/config');
  CONFIG = cfg.data;
  const sel = $('#event_source');
  (CONFIG.event_sources || ['GFF 2026']).forEach(s => { const o = document.createElement('option'); o.value = o.textContent = s; if (s === CONFIG.default_event) o.selected = true; sel.appendChild(o); });
  $('#form [name=follow_up_owner]').value = (me.data.user.name || '');
  if (!CONFIG.email_configured) {
    // Make it clear email will queue, not send.
    $('#consent').closest('.checkrow').querySelector('span').innerHTML += ' <em style="color:#9a3412">(email service is not configured yet — the thank-you will be queued, not sent)</em>';
  }
  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
})();

$('#signout').addEventListener('click', async e => { e.preventDefault(); await api('/api/auth/logout', { method: 'POST' }); location.replace('/admin'); });

/* ---------------- image capture + OCR ---------------- */
let objectUrl = null;
function clearImage() {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
  $('#cam').value = ''; $('#pick').value = '';
  $('#preview').classList.add('hidden'); $('#preview-img').removeAttribute('src');
}
function showForm() { $('#form').classList.remove('hidden'); $('#form').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

['#cam', '#pick'].forEach(id => $(id).addEventListener('change', ev => onImage(ev.target.files && ev.target.files[0])));
$('#manual').addEventListener('click', () => { showForm(); });
$('#retake').addEventListener('click', () => { clearImage(); });

async function onImage(file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) { setStatus('That file is not an image.'); return; }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  $('#preview-img').src = objectUrl;
  $('#preview').classList.remove('hidden');
  showForm();
  if (typeof Tesseract === 'undefined') { setStatus('On-device text reader unavailable — please type the details from the card.'); return; }
  setStatus('Reading card… you can start typing while this runs.');
  try {
    const res = await Tesseract.recognize(objectUrl, 'eng', {
      logger: m => { if (m.status === 'recognizing text') setStatus('Reading card… ' + Math.round((m.progress || 0) * 100) + '%'); }
    });
    const text = (res && res.data && res.data.text) || '';
    parseInto(text);
    setStatus('Text read from the card — please check every field, then save.');
  } catch (e) {
    setStatus('Could not read the card automatically — please type the details.');
  } finally {
    // The image has served its purpose. Discard it (never uploaded, never stored).
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
  }
}
function setStatus(t) { $('#ocr-status').textContent = t; }

/* ---------------- best-effort field extraction (always human-reviewed) ---------------- */
function setIfEmpty(name, val) { const el = $('#form [name=' + name + ']'); if (el && !el.value && val) el.value = val.trim(); }
function parseInto(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = lines.join('  ');
  const email = (joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  if (email) setIfEmpty('email', email.toLowerCase());
  // LinkedIn
  const li = (joined.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s]+/i) || [])[0];
  if (li) setIfEmpty('linkedin', li.startsWith('http') ? li : 'https://' + li);
  // Website (avoid the email's domain and linkedin)
  let web = (joined.match(/\b((https?:\/\/)?(www\.)?[a-z0-9-]+\.(com|org|net|in|io|co|gov|edu)(\.[a-z]{2})?(\/[^\s]*)?)/i) || [])[0];
  if (web && email && web.includes(email.split('@')[1])) web = null;
  if (web && /linkedin\./i.test(web)) web = null;
  if (web) setIfEmpty('website', web.startsWith('http') ? web : 'https://' + web);
  // Phones (take up to two)
  const phones = (joined.match(/(\+?\d[\d\s().-]{7,}\d)/g) || []).map(p => p.trim()).filter(p => p.replace(/\D/g, '').length >= 8);
  if (phones[0]) setIfEmpty('mobile', phones[0]);
  if (phones[1]) setIfEmpty('alternate', phones[1]);
  // Name / designation / organisation heuristics from the top lines
  const nonContact = lines.filter(l => !/@|\d{5,}|linkedin|www\.|https?:/i.test(l));
  if (nonContact[0]) setIfEmpty('full_name', nonContact[0]);
  if (nonContact[1]) setIfEmpty('designation', nonContact[1]);
  const orgLine = lines.find(l => /\b(pvt|private|ltd|limited|llp|inc|technologies|solutions|foundation|labs|systems|ventures|capital|bank|fintech|consult)/i.test(l));
  if (orgLine) setIfEmpty('organisation', orgLine);
  else if (nonContact[2]) setIfEmpty('organisation', nonContact[2]);
}

/* ---------------- submit ---------------- */
$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#form-msg'); msg.classList.add('hidden');
  const btn = $('#submit'); btn.disabled = true; btn.textContent = 'Saving…';
  const fd = new FormData(e.target);
  const body = {};
  fd.forEach((v, k) => { body[k] = v; });
  body.consent = $('#consent').checked;
  try {
    const r = await api('/api/scan/card', { method: 'POST', body: JSON.stringify(body) });
    if (!r.ok) throw new Error(r.data.error || 'Could not save. Please try again.');
    showDone(r.data);
  } catch (ex) {
    msg.textContent = ex.message; msg.className = 'msg err';
  } finally { btn.disabled = false; btn.textContent = 'Save to CRM'; }
});

function showDone(res) {
  clearImage();
  $('#app').classList.add('hidden');
  const done = $('#done'); done.classList.remove('hidden');
  const sent = res.email_status === 'sent';
  const queued = res.email_status === 'queued' || res.email_status === 'failed';
  $('#done-title').textContent = sent ? 'Saved & email sent' : 'Saved to CRM';
  const m = $('#done-msg');
  m.textContent = res.message + (res.duplicate ? ' This matched an existing contact — your notes were added without overwriting their details.' : '');
  m.className = 'msg ' + (sent ? 'ok' : (queued ? 'warn' : 'ok'));
  done.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#another').addEventListener('click', () => location.reload());
