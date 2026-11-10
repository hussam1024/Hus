'use strict';
// Small input sanitizers — every value from the client passes through one of these.
function str(v, max = 500) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  return s ? s.slice(0, max) : null;
}
function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function date(v) {
  const s = str(v, 30);
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2})?/.exec(s);
  return m ? m[1] + (m[2] || '') : null;
}
function bad(res, msg) { return res.status(400).json({ error: msg }); }
function oneOf(v, list, def) { return list.includes(v) ? v : def; }
module.exports = { str, num, date, bad, oneOf };
