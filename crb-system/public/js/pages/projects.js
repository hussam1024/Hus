import { html, mount, icon, api, post, can, formModal, toast, pageHead, empty, money, fmtNum, fmtDate, on, prioBadge, downloadCSV, daysSince, state } from '../lib.js';
import { pipeline } from './workflow-ui.js';

export default async function ({ el }) {
  let filter = 'active'; let q = ''; let view = 'list';
  let rows = await api('/projects');

  const render = () => {
    const list = rows.filter((p) => (filter === 'all' || p.status === filter || (filter === 'mine' && p.my_turn)) &&
      (!q || `${p.title} ${p.code} ${p.donor} ${p.location}`.includes(q)));
    const mineCount = rows.filter((p) => p.my_turn && p.status === 'active').length;
    mount(el, html`
      ${pageHead('المشاريع', 'دورة حياة المشروع الكاملة في 15 مرحلة — من وصول اعتماد المانح حتى الإغلاق النهائي', html`
        <button class="btn" data-csv>${icon('download')} تصدير Excel</button>
        ${can('projects.create') ? html`<button class="btn primary" data-new>${icon('plus')} تسجيل مشروع معتمد</button>` : ''}`, 'layers')}
      <div class="card">
        <div class="card-head" style="flex-wrap:wrap">
          <div class="seg">
            <button data-f="active" class="${filter === 'active' ? 'active' : ''}">النشطة (${rows.filter((p) => p.status === 'active').length})</button>
            <button data-f="mine" class="${filter === 'mine' ? 'active' : ''}">بانتظاري (${mineCount})</button>
            <button data-f="closed" class="${filter === 'closed' ? 'active' : ''}">المغلقة</button>
            <button data-f="all" class="${filter === 'all' ? 'active' : ''}">الكل</button>
          </div>
          <div class="row"><input class="input" style="width:240px" placeholder="بحث في المشاريع…" data-q value="${q}">
            <div class="seg"><button data-v="list" class="${view === 'list' ? 'active' : ''}">قائمة</button><button data-v="board" class="${view === 'board' ? 'active' : ''}">لوحة المراحل</button></div></div>
        </div>
        ${!list.length ? empty('لا توجد مشاريع مطابقة', 'layers') : view === 'list' ? html`<div class="table-wrap"><table class="t">
          <thead><tr><th>المشروع</th><th>الجهة المانحة</th><th>المرحلة الحالية</th><th>المنحة</th><th>المستفيدون</th><th>في المرحلة منذ</th></tr></thead>
          <tbody>${list.map((p) => html`<tr class="clickable" data-open="${p.id}">
            <td class="title-cell"><b>${p.title} ${prioBadge(p.priority)} ${p.size === 'large' ? html`<span class="badge blue">كبير</span>` : ''}</b><span class="num">${p.code}</span> · <span>${p.location || ''}</span></td>
            <td>${p.donor || '—'}</td>
            <td style="min-width:240px">${p.status === 'closed' ? html`<span class="badge green">${icon('check')} مغلق نهائيًا ${fmtDate(p.closed_at)}</span>` : html`
              <div class="row" style="gap:6px"><b class="small">م${p.current_stage}/15</b>${p.stage_status === 'pending_approval' ? html`<span class="badge orange">بانتظار الاعتماد</span>` : ''}${p.my_turn ? html`<span class="badge solid">دورك</span>` : ''}${p.error_count ? html`<span class="badge red">${p.error_count} خطأ</span>` : ''}</div>
              <div class="small muted">${p.stage_title}</div>${pipeline(p.current_stage, 15, false)}`}</td>
            <td>${money(p.grant_amount, p.currency)}</td>
            <td class="num">${fmtNum(p.beneficiaries)}</td>
            <td class="nowrap">${p.status === 'closed' ? '—' : html`<span class="${daysSince(p.stage_started_at) > 5 ? 'badge red' : 'muted'}">${daysSince(p.stage_started_at)} يوم</span>`}</td>
          </tr>`)}</tbody></table></div>` : board(list)}
      </div>`);
  };

  const board = (list) => {
    const cols = [[1, 3, 'الاعتماد والتسعير'], [4, 6, 'الاعتماد والتخطيط'], [7, 10, 'التنفيذ والتوثيق'], [11, 13, 'المستحقات والإخلاءات'], [14, 15, 'الإقفال والإغلاق']];
    return html`<div class="card-body"><div class="kanban" style="grid-template-columns:repeat(${cols.length},minmax(220px,1fr))">${cols.map(([a, b, t]) => {
      const items = list.filter((p) => p.status === 'active' && p.current_stage >= a && p.current_stage <= b);
      return html`<div class="kcol"><h4><span>${t} <span class="muted">(م${a}–${b})</span></span><span class="badge">${items.length}</span></h4>
        ${items.map((p) => html`<div class="kcard prio-${p.priority}" data-open="${p.id}" style="cursor:pointer"><b>${p.title}</b><div class="muted small">${p.code} · م${p.current_stage}</div><div class="small">${p.stage_title}</div>${p.my_turn ? html`<span class="badge solid">دورك</span>` : ''}</div>`)}</div>`;
    })}</div></div>`;
  };

  render();
  on(el, 'click', '[data-f]', (e, t) => { filter = t.dataset.f; render(); });
  on(el, 'click', '[data-v]', (e, t) => { view = t.dataset.v; render(); });
  on(el, 'input', '[data-q]', (e, t) => { q = t.value.trim(); const pos = t.selectionStart; render(); const n = el.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); });
  on(el, 'click', '[data-open]', (e, t) => { location.hash = '#/projects/' + t.dataset.open; });
  on(el, 'click', '[data-csv]', () => downloadCSV('المشاريع', rows, [['code', 'الرمز'], ['title', 'المشروع'], ['donor', 'المانح'], ['sector', 'القطاع'], ['location', 'الموقع'], ['grant_amount', 'المنحة'], ['beneficiaries', 'المستفيدون'], ['current_stage', 'المرحلة'], ['stage_title', 'اسم المرحلة'], ['status', 'الحالة']]));
  on(el, 'click', '[data-new]', () => newProject(async (id) => { location.hash = '#/projects/' + id; }));
}

