import { html, mount, icon, api, pageHead, on } from '../lib.js';

const LEG = [['execution', 'تنفيذ مشروع'], ['deadline', 'مهلة طلب'], ['meeting', 'اجتماع'], ['task', 'مهمة'], ['media', 'تغطية إعلامية'], ['leave', 'إجازة']];
const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default async function ({ el }) {
  let cur = new Date(); cur.setDate(1);
  async function render() {
    const m = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    const { events } = await api('/calendar?month=' + m);
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const offset = (first.getDay() + 1) % 7; // week starts Saturday
    const daysIn = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysIn; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat('ar-u-nu-latn', { month: 'long', year: 'numeric' }).format(cur);
    mount(el, html`${pageHead('التقويم الموحد', 'مواعيد التنفيذ، مهل الطلبات، الاجتماعات، مهامك، التغطيات والإجازات — حسب صلاحياتك', html`
        <button class="btn" data-nav="-1">${icon('arrowLeft', 'style="transform:scaleX(-1)"')} السابق</button><button class="btn" data-nav="0">اليوم</button><button class="btn" data-nav="1">التالي ${icon('arrowLeft')}</button>`, 'calendar')}
      <div class="card"><div class="card-head"><h3>${label}</h3><div class="row small">${LEG.map(([k, l]) => html`<span class="ev ${k}" style="display:inline-block;margin:0">${l}</span>`)}</div></div>
      <div class="table-wrap"><div class="cal" style="min-width:760px">${DAYS.map((d) => html`<div class="dh">${d}</div>`)}
        ${cells.map((d) => {
          if (!d) return html`<div class="d out"></div>`;
          const ds = `${m}-${String(d).padStart(2, '0')}`;
          const evs = events.filter((e) => e.date === ds);
          return html`<div class="d ${ds === todayStr ? 'today' : ''}"><div class="dn">${d}</div>${evs.slice(0, 4).map((e) => html`<a class="ev ${e.kind}" href="${e.link}" title="${e.title}">${e.time ? e.time + ' ' : ''}${e.title}</a>`)}${evs.length > 4 ? html`<div class="small muted">+${evs.length - 4}</div>` : ''}</div>`;
        })}</div></div></div>`);
  }
  await render();
  on(el, 'click', '[data-nav]', (e, t) => { const n = Number(t.dataset.nav); if (n === 0) { cur = new Date(); cur.setDate(1); } else cur.setMonth(cur.getMonth() + n); render(); });
}
