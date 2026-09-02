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
    var items = itemsWrap.querySelectorAll('[data-cat]');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var f = b.getAttribute('data-filter');
        items.forEach(function (it) {
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
      if (!d.members || !d.members.length) return;
      wall.innerHTML = d.members.map(function (m) {
        var label = m.brand_name || m.legal_name || 'Member';
        var inner = m.logo
          ? '<img src="' + m.logo + '" alt="' + label + '" style="max-height:60px;max-width:82%;object-fit:contain" onerror="this.replaceWith(document.createTextNode(\'' + label.replace(/'/g, '') + '\'))">'
          : '<span>' + label + '</span>';
        var cat = (m.category || '').toLowerCase().replace(/[^a-z]+/g, '');
        return m.website ? '<a class="lw" data-cat="' + cat + '" href="' + m.website + '" target="_blank" rel="noopener">' + inner + '</a>'
                         : '<div class="lw" data-cat="' + cat + '">' + inner + '</div>';
      }).join('');
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

  // 1) Page-copy overrides: replace default text with admin-edited values.
  var cmsEls = document.querySelectorAll('[data-cms]');
  if (cmsEls.length) {
    fetch('/api/public/pagecopy').then(function(r){return r.json();}).then(function(d){
      var map = d.copy || {};
      cmsEls.forEach(function(el){
        var k = el.getAttribute('data-cms');
        if (map[k] != null && map[k] !== '') el.innerHTML = map[k];
      });
    }).catch(function(){ /* static hosting: keep built-in defaults */ });
  }

  // 2) Live list rendering from CMS collections.
  function profileCard(it){
    var name=it.name||'—', role=it.role||it.designation||'', org=it.organisation||it.department||'', bio=it.bio||'', li=it.linkedin;
    var head = it.photo ? '<img src="'+esc(it.photo)+'" alt="'+esc(name)+'" style="width:100%;height:100%;object-fit:cover" onerror="this.replaceWith(document.createTextNode(\''+initials(name)+'\'))">' : initials(name);
    return '<article class="profile"><div class="ph">'+head+'</div><div class="pb"><h3>'+esc(name)+'</h3>'+
      (role?'<div class="role">'+esc(role)+'</div>':'')+(org?'<div class="org">'+esc(org)+'</div>':'')+
      (bio?'<p class="bio">'+esc(bio)+'</p>':'')+(li?'<a class="li" href="'+esc(li)+'" target="_blank" rel="noopener">in · LinkedIn</a>':'')+'</div></article>';
  }
  function rcardCard(it){
    var title=it.title||'Untitled', summary=it.summary||it.description||'', cat=it.category||'', date=it.publish_date||'', author=it.author||it.guest||'';
    var link=it.link||it.file;
    var thumb = it.cover ? ' style="background-image:url('+esc(it.cover)+');background-size:cover;background-position:center"' : '';
    var titleHtml = link ? '<a href="'+esc(link)+'" target="_blank" rel="noopener">'+esc(title)+'</a>' : esc(title);
    return '<article class="rcard"><div class="thumb"'+thumb+'>'+(cat?'<span class="badge tag">'+esc(cat)+'</span>':'')+'</div>'+
      '<div class="rb"><h3>'+titleHtml+'</h3>'+(summary?'<p class="muted" style="font-size:.9rem">'+esc(summary)+'</p>':'')+
      '<div class="meta">'+esc(author)+(date?' · '+esc(date):'')+'</div></div></article>';
  }
  var renderers = { profile: profileCard, rcard: rcardCard };
  document.querySelectorAll('[data-cms-list]').forEach(function(box){
    var name = box.getAttribute('data-cms-list');
    var render = renderers[box.getAttribute('data-cms-render')] || rcardCard;
    fetch('/api/public/collection/'+name).then(function(r){return r.json();}).then(function(d){
      if (d.items && d.items.length) box.innerHTML = d.items.map(render).join('');
      // empty → keep the built-in placeholder cards as a graceful fallback
    }).catch(function(){ /* static hosting: keep placeholders */ });
  });
})();

/* ---------- Section visibility (hide links for sections not yet live) ---------- */
(function () {
  var els = document.querySelectorAll('[data-section]');
  if (!els.length) return;
  fetch('/api/public/visibility').then(function (r) { return r.json(); }).then(function (d) {
    var vis = (d && d.visible) || {};
    els.forEach(function (el) {
      var s = el.getAttribute('data-section');
      if (vis[s] === false) el.remove();
    });
  }).catch(function () { /* static hosting: show everything */ });
})();
