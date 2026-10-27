// يولّد مطويات القطاعات: node build.js [food shelter ...] [--out dir]
// لكل قطاع: HTML قابل للتعديل + PDF بمقاس A4 + PDF للمطبعة (نزف 3مم وعلامات) + معاينة PNG لكل وجه
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const render = require('./template');

const ALL = ['food', 'shelter', 'wash', 'education', 'health', 'protection'];
const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = oi >= 0 ? path.resolve(args.splice(oi, 2)[1]) : path.join(__dirname, 'output');
const ids = args.length ? args : ALL;

(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage();
  const hi = await browser.newPage({ deviceScaleFactor: 300 / 96 });
  const pdf = { printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
  for (const id of ids) {
    const d = require(`./sectors/${id}`);
    const html = path.join(__dirname, `${id}.html`);
    fs.writeFileSync(html, render(d));
    const dir = path.join(out, id);
    fs.mkdirSync(dir, { recursive: true });
    const url = m => `file://${html}?mode=${m}`;

    await pg.goto(url('a4')); await pg.evaluate(() => document.fonts.ready);
    await pg.pdf({ ...pdf, path: path.join(dir, `${d.file}-Brochure-A4.pdf`), width: '297mm', height: '210mm' });
    await pg.goto(url('print')); await pg.evaluate(() => document.fonts.ready);
    await pg.pdf({ ...pdf, path: path.join(dir, `${d.file}-Brochure-PRINT-bleed3mm.pdf`), width: '321mm', height: '234mm' });

    await hi.goto(url('a4')); await hi.evaluate(() => document.fonts.ready);
    for (const side of ['outside', 'inside']) {
      await hi.evaluate(s => document.querySelectorAll('.sheet').forEach(e => { e.style.display = e.classList.contains(s) ? '' : 'none'; }), side);
      await hi.locator(`.sheet.${side}`).screenshot({ path: path.join(dir, `${d.file}-Brochure-${side}.jpg`), type: 'jpeg', quality: 90 });
    }
    console.log('✓', id);
  }
  await browser.close();
})();
