// يولّد ملفات المطوية: PDF بحجم A4، PDF للمطبعة (نزف 3مم + علامات)، وصور معاينة PNG
const { chromium } = require('playwright');
const path = require('path');
const url = m => 'file://' + path.join(__dirname, 'brochure.html') + '?mode=' + m;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const out = process.argv[2] || path.join(__dirname, 'output');
  require('fs').mkdirSync(out, { recursive: true });

  await page.goto(url('a4')); await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(out, 'CRB-FSL-Brochure-A4.pdf'), width: '297mm', height: '210mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

  await page.goto(url('print')); await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(out, 'CRB-FSL-Brochure-PRINT-bleed3mm.pdf'), width: '321mm', height: '234mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

  const hi = await browser.newPage({ deviceScaleFactor: 300 / 96 });
  await hi.goto(url('a4')); await hi.evaluate(() => document.fonts.ready);
  for (const side of ['outside', 'inside']) {
    await hi.evaluate(s => document.querySelectorAll('.sheet').forEach(el => el.style.display = el.classList.contains(s) ? '' : 'none'), side);
    await hi.locator(`.sheet.${side}`).screenshot({ path: path.join(out, `CRB-FSL-Brochure-${side}.png`) });
  }
  await browser.close();
})();
