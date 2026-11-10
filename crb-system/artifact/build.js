// Builds the single-file Claude artifact (crb.html) from the shared CSS/lib and main.js
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
const wf = require(path.join(root, 'server/workflows.js'));
let css = fs.readFileSync(path.join(root, 'public/css/app.css'), 'utf8')
  .replace(/@font-face[^\n]*\n/g, '')
  .replace("font-family: 'Plex Arabic', 'Segoe UI'", "font-family: 'IBM Plex Sans Arabic', 'Segoe UI'")
  .replace('position: sticky; top: 0; z-index: 30;', 'position: sticky; top: env(safe-area-inset-top, 0px); z-index: 30;')
  .replace('.btn:hover { background: var(--surface-2); border-color: #cfd8d2; }', '.btn:hover { background: var(--surface-2); border-color: var(--ink-3); }')
  .replace('.btn.danger { color: var(--red); border-color: #f0c9c9; }', '.btn.danger { color: var(--red); border-color: var(--red-50); }')
  .replace(/@media print \{[\s\S]*?\n\}\n/, '');
css += `
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 40; background: var(--surface); }
.toasts { bottom: calc(20px + env(safe-area-inset-bottom, 0px)); left: calc(20px + env(safe-area-inset-left, 0px)); }
.badge.green, .badge.orange, .badge.red, .badge.blue, .badge.amber, .badge.purple { border-color: transparent; }
.login .box .sub { margin-bottom: 18px; }
.login .box p { line-height: 1.8; }
`;
let lib = fs.readFileSync(path.join(root, 'public/js/lib.js'), 'utf8')
  .replace(/^export const can = .*\n/m, '').replace(/^export const canAny = .*\n/m, '')
  .replace("export const fail = (e) => toast(e.message || String(e), 'err');", "const fail = (e) => { if (!e || !e.silent) toast((e && e.message) || String(e), 'err'); };")
  .replace(/^export /gm, '');
const logo = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'logo.jpg')).toString('base64');
const main = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')
  .replace('__PROJECT_STAGES__', JSON.stringify(wf.PROJECT_STAGES))
  .replace('__REQUEST_STAGES__', JSON.stringify(wf.REQUEST_STAGES))
  .replace('__GENERAL_RULES__', JSON.stringify(wf.GENERAL_RULES));
const out = `<title>منتدى الإغاثة والبناء</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">
<style>
${css}
</style>
<div id="root" dir="rtl" lang="ar"></div>
<script>
"use strict";
(function () {
const LOGO = ${JSON.stringify(logo)};
${lib}
${main}
})();
</script>
`;
fs.writeFileSync(path.join(__dirname, process.argv[2] || 'crb.html'), out);
console.log('built', out.length, 'bytes');
