/* Shared visibility logic for the public site.
   Pure, dependency-free, and usable both in the browser (window.MCVis) and in
   Node tests (module.exports) so the tests exercise the SAME code the site runs.
   - slugFromPath: resolve a URL path to the page slug the server uses.
   - applyHiddenPages: drop every nav/button/text/footer link to a hidden page.
   - applyHiddenSections: drop sections (and anchor links) toggled off. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MCVis = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // /                         -> index
  // /about(.html)             -> about
  // /odr or /odr/(index.html) -> odr-index
  // /odr/how-it-works(.html)  -> odr-how-it-works
  function slugFromPath(pathname) {
    var p = (pathname || '').replace(/\/+$/, '');
    if (p === '') return 'index';
    var m = p.match(/^\/odr(?:\/([a-z0-9\-]+?)(?:\.html)?)?$/i);
    if (m) return 'odr-' + (m[1] ? m[1].toLowerCase() : 'index');
    m = p.match(/^\/([a-z0-9\-]+?)(?:\.html)?$/i);
    if (m) return m[1].toLowerCase();
    return null;
  }

  function applyHiddenPages(doc, baseHref, hiddenList, origin) {
    var hidden = {};
    (hiddenList || []).forEach(function (s) { hidden[s] = true; });
    if (!Object.keys(hidden).length) return;
    var anchors = doc.querySelectorAll('a[href]');
    Array.prototype.forEach.call(anchors, function (a) {
      var raw = a.getAttribute('href') || '';
      if (raw.charAt(0) === '#' || raw.indexOf('mailto:') === 0 || raw.indexOf('tel:') === 0) return;
      var url;
      try { url = new URL(raw, baseHref); } catch (e) { return; }
      if (origin && url.origin !== origin) return;            // external link: leave it
      var slug = slugFromPath(url.pathname);
      if (!slug || !hidden[slug]) return;
      // Remove the smallest sensible wrapper so no empty shells remain.
      var drop = (a.closest && (a.closest('li') || a.closest('.has-drop'))) || a;
      if (drop.querySelectorAll && drop.querySelectorAll('a[href]').length > 1) drop = a;
      drop.remove();
    });
  }

  function applyHiddenSections(doc, visibleMap) {
    var vis = visibleMap || {};
    Array.prototype.forEach.call(doc.querySelectorAll('[data-section]'), function (el) {
      if (vis[el.getAttribute('data-section')] === false) el.remove();
    });
  }

  /* ---------- Safe paragraph rendering (one reusable component) ----------
     Preserve author line breaks in CMS text: one or more blank lines start a new
     <p>; a single newline becomes a <br>. Windows (\r\n) and Unix (\n) endings are
     both handled. `escape:true` (default) escapes each segment so raw user HTML is
     shown as text, never executed — XSS-safe. `escape:false` is only for values
     already sanitised server-side (page copy), so allowed inline formatting/links
     survive while paragraphs are still applied. */
  function escapeHtml(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }
  function normaliseNewlines(text) { return String(text == null ? '' : text).replace(/\r\n?/g, '\n'); }
  function hasBlankLine(text) { return /\n[ \t]*\n/.test(normaliseNewlines(text)); }
  function toParagraphs(text, opts) {
    opts = opts || {};
    var esc = opts.escape !== false;
    var cls = 'cms-p' + (opts.className ? ' ' + opts.className : '');
    var blocks = normaliseNewlines(text).split(/\n[ \t]*\n+/);
    var html = '';
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i].replace(/^\n+|\n+$/g, '');
      if (!block.replace(/\s+/g, '')) continue;                 // skip empty blocks
      var lines = block.split('\n');
      for (var j = 0; j < lines.length; j++) lines[j] = esc ? escapeHtml(lines[j]) : lines[j];
      html += '<p class="' + cls + '">' + lines.join('<br>') + '</p>';
    }
    return html;
  }
  // Elements that must not contain a nested <p>. For those we replace the element
  // with the sibling <p> blocks (carrying its classes) so the HTML stays valid.
  var NO_P_CHILDREN = { P: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, SPAN: 1, A: 1, LI: 1,
    LABEL: 1, BUTTON: 1, STRONG: 1, EM: 1, B: 1, I: 1, SMALL: 1, DT: 1, DD: 1, TH: 1, TD: 1, FIGCAPTION: 1, SUMMARY: 1 };
  function renderParagraphsInto(el, text, opts) {
    var html = toParagraphs(text, opts);
    if (!html) { el.textContent = ''; return; }
    if (NO_P_CHILDREN[el.tagName]) {
      var tmp = el.ownerDocument.createElement('div');
      tmp.innerHTML = html;                                     // html is escaped text or pre-sanitised HTML → safe
      var nodes = [];
      while (tmp.firstChild) {
        var node = tmp.firstChild;
        if (node.nodeType === 1 && el.className) node.className += ' ' + el.className;
        nodes.push(node); tmp.removeChild(node);
      }
      el.replaceWith.apply(el, nodes);
    } else {
      el.innerHTML = html;
    }
  }

  /* ---------- Member logo wall (one reusable renderer) ----------
     Larger logos, aspect preserved via object-fit:contain, alt text from the org
     name, no placeholder cells. Layout/centring/responsiveness are handled by CSS
     (.logowall flex-wrap). Eligibility filtering stays entirely server-side. */
  // Map a CRM membership category to the filter-button key so category filters work
  // for dynamically rendered tiles (e.g. "Infrastructure" → infra, "ODR Providers" → odr).
  var CATEGORY_KEY = { lenders: 'lenders', fintechs: 'fintechs', infrastructure: 'infra',
    anchors: 'anchors', ecosysteminstitutions: 'ecosystem', odrproviders: 'odr', donorsfundingpartners: 'donors' };
  function catKey(category) { var raw = String(category || '').toLowerCase().replace(/[^a-z]+/g, ''); return CATEGORY_KEY[raw] || raw; }
  function memberTileHtml(m) {
    m = m || {};
    var label = m.brand_name || m.legal_name || 'Member';
    var altSafe = escapeHtml(label);
    var cat = catKey(m.category);
    var fallback = String(label).replace(/[\\'<>&]/g, ' ');
    var inner = m.logo
      ? '<img class="lw-img" src="' + escapeHtml(m.logo) + '" alt="' + altSafe + '" loading="lazy" ' +
        'onerror="this.parentNode.classList.add(\'lw-noimg\');this.replaceWith(document.createTextNode(\'' + fallback + '\'))">'
      : '<span>' + altSafe + '</span>';
    var attrs = 'class="lw" data-cat="' + cat + '" title="' + altSafe + '"';
    return m.website
      ? '<a ' + attrs + ' href="' + escapeHtml(m.website) + '" target="_blank" rel="noopener">' + inner + '</a>'
      : '<div ' + attrs + '>' + inner + '</div>';
  }
  function renderMemberWall(wall, members) {
    if (!wall) return;
    wall.innerHTML = (members || []).map(memberTileHtml).join('');   // exactly N tiles, no empty placeholders
  }

  return {
    slugFromPath: slugFromPath, applyHiddenPages: applyHiddenPages, applyHiddenSections: applyHiddenSections,
    escapeHtml: escapeHtml, hasBlankLine: hasBlankLine, toParagraphs: toParagraphs, renderParagraphsInto: renderParagraphsInto,
    memberTileHtml: memberTileHtml, renderMemberWall: renderMemberWall, catKey: catKey,
  };
});
