'use strict';
/* Event visiting-card capture — mobile-first, reusable for any event.
   OCR runs on-device via SELF-HOSTED tesseract.js (served from /vendor, no CDN).
   The image is NEVER uploaded and is discarded after extraction; only the
   representative-reviewed text fields are submitted to the CRM. */
const $ = s => document.querySelector(s);
async function api(url, opts) {
  const r = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, data: j };
}
const MAX_BYTES = 12 * 1024 * 1024;         // reject oversized photos before OCR
const MAX_DIM = 1600;                        // downscale bound (px) for OCR + memory safety
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/bmp'];
let CONFIG = null, busy = false, ocrWorker = null;

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
  (CONFIG.event_sources || ['General Meeting']).forEach(s => { const o = document.createElement('option'); o.value = o.textContent = s; if (s === CONFIG.default_event) o.selected = true; sel.appendChild(o); });
  $('#form [name=follow_up_owner]').value = (me.data.user.name || '');
  if (!CONFIG.email_configured) {
    $('#consent').closest('.checkrow').querySelector('span').innerHTML += ' <em style="color:#9a3412">(email service is not configured yet — the thank-you will be queued, not sent)</em>';
  }
  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
})();

$('#signout').addEventListener('click', async e => { e.preventDefault(); await api('/api/auth/logout', { method: 'POST' }); location.replace('/admin'); });

/* ---------------- image capture, safety checks + on-device OCR ---------------- */
let previewUrl = null;
function releaseImage() {
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
  $('#cam').value = ''; $('#pick').value = '';
  $('#preview').classList.add('hidden'); $('#preview-img').removeAttribute('src');
}
function showForm() { $('#form').classList.remove('hidden'); $('#form').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function setStatus(t) { $('#ocr-status').textContent = t; }

['#cam', '#pick'].forEach(id => $(id).addEventListener('change', ev => onImage(ev.target.files && ev.target.files[0])));
$('#manual').addEventListener('click', () => { showForm(); });
$('#retake').addEventListener('click', () => { if (!busy) releaseImage(); });

async function onImage(file) {
  if (busy) return;                                   // prevent repeated taps launching parallel OCR
  if (!file) return;
  // --- image safety: type + size ---
  const typeOk = OK_TYPES.includes(file.type) || /\.(jpe?g|png|webp|heic|heif|bmp)$/i.test(file.name || '');
  if (!typeOk) { showForm(); setStatus('Unsupported image type — please use a JPEG, PNG or WebP photo, or enter details manually.'); return; }
  if (file.size > MAX_BYTES) { showForm(); setStatus('That image is too large (max 12 MB). Please retake at a lower resolution or enter details manually.'); return; }
  busy = true;
  showForm();
  // --- decode + orientation-correct + downscale in the browser ---
  let bitmap = null, canvas = null;
  try {
    previewUrl && URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    $('#preview-img').src = previewUrl;
    $('#preview').classList.remove('hidden');
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { bitmap = await createImageBitmap(file); }   // older engines: no auto-orient option
    if (!bitmap || !bitmap.width) throw new Error('decode');
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
    canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  } catch (e) {
    setStatus('That image could not be read (it may be corrupt). Please retake or enter the details manually.');
    if (bitmap && bitmap.close) bitmap.close();
    busy = false; return;
  }
  // --- OCR on the downscaled canvas (self-hosted; image stays on-device) ---
  if (typeof Tesseract === 'undefined') {
    setStatus('On-device text reader could not load — please type the details from the card.');
    if (bitmap && bitmap.close) bitmap.close();
    canvas.width = canvas.height = 0; busy = false; return;
  }
  setStatus('Reading card on your device… you can start typing while this runs.');
  try {
    if (!ocrWorker) {
      ocrWorker = await Tesseract.createWorker('eng', 1, {
        workerPath: '/vendor/tesseract/js/worker.min.js',
        corePath: '/vendor/tesseract/core',
        langPath: '/vendor/tesseract/lang',
        logger: m => { if (m.status === 'recognizing text') setStatus('Reading card… ' + Math.round((m.progress || 0) * 100) + '%'); },
      });
    }
    const res = await ocrWorker.recognize(canvas);
    parseInto((res && res.data && res.data.text) || '');
    setStatus('Text read from the card — please check every field, then save.');
  } catch (e) {
    setStatus('Automatic reading failed — please type the details from the card.');
  } finally {
    // Release every image reference — nothing is uploaded or retained.
    if (bitmap && bitmap.close) bitmap.close();
    if (canvas) { canvas.width = canvas.height = 0; }
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    busy = false;
  }
}

/* ---------------- best-effort field extraction (always human-reviewed) ---------------- */
function setIfEmpty(name, val) { const el = $('#form [name=' + name + ']'); if (el && !el.value && val) el.value = String(val).trim(); }
function parseInto(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = lines.join('  ');
  const email = (joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
  if (email) setIfEmpty('email', email.toLowerCase());
  const li = (joined.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s]+/i) || [])[0];
  if (li) setIfEmpty('linkedin', li.startsWith('http') ? li : 'https://' + li);
  let web = (joined.match(/\b((https?:\/\/)?(www\.)?[a-z0-9-]+\.(com|org|net|in|io|co|gov|edu)(\.[a-z]{2})?(\/[^\s]*)?)/i) || [])[0];
  if (web && email && web.includes(email.split('@')[1])) web = null;
  if (web && /linkedin\./i.test(web)) web = null;
  if (web) setIfEmpty('website', web.startsWith('http') ? web : 'https://' + web);
  const phones = (joined.match(/(\+?\d[\d\s().-]{7,}\d)/g) || []).map(p => p.trim()).filter(p => p.replace(/\D/g, '').length >= 8);
  if (phones[0]) setIfEmpty('mobile', phones[0]);
  if (phones[1]) setIfEmpty('alternate', phones[1]);
  const nonContact = lines.filter(l => !/@|\d{5,}|linkedin|www\.|https?:/i.test(l));
  if (nonContact[0]) setIfEmpty('full_name', nonContact[0]);
  if (nonContact[1]) setIfEmpty('designation', nonContact[1]);
  const orgLine = lines.find(l => /\b(pvt|private|ltd|limited|llp|inc|technologies|solutions|foundation|labs|systems|ventures|capital|bank|fintech|consult)/i.test(l));
  if (orgLine) setIfEmpty('organisation', orgLine);
  else if (nonContact[2]) setIfEmpty('organisation', nonContact[2]);
}

/* ---------------- submit (reviewed text only; never the image) ---------------- */
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
  releaseImage();
  $('#app').classList.add('hidden');
  const done = $('#done'); done.classList.remove('hidden');
  const sent = res.email_status === 'sent';
  const queuedOrFailed = res.email_status === 'queued' || res.email_status === 'failed';
  $('#done-title').textContent = sent ? 'Saved & email sent' : 'Saved to CRM';
  const m = $('#done-msg');
  m.textContent = res.message + (res.duplicate ? ' This matched an existing contact — your notes were added without overwriting their details.' : '');
  m.className = 'msg ' + (sent ? 'ok' : (queuedOrFailed ? 'warn' : 'ok'));
  done.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#another').addEventListener('click', () => location.reload());
window.addEventListener('beforeunload', () => { try { if (ocrWorker && ocrWorker.terminate) ocrWorker.terminate(); } catch (e) {} });
