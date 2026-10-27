// يولّد صفحة HTML لمطوية قطاع من ملف بياناته في sectors/
const ICONS = require('./icons');

const fmt = n => (typeof n === 'number' ? n.toLocaleString('en-US') : n);
const ic = (id, cls = '') => `<svg${cls ? ` class="${cls}"` : ''}><use href="#${id}"/></svg>`;
const style = o => {
  const s = Object.entries(o || {}).filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}`).join(';');
  return s ? ` style="${s}"` : '';
};
const PARTNERS = ['yhf', 'ocha', 'iom', 'diyanet', 'care', 'tika', 'kizilay', 'wamy'];
const SDG = {
  1: { color: '#E5243B', label: 'القضاء على الفقر', icon: 'i-family' },
  2: { color: '#DDA63A', label: 'القضاء التام على الجوع', icon: 'i-soup' },
  3: { color: '#4C9F38', label: 'الصحة الجيدة والرفاه', icon: 'i-pulse' },
  4: { color: '#C5192D', label: 'التعليم الجيد', icon: 'i-book' },
  6: { color: '#26BDE2', label: 'المياه النظيفة والنظافة الصحية', icon: 's-wash' },
};
const ORDINAL = { 1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 6: 'السادس' };

const tag = (rev = false) => rev
  ? `<div class="tag"><i class="g"></i><i class="o"></i><span>حصاد 10 سنوات</span></div>`
  : `<div class="tag"><span>حصاد 10 سنوات</span><i class="o"></i><i class="g"></i></div>`;
const topbar = (d, side) => side === 'right'
  ? `<div class="topbar"><div class="sq-icon">${ic(d.icon)}</div>${tag(true)}</div>`
  : `<div class="topbar">${tag()}<div class="sq-icon">${ic(d.icon)}</div></div>`;

const photo = (p, cls = '') => `<div class="photo ${cls}"${style({ height: p.h })}><img src="${p.src}" alt=""${style({ 'object-position': p.pos })}>${p.cap ? `<span class="cap">${p.cap}</span>` : ''}</div>`;

const kpis = (b, cls = '', icons = true) => `<div class="kpis ${cls}">
  <div class="kpi">${icons ? ic('i-proj') : ''}<b>${fmt(b.projects)}</b><small>مشروع</small></div>
  <div class="kpi">${icons ? ic('i-people') : ''}<b>${fmt(b.benef)}</b><small>${b.benefLabel || 'مستفيد'}</small></div></div>`;

const ilist = items => `<ul class="ilist">${items.map(it => `<li>
  <span class="ic">${ic(it.icon)}</span><span class="nm">${it.name}${it.note ? `<small>${it.note}</small>` : ''}</span>
  <span class="n"><b>${fmt(it.projects)}</b><small>مشروع</small></span>
  <span class="n"><b>${fmt(it.benef)}</b><small>${it.label || 'مستفيد'}</small></span></li>`).join('')}</ul>`;

const cards = (cs, h) => `<div class="sub-cards"${style({ '--ch': h })}>${cs.map(c => `<div class="scard">
  ${photo(c.photo)}<div class="t">${ic(c.icon)}${c.name}</div>${kpis(c, 'sm', false)}</div>`).join('')}</div>`;

const block = b => `<div class="blk">
  <div class="sec-head"><div class="circ${b.color === 'o' ? ' o' : ''}">${ic(b.icon)}</div>
    <div><h3 class="h-orange">${b.title}</h3>${b.sub ? `<div class="sub">${b.sub}</div>` : ''}</div></div>
  ${b.kpis === false ? `<div class="tot">${ic('i-proj')}<b>${fmt(b.projects)}</b> مشروع<i></i>${ic('i-people')}<b>${fmt(b.benef)}</b> ${b.benefLabel || 'مستفيد'}</div>` : ''}
  ${b.text ? `<p>${b.text}</p>` : ''}
  ${b.kpis === false ? '' : kpis(b, b.kpiBox ? 'boxed' : '')}
  ${b.checks ? `<ul class="checks">${b.checks.map(c => `<li>${ic('i-check')}${c}</li>`).join('')}</ul>` : ''}
  ${b.items ? ilist(b.items) : ''}
  ${b.photos ? `<div class="pair${b.photos.length === 1 ? ' one' : ''}"${style({ '--ph': b.photoH })}>${b.photos.map(p => photo(p)).join('')}</div>` : ''}
  ${b.cards ? cards(b.cards, b.cardH) : ''}
