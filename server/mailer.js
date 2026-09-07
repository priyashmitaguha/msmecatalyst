'use strict';
/* Configurable outbound email.
   Configure entirely through environment variables (never commit credentials):
     SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"/"false"), SMTP_USER, SMTP_PASS,
     EMAIL_FROM  (e.g. "MSME Catalyst <no-reply@msmecatalyst.org>")
   If SMTP is not configured, mail is NOT sent; callers fall back to the DB outbox
   and isConfigured() reports false so the UI can warn the operator. */
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { /* dependency optional at runtime */ }

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.EMAIL_FROM);
}

function transport() {
  if (!nodemailer || !isConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) return { ok: false, configured: false };
  const t = transport();
  if (!t) return { ok: false, configured: false };
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM, to, subject, text, html });
    return { ok: true, configured: true };
  } catch (e) {
    console.error('Email send failed:', e.message);
    return { ok: false, configured: true, error: e.message };
  }
}

module.exports = { isConfigured, sendMail };