export function newProject(done) {
  formModal({
    title: 'تسجيل مشروع معتمد من الجهة المانحة', submit: 'تسجيل المشروع', wide: true,
    intro: html`<div class="note-box" style="margin-bottom:14px">هذه هي <b>العملية رقم 1</b>: وصول اعتماد المشروع من الجهة المانحة إلى المدير العام. بعد التسجيل يُوثّق تاريخ الورود ويُعكس المشروع تلقائيًا للمراحل التالية.</div>`,
    fields: [
      { name: 'title', label: 'اسم المشروع', required: true, full: true },
      { name: 'donor', label: 'الجهة المانحة', placeholder: 'مثال: هيئة الإغاثة التركية' },
      { name: 'sector', label: 'القطاع', type: 'select', options: ['الأمن الغذائي', 'الإيواء', 'المياه والإصحاح', 'التعليم', 'الصحة', 'رعاية الأيتام', 'سبل العيش', 'البناء والتعمير', 'الموسمية (رمضان/أضاحي)', 'أخرى'].map((x) => [x, x]) },
      { name: 'location', label: 'موقع التنفيذ', placeholder: 'المحافظة – المديرية' },
      { name: 'approval_date', label: 'تاريخ ورود الاعتماد', type: 'date', value: new Date().toISOString().slice(0, 10) },
      { name: 'grant_amount', label: 'مبلغ المنحة', type: 'number', step: '0.01', min: 0 },
      { name: 'currency', label: 'العملة', type: 'select', empty: false, value: state.org.currency || 'USD', options: [['USD', 'دولار أمريكي'], ['TRY', 'ليرة تركية'], ['SAR', 'ريال سعودي'], ['YER', 'ريال يمني'], ['EUR', 'يورو']] },
      { name: 'beneficiaries', label: 'عدد المستفيدين المستهدف', type: 'number', min: 0 },
      { name: 'size', label: 'حجم المشروع', type: 'select', empty: false, value: 'small', options: [['small', 'صغير (توريد مباشر دون عقود)'], ['large', 'كبير (يتطلب عقود موردين – العملية ب)']] },
      { name: 'priority', label: 'الأولوية', type: 'select', empty: false, value: 'normal', options: [['normal', 'عادية'], ['high', 'مرتفعة'], ['urgent', 'عاجلة']] },
      { name: 'description', label: 'وصف المشروع ومخرجاته', type: 'textarea' },
    ],
    onSubmit: async (v) => { const r = await post('/projects', v); toast(`تم تسجيل المشروع ${r.code}`, 'ok'); done(r.id); },
  });
}