</div>`;

const grid = g => g ? `<div class="grid ${g.cls || ''}"${style({ 'min-height': g.min })}>${g.items.map(p => photo(p)).join('')}</div>` : '';

const sdg = g => {
  if (!g) return '';
  const s = SDG[g.n];
  return `<div class="sdg"><div class="tile" style="background:${s.color}"><span class="n">${g.n}</span><span class="l">${s.label}</span>${ic(s.icon)}</div>
    <div><b>نحو هدف التنمية المستدامة ${ORDINAL[g.n]}: ${s.label}</b><span>${g.text}</span></div></div>`;
};

const programsPanel = (d, p, side) => `<div class="pad">
  ${p.topbar ? topbar(d, side) : ''}
  ${p.blocks.map(block).join('')}
  ${p.grid ? grid(p.grid) : '<div class="grow"></div>'}
  ${sdg(p.sdg)}
</div>`;

// ===== اللوحات =====
const cover = d => `<div class="panel w100 outer-l cover"${style({ '--h1': d.cover.h1Size, '--h2': d.cover.h2Size })}>
  <div class="fill"></div>
  <div class="photo-wrap"><div class="photo-c"><img src="${d.cover.photo}" alt=""${style({ 'object-position': d.cover.pos || '50% 0%' })}></div></div>
  <div class="tri"></div><div class="tri2"></div>
  <div class="band"><div class="band-in">
    <div class="logo-card"><img src="assets/common/crb-logo.png" alt="CRB"></div>
    <div><div class="org-ar">منتدى الإغاثة والبناء</div><div class="org-en">Coalition of Relief and Building (CRB)</div>
    <div class="slogan"><em>خدمة إنسانية</em>...تنمية مستدامة</div></div>
  </div></div>
  <div class="title-block">
    <div class="kicker"><div class="sq-icon">${ic(d.icon)}</div><span>قطـــاع</span></div>
    <h1>${d.cover.h1}${d.cover.h2 ? `<span class="o">${d.cover.h2}</span>` : ''}</h1>
    <div class="en">${d.en}</div>
    <div class="rule"></div>
    <div class="years"><b>10</b> سنوات من العطاء <span class="d">2016 - 2025</span></div>
  </div>
  <div class="foot">
    <span>${ic('i-web')}www.crbyemen.org</span>
    <span>${ic('i-fb')}${ic('i-x')}${ic('i-ig')}${ic('i-yt')}@crbyemen</span>
  </div>
