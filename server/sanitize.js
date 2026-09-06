'use strict';
/* Server-side sanitisation for all admin-supplied content.
   - cleanHtml: strict allowlist for rich text (blocks scripts, event handlers,
     iframes/objects/embeds/forms, style/unsafe CSS, and dangerous URL schemes).
   - safeUrl: validates a link/image URL — only http(s)/mailto/tel and safe
     relative-site URLs pass; javascript:, data:, vbscript:, protocol-relative,
     protocol-obfuscated and control-character URLs are rejected (returns null).
   - stripText: plain text only (all tags removed) — for alt text etc. */
const sanitizeHtml = require('sanitize-html');

const HTML_OPTS = {
  allowedTags: ['a', 'b', 'strong', 'i', 'em', 'u', 'br', 'span', 'small', 'sup', 'sub',
    'p', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'h4', 'abbr', 'code', 'mark'],
  allowedAttributes: { a: ['href', 'name', 'target', 'title', 'rel'], abbr: ['title'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { a: ['http', 'https', 'mailto', 'tel'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  // no `style` or `class` in allowedAttributes → inline CSS and class hooks are stripped
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
  },
};

function cleanHtml(input) {
  if (input == null) return '';
  return sanitizeHtml(String(input), HTML_OPTS);
}

function stripText(input) {
  if (input == null) return '';
  return sanitizeHtml(String(input), { allowedTags: [], allowedAttributes: {} }).trim();
}

const CONTROL = /[\x00-\x1f\x7f-\x9f]/;                 // C0/C1 control chars
const CONTROL_OR_SPACE = /[\x00-\x20\x7f-\x9f]/g;       // control chars + space

// Returns a safe URL string, or null if the value must be rejected. '' stays ''.
function safeUrl(input, opts = {}) {
  const schemes = opts.schemes || ['http', 'https', 'mailto', 'tel'];
  const allowRelative = opts.allowRelative !== false;
  if (input == null) return '';
  const s = String(input).trim();
  if (s === '') return '';
  if (CONTROL.test(s)) return null;                            // newline/tab smuggling
  // Collapse whitespace + control chars to expose obfuscated schemes ("java\tscript:").
  const bare = s.replace(CONTROL_OR_SPACE, '');
  if (/^\/\//.test(bare)) return null;                         // protocol-relative → reject
  const m = bare.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):/);
  if (m) return schemes.includes(m[1].toLowerCase()) ? s : null;  // scheme must be allowlisted
  return allowRelative ? s : null;                             // otherwise a relative site URL
}

// Sanitise a value by registry "kind".
function cleanByKind(kind, value) {
  if (kind === 'url') return safeUrl(value, { schemes: ['http', 'https', 'mailto', 'tel'] });
  if (kind === 'text') return stripText(value);
  return cleanHtml(value);                                      // default: rich text
}

module.exports = { cleanHtml, stripText, safeUrl, cleanByKind, HTML_OPTS };
