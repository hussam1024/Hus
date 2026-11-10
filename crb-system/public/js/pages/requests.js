import { html, mount, icon, api, post, can, formModal, toast, pageHead, empty, fmtDate, on, prioBadge, daysUntil, downloadCSV, today } from '../lib.js';
import { pipeline } from './workflow-ui.js';

export default async function ({ el }) {
  let filter = 'active';
  const rows = await api('/requests');
  const projects = can('projects.view') ? await api('/projects?status=active') : [];

  const deadlineBadge = (r) => {
    if (r.status === 'closed') return html`<span class="badge green">منجز ${fmtDate(r.closed_at)}</span>`;
    if (!r.donor_deadline) return html`<span class="muted">—</span>`;
    const n = daysUntil(r.donor_deadline);
    return html`<span class="badge ${n < 0 ? 'red' : n <= 2 ? 'amber' : 'green'}">${n < 0 ? `متأخر ${-n} يوم` : n === 0 ? 'اليوم' : `باقي ${n} يوم`}</span><div class="muted small">${fmtDate(r.donor_deadline)}</div>`;
  };

  const render = () => {
    const list = rows.filter((r) => filter === 'all' || (filter === 'mine' ? r.my_turn && r.status === 'active' : filter === 'overdue' ? r.status === 'active' && r.donor_deadline && r.donor_deadline < today() : r.status === filter));
    mount(el, html`
      ${pageHead('الطلبات', 'طلبات الجهة المانحة: الاستلام ← القطاع المختص ← الموظف المكلف ← مراجعة المشاريع ← المراجعة النهائية والرفع', html`
        <button class="btn" data-csv>${icon('download')} تصدير</button>
        ${can('requests.create') ? html`<button class="btn primary" data-new>${icon('plus')} تسجيل طلب وارد</button>` : ''}`, 'inbox')}
      <div class="card">
        <div class="card-head"><div class="seg">
          <button data-f="active" class="${filter === 'active' ? 'active' : ''}">المفتوحة</button>
          <button data-f="mine" class="${filter === 'mine' ? 'active' : ''}">بانتظاري (${rows.filter((r) => r.my_turn && r.status === 'active').length})</button>
          <button data-f="overdue" class="${filter === 'overdue' ? 'active' : ''}">المتأخرة</button>
          <button data-f="closed" class="${filter === 'closed' ? 'active' : ''}">المنجزة</button>
          <button data-f="all" class="${filter === 'all' ? 'active' : ''}">الكل</button></div></div>
        ${list.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>الطلب</th><th>المرحلة</th><th>القطاع المختص</th><th>المكلف</th><th>مهلة المانح</th></tr></thead><tbody>
          ${list.map((r) => html`<tr class="clickable" data-open="${r.id}">
            <td class="title-cell"><b>${r.title} ${prioBadge(r.priority)}</b><span class="num">${r.code}</span> · ${r.donor || ''}</td>
            <td style="min-width:220px">${r.status === 'closed' ? html`<span class="badge green">مُسلّم للمانح</span>` : html`<b class="small">م${r.current_stage}/6</b> ${r.my_turn ? html`<span class="badge solid">دورك</span>` : ''}<div class="small muted">${r.stage_title}</div>${pipeline(r.current_stage, 6)}`}</td>
            <td>${r.sector_name || html`<span class="muted">لم يُحدد</span>`}${r.sector_deadline ? html`<div class="muted small">حتى ${fmtDate(r.sector_deadline)}</div>` : ''}</td>
            <td>${r.assignee_name || html`<span class="muted">—</span>`}${r.assignee_deadline ? html`<div class="muted small">حتى ${fmtDate(r.assignee_deadline)}</div>` : ''}</td>
            <td>${deadlineBadge(r)}</td></tr>`)}
        </tbody></table></div>` : empty('لا توجد طلبات هنا', 'inbox')}
      </div>`);
  };
  render();
  on(el, 'click', '[data-f]', (e, t) => { filter = t.dataset.f; render(); });
  on(el, 'click', '[data-open]', (e, t) => { location.hash = '#/requests/' + t.dataset.open; });
  on(el, 'click', '[data-csv]', () => downloadCSV('الطلبات', rows, [['code', 'الرمز'], ['title', 'الطلب'], ['donor', 'المانح'], ['received_at', 'تاريخ الورود'], ['donor_deadline', 'مهلة المانح'], ['sector_name', 'القطاع'], ['assignee_name', 'المكلف'], ['current_stage', 'المرحلة'], ['status', 'الحالة']]));
  on(el, 'click', '[data-new]', () => formModal({
    title: 'تسجيل طلب وارد من الجهة المانحة', submit: 'تسجيل',
    intro: html`<div class="note-box" style="margin-bottom:12px">العملية رقم 1: ينزل الطلب إلى بريد المدير العام وسكرتارية الإدارة العامة. سجّل تاريخ وروده ومهلته بدقة — يتابع النظام المهلة تلقائيًا وينبه عند الاقتراب منها.</div>`,
    fields: [
      { name: 'title', label: 'عنوان الطلب', required: true, full: true },
      { name: 'donor', label: 'الجهة المانحة' },
      { name: 'project_id', label: 'مرتبط بمشروع (اختياري)', type: 'select', options: projects.map((p) => [p.id, `${p.code} — ${p.title}`]) },
      { name: 'received_at', label: 'تاريخ الورود', type: 'date', value: today() },
      { name: 'donor_deadline', label: 'مهلة المانح', type: 'date', required: true },
      { name: 'priority', label: 'الأولوية', type: 'select', empty: false, options: [['normal', 'عادية'], ['high', 'مرتفعة'], ['urgent', 'عاجلة']] },
      { name: 'description', label: 'نص الطلب وتفاصيله', type: 'textarea' },
    ],
    onSubmit: async (v) => { const r = await post('/requests', v); toast(`تم تسجيل الطلب ${r.code}`, 'ok'); location.hash = '#/requests/' + r.id; },
  }));
}