</div>`;

const back = d => `<div class="panel w100 back">
  <div class="fill"></div>
  <img class="wm" src="assets/common/crb-hand-wm.png" alt="" style="width:56mm;height:56mm;left:-10mm;top:6mm">
  <div class="lower"></div>
  <div class="pad">
    ${topbar(d)}
    <h2 class="h-green">التنسيق والشراكات</h2>
    <p class="muted" style="margin-top:1.4mm;font-size:7.6pt;line-height:1.6">${d.back.text}</p>
    <div class="roles">${d.back.roles.map(r => `<div class="role"><div class="ab${r.g ? ' g' : ''}">${r.ab}</div><div><b>${r.title}</b><span>${r.desc}</span></div></div>`).join('')}</div>
    <div class="partners-h">من أبرز شركاء المنتدى</div>
    <div class="partners">${PARTNERS.map(n => `<div><img src="assets/common/logo-${n}.png" alt="${n}"></div>`).join('')}</div>
  </div>
  <div class="contact">
    <div class="logo-card"><img src="assets/common/crb-logo.png" alt="CRB"></div>
    <div class="org-ar">منتدى الإغاثة والبناء</div>
    <div class="org-en">Coalition of Relief and Building (CRB)</div>
    <ul class="clist">
      <li>${ic('i-loc')}<span><b>الإدارة العامة:</b> الجمهورية اليمنية، محافظة مأرب – المدينة، شارع 26 سبتمبر، برج الروهجان.</span></li>
      <li>${ic('i-phone')}<span class="ltr">+967 6 310915 &nbsp;|&nbsp; +967 776 872 297 &nbsp;|&nbsp; +967 771 158 013</span></li>
      <li>${ic('i-web')}<span class="ltr">www.crbyemen.org &nbsp;|&nbsp; info@crbyemen.org</span></li>
    </ul>
    <div class="social">${ic('i-fb')}${ic('i-x')}${ic('i-ig')}${ic('i-yt')}<span>@crbyemen</span></div>
  </div>
</div>`;

const badge = d => `<svg class="badge" viewBox="0 0 100 100" aria-hidden="true">
  <path d="M30 62 L18 96 L32 88 L40 100 L50 70 Z M70 62 L82 96 L68 88 L60 100 L50 70 Z" fill="#E08A0B"/>
  <path fill="#F6A31B" d="M50 4l7 6 9-2 4 8 9 2 0 9 7 6-4 8 4 8-7 6 0 9-9 2-4 8-9-2-7 6-7-6-9 2-4-8-9-2 0-9-7-6 4-8-4-8 7-6 0-9 9-2 4-8 9 2z"/>
  <circle cx="50" cy="43" r="25" fill="#fff"/><circle cx="50" cy="43" r="20" fill="#00A54F"/>
  <use href="#${d.icon}" x="36" y="29" width="28" height="28" color="#fff"/></svg>`;

const flap = d => {
  const s = d.story, g = d.gallery;
  const inner = s ? `
  <div class="photo-f"><img src="${s.photo}" alt=""${style({ 'object-position': s.pos })}></div>
  ${badge(d)}
  <div class="story">
    <h2 class="h-green">قصة نجاح</h2>
    <h3>${s.headline}</h3>
    ${s.paras.map(t => `<p>${t}</p>`).join('')}
    ${s.quotes.map(q => `<div class="quote"><q${style({ 'font-size': q.size })}>${q.text}</q>${q.cite ? `<cite>— ${q.cite}</cite>` : ''}</div>`).join('')}
  </div>` : `
  <div class="gallery">
    ${topbar(d, 'right')}
    <h2 class="h-green" style="font-size:17pt">${g.title}</h2>
    <div class="sub" style="font-size:8.6pt">${g.sub}</div>
    ${g.text ? `<p style="margin-top:2mm">${g.text}</p>` : ''}
    ${grid(g.grid)}
  </div>`;
  return `<div class="panel w97 outer-r flap"${style({ '--fh': s && s.h })}><div class="fill"></div>${inner}</div>`;
};

const donut = progs => {
  const total = progs.reduce((a, p) => a + p.projects, 0);
  let pcts = progs.map(p => Math.round(p.projects / total * 100));
  const diff = 100 - pcts.reduce((a, b) => a + b, 0);
  pcts[pcts.indexOf(Math.max(...pcts))] += diff;
  const gap = progs.length > 1 ? 0.8 : 0;
  let off = 0;
  const segs = progs.map(p => {
    const len = p.projects / total * 100;
    const c = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${p.color}" stroke-width="6" stroke-dasharray="${(len - gap).toFixed(2)} ${(100 - len + gap).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`;
    off += len; return c;
  }).join('');
  return { total, pcts, svg: `<svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="#EEF2EF" stroke-width="6"/>${segs}</svg>` };
};

