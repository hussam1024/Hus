import { html, mount, icon, api, post, patch, can, formModal, toast, fail, pageHead, empty, on, fmtDate, bars, departments, people, downloadCSV, printHead } from '../lib.js';

export default async function ({ el }) {
  const M = can('errors.manage');
  let month = new Date().toISOString().slice(0, 7); let d;
  const load = async () => { d = await api('/errors' + (month ? '?month=' + month : '')); render(); };
  function render() {
    const label = month ? new Intl.DateTimeFormat('ar-u-nu-latn', { month: 'long', year: 'numeric' }).format(new Date(month + '-01')) : 'كل الفترات';
    mount(el, html`${printHead('سجل الأخطاء الشهري — ' + label)}
      ${pageHead('سجل الأخطاء الشهري', 'يُقيَّد كل خطأ على المسؤول عنه في المرحلة التي وقع فيها — لمتابعته والتركيز عليه في التقييم', html`
        <input type="month" class="input" style="width:170px" data-month value="${month}"><button class="btn" data-allm>كل الفترات</button>
        <button class="btn" data-print>${icon('printer')} طباعة</button><button class="btn" data-csv>${icon('download')} تصدير</button>
        ${M ? html`<button class="btn primary" data-new>${icon('plus')} قيد خطأ يدوي</button>` : ''}`, 'flag')}
      <div class="grid g3" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>حسب الإدارة</h3><span class="badge red">${d.rows.length} خطأ</span></div><div class="card-body">${bars(Object.entries(d.byDept).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value), { color: 'var(--orange)' })}</div></div>
        <div class="card"><div class="card-head"><h3>حسب الموظف</h3></div><div class="card-body">${bars(Object.entries(d.byUser).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8), { color: 'var(--orange)' })}</div></div>
        <div class="card"><div class="card-head"><h3>حسب المرحلة</h3></div><div class="card-body">${bars(Object.entries(d.byStage).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8), { color: 'var(--orange)' })}</div></div>
      </div>
      <div class="card"><div class="card-head"><h3>نموذج سجل الأخطاء — ${label}</h3></div>
      ${d.rows.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>م</th><th>التاريخ</th><th>المشروع / الطلب</th><th>القطاع</th><th>اسم الموظف</th><th>المرحلة</th><th>اسم الخطأ</th><th>الدرجة</th><th>قيّده</th><th>الحالة</th></tr></thead><tbody>
        ${d.rows.map((e, i) => html`<tr><td>${i + 1}</td><td class="nowrap">${fmtDate(e.created_at)}</td>
          <td>${e.entity_type === 'project' || e.entity_type === 'request' ? html`<a href="#/${e.entity_type}s/${e.entity_id}">${e.entity_title}</a>` : e.entity_title || '—'}</td>
          <td>${e.dept_name || '—'}</td><td>${e.responsible_name || '—'}</td><td class="small">م${e.stage || '—'} ${e.stage_title || ''}</td>
          <td><b>${e.error_name}</b>${e.description ? html`<div class="muted small">${e.description}</div>` : ''}</td>
          <td><span class="badge ${e.severity === 'high' ? 'red' : e.severity === 'low' ? '' : 'amber'}">${{ low: 'بسيط', medium: 'متوسط', high: 'جسيم' }[e.severity]}</span></td><td class="small">${e.reported_by_name || ''}</td>
          <td>${M ? html`<button class="btn sm ${e.status === 'resolved' ? '' : 'primary'}" data-toggle="${e.id}" data-s="${e.status === 'resolved' ? 'open' : 'resolved'}">${e.status === 'resolved' ? '✔ مُعالج' : 'تعليم كمُعالج'}</button>` : e.status === 'resolved' ? html`<span class="badge green">مُعالج</span>` : html`<span class="badge red">مفتوح</span>`}</td></tr>`)}
      </tbody></table></div>` : empty('لا أخطاء مقيدة في هذه الفترة 🎉', 'checkCircle')}</div>`);
  }
  await load();
  on(el, 'change', '[data-month]', (e, t) => { month = t.value; load(); });
  on(el, 'click', '[data-allm]', () => { month = ''; load(); });
  on(el, 'click', '[data-print]', () => window.print());
  on(el, 'click', '[data-csv]', () => downloadCSV('سجل الأخطاء ' + (month || ''), d.rows, [['created_at', 'التاريخ'], ['entity_title', 'المشروع / الطلب'], ['dept_name', 'القطاع'], ['responsible_name', 'اسم الموظف'], ['stage', 'المرحلة'], ['error_name', 'اسم الخطأ'], ['description', 'الوصف'], ['severity', 'الدرجة'], ['status', 'الحالة']]));
  on(el, 'click', '[data-toggle]', async (e, t) => { try { await patch('/errors/' + t.dataset.toggle, { status: t.dataset.s }); load(); } catch (er) { fail(er); } });
  on(el, 'click', '[data-new]', async () => {
    const [deps, ppl] = await Promise.all([departments(), people()]);
    formModal({ title: 'قيد خطأ يدوي', fields: [
      { name: 'error_name', label: 'اسم الخطأ', required: true }, { name: 'entity_title', label: 'المشروع / الطلب / النشاط' },
      { name: 'department_id', label: 'القطاع', type: 'select', options: deps.map((x) => [x.id, x.name]) },
      { name: 'responsible_user_id', label: 'الموظف المسؤول', type: 'select', options: ppl.map((p) => [p.id, p.full_name]) },
      { name: 'stage_title', label: 'المرحلة' }, { name: 'severity', label: 'الدرجة', type: 'select', empty: false, value: 'medium', options: [['low', 'بسيط'], ['medium', 'متوسط'], ['high', 'جسيم']] },
      { name: 'description', label: 'الوصف', type: 'textarea' },
    ], onSubmit: async (v) => { await post('/errors', v); toast('تم القيد', 'ok'); load(); } });
  });
}
