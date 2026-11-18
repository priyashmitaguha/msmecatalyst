/* MSME Catalyst — shared interactions */
(function () {
  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add('in'); });
  }

  // Simple filter lists (data-filter groups)
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var buttons = group.querySelectorAll('[data-filter]');
    var itemsWrap = document.querySelector(group.getAttribute('data-target'));
    if (!itemsWrap) return;
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var f = b.getAttribute('data-filter');
        // Re-query on each click so filtering also covers tiles rendered later from the CRM.
        itemsWrap.querySelectorAll('[data-cat]').forEach(function (it) {
          var show = f === 'all' || (it.getAttribute('data-cat') || '').split(' ').indexOf(f) > -1;
          it.style.display = show ? '' : 'none';
        });
      });
    });
  });

  // Form UX. If the page is served by the back-end and the form has data-endpoint,
  // submit for real; otherwise (pure static hosting) fall back to a friendly demo success.
  function succeed(form) {
    var ok = form.querySelector('.form-success');
    if (ok) { ok.style.display = 'block'; ok.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    form.querySelectorAll('.input,.select,.textarea,button[type=submit]').forEach(function (el) { el.setAttribute('disabled', 'disabled'); });
  }
  document.querySelectorAll('form[data-demo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) { succeed(form); return; }
      var fd = new FormData(form);
      var hasFile = form.querySelector('input[type=file]');
      var opts;
      if (hasFile) { opts = { method: 'POST', body: fd }; }
      else {
        var obj = {}; fd.forEach(function (v, k) { obj[k] = v; });
        form.querySelectorAll('input[type=checkbox]').forEach(function (c) { if (c.name) obj[c.name] = c.checked ? 1 : 0; });
        opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
      }
      fetch(endpoint, opts).then(function (r) { succeed(form); }).catch(function () { succeed(form); });
    });
  });

  // Dynamic member logo wall (from CRM). Falls back to placeholder tiles on static hosting.
  var wall = document.getElementById('member-wall');
  if (wall) {
    fetch('/api/public/members').then(function (r) { return r.json(); }).then(function (d) {
      if (!d.members || !d.members.length) return;              // no eligible members → keep static fallback
      if (typeof MCVis !== 'undefined') MCVis.renderMemberWall(wall, d.members);
    }).catch(function () {});
  }

  // ODR provider redirect flow
  var provForm = document.getElementById('provider-select');
  if (provForm) {
    var choice = document.getElementById('provider-choice');
    // Default providers (used on static hosting). Replace URLs with the real provider sites.
    var providers = [
      { name: 'Provider A', url: 'https://example-provider-a.org' },
      { name: 'Provider B', url: 'https://example-provider-b.org' },
      { name: 'Provider C', url: 'https://example-provider-c.org' }
    ];
    function fillOptions() {
      choice.innerHTML = '<option value="">Choose a provider…</option>' +
        providers.map(function (p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
    }
    // Pull live providers from the CMS when the back-end is present.
    fetch('/api/public/odr-providers').then(function (r) { return r.json(); }).then(function (d) {
      if (d.providers && d.providers.length) { providers = d.providers; fillOptions(); }
    }).catch(function () {});
    provForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var idx = choice.value;
      var p = providers[idx];
      if (!p) return;
      var box = document.getElementById('redirect-box');
      var nameEl = document.getElementById('redirect-name');
      var countEl = document.getElementById('redirect-count');
      var goBtn = document.getElementById('redirect-now');
      nameEl.textContent = p.name;
      goBtn.setAttribute('href', p.url);
      box.style.display = 'block';
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // analytics hooks: dataLayer (GA/GTM), plus the back-end/CRM event store when present
      if (window.dataLayer) window.dataLayer.push({ event: 'odr_provider_selected', provider: p.name });
      try {
        fetch('/api/public/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'odr_provider_redirect', meta: { provider: p.name } }) });
      } catch (err) {}
      var n = 3;
      countEl.textContent = n;
      var t = setInterval(function () {
        n -= 1; countEl.textContent = n;
        if (n <= 0) { clearInterval(t); window.location.href = p.url; }
      }, 1000);
    });
  }

  // Footer year
  var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
})();

