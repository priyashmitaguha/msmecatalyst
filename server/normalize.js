'use strict';
/* Shared normalisation used by BOTH the runtime (server.js) and the one-time
   migration backfill (db.js), so historical and new rows normalise identically. */

const FREEMAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk', 'ymail.com',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  'rediffmail.com', 'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com',
  'aol.com', 'gmx.com', 'zoho.com', 'mail.com', 'yandex.com', 'pm.me',
]);

function normEmail(e) { return String(e || '').trim().toLowerCase(); }
function isFreemail(domain) { return FREEMAIL.has(String(domain || '').toLowerCase()); }

/* Conservative international phone normalisation.
   - Preserves an explicit country code: "+91 98765 43210" → "+919876543210".
   - Treats a leading international prefix "00CC…" as "+CC…".
   - Without an explicit "+"/"00", keeps the national digits AS-IS (never slices
     to the last 10, never guesses a country code). A national number and an
     international number are therefore different strings and never collide, and
     two international numbers with different country codes never collide. */
function normPhone(raw) {
  const s = String(raw == null ? '' : raw);
  const hasPlus = /^\s*\+/.test(s);
  let digits = s.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (hasPlus) return '+' + digits;
  if (digits.startsWith('00')) return '+' + digits.slice(2);   // 00 international prefix → +
  return digits;                                               // national number, no country code assumed
}
// A normalised phone is comparable for de-duplication only when it is long enough
// to be meaningful. (Exact-string equality is required, so +91… never equals +65….)
function phoneComparable(norm) { return typeof norm === 'string' && norm.replace(/\D/g, '').length >= 8; }

/* Domain for de-duplication. Prefer an explicit website; otherwise fall back to a
   BUSINESS email domain only — never a free consumer mailbox (which would wrongly
   merge unrelated people who happen to use gmail/outlook/etc). */
function domainFromWebsite(website) {
  const w = String(website || '').trim();
  if (!w) return '';
  try {
    const h = new URL(/^https?:\/\//i.test(w) ? w : 'https://' + w).hostname.replace(/^www\./, '').toLowerCase();
    return isFreemail(h) ? '' : h;
  } catch (e) { return ''; }
}
function domainFromEmail(email) {
  const e = normEmail(email);
  if (!e.includes('@')) return '';
  const d = e.split('@')[1];
  return isFreemail(d) ? '' : d;
}
function orgDomain(website, email) {
  return domainFromWebsite(website) || domainFromEmail(email) || '';
}

module.exports = { normEmail, normPhone, phoneComparable, isFreemail, domainFromWebsite, domainFromEmail, orgDomain };