const overview = d => {
  const o = d.overview, dn = donut(d.programs);
  return `<div class="panel w100 outer-r p1"${style({ '--oh': o.titleSize })}>
  <div class="fill"></div>
  <img class="wm" src="assets/common/crb-hand-wm.png" alt="" style="width:58mm;height:58mm;right:-12mm;top:60mm">
  <div class="pad">
    ${topbar(d, 'right')}
    <h2>${o.title}<small>${o.kicker}</small></h2>
    <p class="intro">${o.intro}</p>
    <div class="stats">
      <div class="stat hl">${ic('i-proj')}<div><b>${fmt(d.projects)}</b><span>مشروعاً منفذاً</span></div></div>
      <div class="stat hl">${ic('i-people')}<div><b>${fmt(d.benef)}</b><span>مستفيداً</span></div></div>
      ${o.stats.map(s => `<div class="stat">${ic(s.icon)}<div><b>${fmt(s.n)}</b><span>${s.label}</span></div></div>`).join('')}
    </div>
    <div class="chart-box">
      <h4>توزيع المشاريع حسب البرامج</h4>
      <div class="chart">
        <div class="donut">${dn.svg}<div class="c"><b>${fmt(dn.total)}</b><span>مشروع</span></div></div>
        <ul class="legend">${d.programs.map((p, i) => `<li><i style="background:${p.color}"></i>${p.name}<em>${dn.pcts[i]}%</em><small>${fmt(p.projects)} مشروع · ${fmt(p.benef)} ${p.benefLabel || 'مستفيد'}</small></li>`).join('')}</ul>
      </div>
    </div>
    ${photo(o.photo, 'flex')}
  </div>
</div>`;
};

module.exports = d => `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>مطوية قطاع ${d.name} — CRB</title><link rel="stylesheet" href="brochure.css"></head>
<body class="screen">
${ICONS}
<!-- الوجه الخارجي (يسار ← يمين): الغلاف | الظهر | اللسان -->
<section class="sheet outside"><div class="bleedbox"><div class="trim">
${cover(d)}
${back(d)}
${flap(d)}
</div></div><div class="marks" data-folds="100,200"></div></section>
<!-- الوجه الداخلي (يُقرأ من اليمين): نظرة عامة ← البرامج ← البرامج -->
<section class="sheet inside"><div class="bleedbox"><div class="trim">
<div class="panel w97 outer-l">
  <div class="fill"></div>
  <img class="wm" src="assets/common/crb-hand-wm.png" alt="" style="width:52mm;height:52mm;left:-8mm;bottom:40mm">
  ${programsPanel(d, d.left, 'left')}
</div>
<div class="panel w100"><div class="fill"></div>${programsPanel(d, d.middle, 'left')}</div>
${overview(d)}
</div></div><div class="marks" data-folds="97,197"></div></section>
<script>
const mode=new URLSearchParams(location.search).get('mode');
if(mode){document.body.classList.remove('screen');if(mode==='print')document.body.classList.add('print');}
if(document.body.classList.contains('print'))document.querySelectorAll('.marks').forEach(m=>{
  const slug=9,bleed=3,o=slug+bleed,W=297,H=210;
  const add=(cls,x,y)=>{const e=document.createElement('div');e.className='mk '+cls;e.style.left=x+'mm';e.style.top=y+'mm';m.appendChild(e);};
  [[o,o],[o+W,o],[o,o+H],[o+W,o+H]].forEach(([x,y],i)=>{const left=i%2===0,top=i<2;
    add('h',left?x-bleed-6:x+bleed,y);add('v',x,top?y-bleed-6:y+bleed);});
  m.dataset.folds.split(',').map(Number).forEach(f=>{add('fold',o+f,o-bleed-6);add('fold',o+f,o+H+bleed);});
});
</script>
</body></html>`;
