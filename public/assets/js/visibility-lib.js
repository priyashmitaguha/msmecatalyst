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

  return { slugFromPath: slugFromPath, applyHiddenPages: applyHiddenPages, applyHiddenSections: applyHiddenSections };
});
