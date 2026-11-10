import { html, mount, icon, api, patch, del, state, can, formModal, toast, fail, fmtDate, on, tabs, prioBadge, confirmBox, people, departments, daysUntil, printHead } from '../lib.js';
import { stagesHtml, timelineHtml, errorsHtml, filesHtml, bindWorkflow, openReturn, pipeline } from './workflow-ui.js';

export default async function ({ el, params }) {
  const id = Number(params[0]);
  let tab = 'workflow'; let d; let unbind;
  const load = async () => { d = await api('/requests/' + id); render(); };
  const reload = () => load().catch(fail);

  const dl = (label, date) => {
    if (!date) return html`<div><div class="muted small">${label}</div><b>—</b></div>`;
    const n = daysUntil(date);
    return html`<div><div class="muted small">${label}</div><b>${fmtDate(date)}</b> ${d.entity.status === 'active' ? html`<span class="badge ${n < 0 ? 'red' : n <= 1 ? 'amber' : 'green'}">${n < 0 ? `متأخر ${-n}` : `باقي ${n}`} يوم</span>` : ''}</div>`;
  };

  function render() {
    if (unbind) unbind();
    const r = d.entity; const closed = r.status === 'closed';
    const cur = d.stages[r.current_stage - 1];
    mount(el, html`
      ${printHead('ملف طلب ' + r.code)}
      <div class="page-head"><div>
          <a href="#/requests" class="small no-print">الطلبات</a>
          <h1 style="margin-top:4px">${r.title} ${prioBadge(r.priority)}</h1>
          <p><span class="num">${r.code}</span> · ${r.donor || ''} ${r.project_label ? html`· مشروع: <a href="#/projects/${r.project_id}">${r.project_label}</a>` : ''}</p></div>
        <div class="actions">
          <button class="btn" data-print>${icon('printer')} طباعة</button>
          ${d.can.edit && !closed ? html`<button class="btn" data-edit>${icon('edit')} تعديل</button>` : ''}
          ${d.can.return && !closed ? html`<button class="btn danger" data-return>${icon('undo')} إرجاع لتصحيح خطأ</button>` : ''}
          ${state.user.isOwner ? html`<button class="btn ghost" data-delete>${icon('trash')}</button>` : ''}
        </div></div>

      <div class="card card-pad" style="margin-bottom:16px">
        <div class="row between"><div>${closed ? html`<span class="badge green" style="font-size:14px">${icon('checkCircle')} أُنجز الطلب وسُلّم للجهة المانحة</span>` : html`<b>المرحلة ${r.current_stage} من 6:</b> ${cur.title}`}</div>
          ${d.can.act && !closed ? html`<span class="badge solid">هذه المرحلة من مسؤوليتك</span>` : ''}</div>
        ${pipeline(r.current_stage, 6, closed)}
        <div class="grid g4" style="margin-top:12px">
          ${dl('مهلة الجهة المانحة', r.donor_deadline)}
          <div><div class="muted small">القطاع المختص</div><b>${r.sector_name || '—'}</b>${r.sector_deadline ? html`<div class="small">حتى ${fmtDate(r.sector_deadline)}</div>` : ''}</div>
          <div><div class="muted small">الموظف المكلف</div><b>${r.assignee_name || '—'}</b>${r.assignee_deadline ? html`<div class="small">حتى ${fmtDate(r.assignee_deadline)}</div>` : ''}</div>
          <div><div class="muted small">تاريخ الورود</div><b>${fmtDate(r.received_at)}</b></div>
        </div>
      </div>

      ${(d.can.assignSector || d.can.assignEmployee || d.can.deliver) ? html`<div class="card card-pad" style="margin-bottom:16px;border-color:var(--orange)">
        <div class="row between"><div><b>${icon('target', 'width="18" style="vertical-align:-4px;color:var(--orange)"')} المطلوب منك في هذه المرحلة</b>
          <div class="muted">${d.can.assignSector ? 'حدد القطاع المختص ومدة الإنجاز (يجب ألا تتجاوز مهلة المانح).' : d.can.assignEmployee ? 'كلّف أحد أفراد القطاع رسميًا بمدة أقصر من مدة القطاع احتياطًا.' : 'نفّذ الطلب، أرفق المخرجات، وراجعها قبل الرفع لمسؤول المشاريع.'}</div></div>
          ${d.can.assignSector ? html`<button class="btn accent" data-sector>${icon('grid')} تحديد القطاع والمدة</button>` : ''}
          ${d.can.assignEmployee ? html`<button class="btn accent" data-assign>${icon('user')} التكليف الرسمي</button>` : ''}
          ${d.can.deliver ? html`<div class="row"><button class="btn" data-upload="مخرجات الطلب">${icon('upload')} إرفاق ملف</button><button class="btn accent" data-deliver>${icon('edit')} وصف الإنجاز</button></div>` : ''}
        </div></div>` : ''}

      ${tabs([{ id: 'workflow', label: 'سير العمل', icon: 'layers' }, { id: 'details', label: 'التفاصيل والمخرجات', icon: 'file' }, { id: 'files', label: `المرفقات (${d.files.length})`, icon: 'paperclip' }, { id: 'errors', label: 'الأخطاء', icon: 'flag', count: d.errors.length }, { id: 'log', label: 'السجل', icon: 'history' }], tab)}
      ${tab === 'workflow' ? html`<div class="grid g3"><div class="span2">${stagesHtml(d, r.current_stage)}</div><div class="card"><div class="card-head"><h3>${icon('history')} الحركات</h3><button class="btn sm" data-comment>${icon('plus')} ملاحظة</button></div><div class="card-body">${timelineHtml(d.events.slice(0, 12))}</div></div></div>` : ''}
      ${tab === 'details' ? html`<div class="grid g2"><div class="card"><div class="card-head"><h3>نص الطلب</h3></div><div class="card-body" style="white-space:pre-wrap">${r.description || '—'}</div></div>
        <div class="card"><div class="card-head"><h3>مخرجات التنفيذ</h3></div><div class="card-body" style="white-space:pre-wrap">${r.deliverable || 'لم تُرفع المخرجات بعد'}</div></div></div>` : ''}
      ${tab === 'files' ? html`<div class="card"><div class="card-head"><h3>المرفقات</h3><button class="btn sm primary" data-upload="عام">${icon('upload')} رفع ملف</button></div>${filesHtml(d.files, (f) => state.user.isOwner || f.uploaded_by_name === state.user.full_name)}</div>` : ''}
      ${tab === 'errors' ? html`<div class="card">${errorsHtml(d.errors)}</div>` : ''}
      ${tab === 'log' ? html`<div class="card card-pad">${timelineHtml(d.events)}</div>` : ''}
    `);
    unbind = bindWorkflow(el, 'request', d, reload);
  }
  await load();

  on(el, 'click', '[data-tab]', (e, t) => { tab = t.dataset.tab; render(); });
  on(el, 'click', '[data-print]', () => window.print());
  on(el, 'click', '[data-return]', () => openReturn('request', d, reload));
  on(el, 'click', '[data-delete]', async () => { if (await confirmBox('حذف الطلب نهائيًا؟', { danger: true })) { await del('/requests/' + id).catch(fail); location.hash = '#/requests'; } });
  on(el, 'click', '[data-sector]', async () => {
    const deps = await departments();
    formModal({ title: 'عكس الطلب إلى القطاع المختص', fields: [
      { name: 'sector_dept_id', label: 'القطاع المختص', type: 'select', required: true, options: deps.map((x) => [x.id, x.name]), value: d.entity.sector_dept_id },
      { name: 'sector_deadline', label: 'مدة الإنجاز (حتى تاريخ)', type: 'date', required: true, max: d.entity.donor_deadline || undefined, value: d.entity.sector_deadline, hint: d.entity.donor_deadline ? `مهلة المانح: ${fmtDate(d.entity.donor_deadline)}` : '' },
    ], onSubmit: async (v) => { await patch('/requests/' + id, v); toast('تم التحديد. أنجز المرحلة الآن لإبلاغ القطاع.', 'ok'); reload(); } });
  });
  on(el, 'click', '[data-assign]', async () => {
    const ppl = (await people()).filter((p) => p.department_id === d.entity.sector_dept_id || can('workflow.override'));
    formModal({ title: 'التكليف الرسمي بتنفيذ الطلب', fields: [
      { name: 'assignee_id', label: 'الموظف المكلف', type: 'select', required: true, options: ppl.map((p) => [p.id, `${p.full_name} — ${p.dept_name || ''}`]), value: d.entity.assignee_id },
      { name: 'assignee_deadline', label: 'مهلة الموظف', type: 'date', required: true, max: d.entity.sector_deadline || undefined, value: d.entity.assignee_deadline, hint: `يجب أن تكون أقصر من مهلة القطاع (${fmtDate(d.entity.sector_deadline)}) احتياطًا` },
    ], onSubmit: async (v) => { await patch('/requests/' + id, v); toast('تم التكليف وإشعار الموظف', 'ok'); reload(); } });
  });
  on(el, 'click', '[data-deliver]', () => formModal({ title: 'مخرجات تنفيذ الطلب', fields: [{ name: 'deliverable', label: 'وصف ما تم إنجازه وروابط المخرجات', type: 'textarea', rows: 7, required: true, value: d.entity.deliverable }],
    onSubmit: async (v) => { await patch('/requests/' + id, v); reload(); } }));
  on(el, 'click', '[data-edit]', () => formModal({ title: 'تعديل بيانات الطلب', fields: [
    { name: 'title', label: 'العنوان', required: true, value: d.entity.title, full: true }, { name: 'donor', label: 'المانح', value: d.entity.donor },
    { name: 'donor_deadline', label: 'مهلة المانح', type: 'date', value: d.entity.donor_deadline },
    { name: 'priority', label: 'الأولوية', type: 'select', empty: false, value: d.entity.priority, options: [['normal', 'عادية'], ['high', 'مرتفعة'], ['urgent', 'عاجلة']] },
    { name: 'description', label: 'التفاصيل', type: 'textarea', value: d.entity.description },
  ], onSubmit: async (v) => { await patch('/requests/' + id, v); reload(); } }));
}