/* ---------- CMS hydration (custom admin) ---------- */
(function () {
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(m){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]);});}
  function initials(n){return (n||'?').split(/\s+/).map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();}
  // Reusable, XSS-safe paragraph rendering for plain-text CMS fields (bios, summaries,
  // descriptions). Blank lines → separate <p>; single line breaks → <br>.
  function paras(text, className){ return (typeof MCVis!=='undefined') ? MCVis.toParagraphs(text,{className:className}) : (text?'<p class="'+className+'">'+esc(text)+'</p>':''); }
  // A file field may hold several URLs (one per line, or comma-separated). These
  // read all of them, or just the first, so single-URL callers stay correct.
  function urlList(v){ return String(v==null?'':v).split(/[\r\n,]+/).map(function(s){return s.trim();}).filter(Boolean); }
  function firstUrl(v){ return urlList(v)[0] || ''; }
  // Render a write-up / minutes body: keep it as-is if it already has block
  // structure (HTML), otherwise turn its blank-line / line-break separated plain
  // text into real paragraphs so it doesn't render as one wall of text.
  function renderBody(b){
    b = String(b==null?'':b);
    if (typeof MCVis === 'undefined') return b;
    if (/<(p|br|div|ul|ol|li|h[1-6]|table|blockquote)\b/i.test(b)) return b;
    return MCVis.toParagraphs(b, { escape: false, className: 'cm-p' });
  }

  // 1) Page-copy overrides: replace default text / links / images with admin-edited values.
  var cmsEls = document.querySelectorAll('[data-cms],[data-cms-href],[data-cms-src],[data-cms-alt]');
  if (cmsEls.length) {
    fetch('/api/public/pagecopy').then(function(r){return r.json();}).then(function(d){
      var map = d.copy || {};
      var multiline = {}; (d.multiline || []).forEach(function(k){ multiline[k] = true; });
      document.querySelectorAll('[data-cms]').forEach(function(el){
        var k = el.getAttribute('data-cms');
        if (map[k] == null || map[k] === '') return;
        // Multi-paragraph text in a multiline field → render semantic paragraphs
        // (value is already sanitised server-side, so inline formatting/links survive).
        if (multiline[k] && typeof MCVis !== 'undefined' && MCVis.hasBlankLine(map[k])) MCVis.renderParagraphsInto(el, map[k], { escape: false });
        else el.innerHTML = map[k];
      });
      document.querySelectorAll('[data-cms-href]').forEach(function(el){
        var k = el.getAttribute('data-cms-href');
        if (map[k] != null && map[k] !== '') el.setAttribute('href', map[k]);
      });
      document.querySelectorAll('[data-cms-src]').forEach(function(el){
        var k = el.getAttribute('data-cms-src');
        if (map[k] != null && map[k] !== '') el.setAttribute('src', map[k]);
      });
      document.querySelectorAll('[data-cms-alt]').forEach(function(el){
        var k = el.getAttribute('data-cms-alt');
        if (map[k] != null && map[k] !== '') el.setAttribute('alt', map[k]);
      });
    }).catch(function(){ /* static hosting: keep built-in defaults */ });
  }

  // 2) Live list rendering from CMS collections.
  function profileCard(it){
    var name=it.name||'—', role=it.role||it.designation||'', org=it.organisation||it.department||'', bio=it.bio||'', li=it.linkedin;
    var photo=firstUrl(it.photo);
    var head = photo ? '<img src="'+esc(photo)+'" alt="'+esc(name)+'" style="width:100%;height:100%;object-fit:cover" onerror="this.replaceWith(document.createTextNode(\''+initials(name)+'\'))">' : initials(name);
    return '<article class="profile"><div class="ph">'+head+'</div><div class="pb"><h3>'+esc(name)+'</h3>'+
      (role?'<div class="role">'+esc(role)+'</div>':'')+(org?'<div class="org">'+esc(org)+'</div>':'')+
      paras(bio,'bio')+(li?'<a class="li" href="'+esc(li)+'" target="_blank" rel="noopener">in · LinkedIn</a>':'')+'</div></article>';
  }
  function rcardCard(it){
    var title=it.title||'Untitled', summary=it.summary||it.description||'', cat=it.category||'', date=it.publish_date||'', author=it.author||it.guest||'';
    var link=it.link||firstUrl(it.file);
    var cover=firstUrl(it.cover);
    var thumb = cover ? ' style="background-image:url('+esc(cover)+');background-size:cover;background-position:center"' : '';
    var titleHtml = link ? '<a href="'+esc(link)+'" target="_blank" rel="noopener">'+esc(title)+'</a>' : esc(title);
    return '<article class="rcard"><div class="thumb"'+thumb+'>'+(cat?'<span class="badge tag">'+esc(cat)+'</span>':'')+'</div>'+
      '<div class="rb"><h3>'+titleHtml+'</h3>'+paras(summary,'muted rcard-sum')+
      '<div class="meta">'+esc(author)+(date?' · '+esc(date):'')+'</div></div></article>';
  }
  // Extract a YouTube video ID (strict). Shared with visibility-lib so the exact
  // same validated logic is unit-tested; a local fallback keeps the page working
  // if the lib failed to load. Only an [A-Za-z0-9_-]{11} id is ever returned, so a
  // malformed/hostile value can never inject markup or a foreign src.
  function ytId(u){
    if (typeof MCVis !== 'undefined' && MCVis.youtubeId) return MCVis.youtubeId(u);
    if (u == null) return '';
    var s = String(u).trim();
    var m = s.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    return '';
  }
  // Decide a meeting's type: explicit `type` field wins; otherwise infer from
  // which content field is present (video → document → write-up).
  function meetingType(it){
    var t = (it.type||'').toLowerCase();
    if (t.indexOf('video')>-1 || t.indexOf('recording')>-1) return 'video';
    if (t.indexOf('write')>-1 || t.indexOf('minute')>-1 || t.indexOf('note')>-1) return 'writeup';
    if (t.indexOf('doc')>-1) return 'document';
    if (ytId(it.youtube)) return 'video';
    if (it.file) return 'document';
    if (it.body) return 'writeup';
    if (it.link) return 'document';
    return 'writeup';
  }
  // One meeting = one card that shows everything it has: the recording, the
  // written minutes, and any documents. It is tagged with every content type it
  // contains, so it appears under each relevant filter (Videos / Write-ups /
  // Documents), not just one.
  function meetingCard(it){
    var title = it.title||'Untitled';
    var date = it.meeting_date||it.publish_date||'';
    var summary = it.summary||'';
    var meta = 'Governing Council'+(date?' · '+esc(date):'');
    var vid = ytId(it.youtube);
    var hasYoutube = !!(it.youtube && String(it.youtube).trim());
    var hasBody = !!(it.body && String(it.body).trim());
    var files = urlList(it.file);
    // Which filter categories this meeting belongs to.
    var cats = [];
    if (hasYoutube) cats.push('video');
    if (hasBody) cats.push('writeup');
    if (files.length) cats.push('document');
    if (!cats.length) cats.push('writeup');
    // Media area: embedded recording, else a cover image, else nothing.
    var media = '';
    if (vid) {
      media = '<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/'+vid+'?rel=0" title="'+esc(title)+'" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>';
    } else if (firstUrl(it.cover)) {
      media = '<div class="thumb" style="background-image:url('+esc(firstUrl(it.cover))+');background-size:cover;background-position:center"></div>';
    }
    // Little badges showing what's inside.
    var badges = cats.map(function(c){
      var lbl = c==='video'?'Video':(c==='document'?'Document':'Write-up');
      return '<span class="badge '+(c==='writeup'?'orange ':'')+'tag">'+lbl+'</span>';
    }).join(' ');
    // A reliable link to the recording (works even if the embed is blocked by an
    // ad-blocker / privacy extension / network).
    var watch = hasYoutube ? '<a class="textlink" style="display:inline-block;margin-top:8px" href="'+esc(it.youtube)+'" target="_blank" rel="noopener">▶ Watch on YouTube →</a>' : '';
    // Full minutes / write-up on demand (body is sanitised server-side).
    var writeup = hasBody ? '<details class="cm-details"><summary>Read the write-up / minutes</summary><div class="cm-body">'+renderBody(it.body)+'</div></details>' : '';
    // Document links (several per meeting).
    var docs = files.length
      ? files.map(function(u,i){ return '<a class="textlink" style="display:block;margin-top:6px" href="'+esc(u)+'" target="_blank" rel="noopener">📄 Open document'+(files.length>1?' '+(i+1):'')+' →</a>'; }).join('')
      : '';
    var extraLink = (!hasYoutube && it.link) ? '<a class="textlink" style="display:inline-block;margin-top:8px" href="'+esc(it.link)+'" target="_blank" rel="noopener">Open link →</a>' : '';
    return '<article class="rcard" data-cat="'+cats.join(' ')+'">'+media+
      '<div class="rb"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:2px">'+badges+'</div>'+
      '<h3>'+esc(title)+'</h3>'+paras(summary,'muted rcard-sum')+writeup+watch+extraLink+docs+
      '<div class="meta">'+meta+'</div></div></article>';
  }
  var renderers = { profile: profileCard, rcard: rcardCard, meeting: meetingCard };
  // Optional per-container category filtering (used to group one collection into
  // labelled sections, e.g. Events → Flagship / Roundtables). Matches a comma-
  // separated list of substrings against each item's category (or type).
  function catTerms(box, attr){
    return (box.getAttribute(attr)||'').toLowerCase().split(',').map(function(s){return s.trim();}).filter(Boolean);
  }
  function catMatch(it, terms){
    var c = ((it.category||it.type||'')+'').toLowerCase();
    for (var i=0;i<terms.length;i++){ if (c.indexOf(terms[i])>-1) return true; }
    return false;
  }
  document.querySelectorAll('[data-cms-list]').forEach(function(box){
    var name = box.getAttribute('data-cms-list');
    var render = renderers[box.getAttribute('data-cms-render')] || rcardCard;
    var inc = catTerms(box, 'data-cms-filter');
    var exc = catTerms(box, 'data-cms-filter-exclude');
    // Optional sort: data-cms-sort="field:desc" (or ":asc"). Dates/strings compare fine.
    var sortSpec = (box.getAttribute('data-cms-sort') || '').split(':');
    var sortField = sortSpec[0].trim();
    var sortDesc = (sortSpec[1] || 'desc').trim().toLowerCase() !== 'asc';
    fetch('/api/public/collection/'+name).then(function(r){return r.json();}).then(function(d){
      var items = d.items || [];
      if (inc.length) items = items.filter(function(it){ return catMatch(it, inc); });
      if (exc.length) items = items.filter(function(it){ return !catMatch(it, exc); });
      if (sortField) {
        items = items.slice().sort(function(a, b){
          var av = (a[sortField] || ''), bv = (b[sortField] || '');
          if (av < bv) return sortDesc ? 1 : -1;
          if (av > bv) return sortDesc ? -1 : 1;
          return 0;
        });
      }
      if (items.length) box.innerHTML = items.map(render).join('');
      // empty → keep the built-in placeholder cards as a graceful fallback
    }).catch(function(){ /* static hosting: keep placeholders */ });
  });
})();

/* ---------- Section visibility (hide sections + their anchor links) ---------- */
(function () {
  if (typeof MCVis === 'undefined' || !document.querySelector('[data-section]')) return;
  fetch('/api/public/visibility').then(function (r) { return r.json(); }).then(function (d) {
    MCVis.applyHiddenSections(document, (d && d.visible) || {});
  }).catch(function () { /* static hosting: show everything */ });
})();

/* ---------- Page publishing (drop nav/button/text/footer links to hidden pages) ---------- */
(function () {
  if (typeof MCVis === 'undefined') return;
  fetch('/api/public/pages').then(function (r) { return r.json(); }).then(function (d) {
    MCVis.applyHiddenPages(document, location.href, (d && d.hidden) || [], location.origin);
  }).catch(function () { /* static hosting: show everything */ });
})();
