// Shared rendering of the official workflow (used by project & request pages)
import { html, raw, icon, post, ago, fmtDateTime, formModal, toast, fail, departments, people, empty, confirmBox, fmtSize, uploadFile, pickFile, del, on } from '../lib.js';

export const EVENT_LABEL = {
  created: 'إنشاء', completed: 'إنجاز المرحلة', approved: 'اعتماد', submitted: 'رفع للاعتماد', returned: 'إرجاع لتصحيح خطأ', check: 'تأكيد مكتوب',
  uncheck: 'إلغاء تأكيد', comment: 'ملاحظة', file: 'مرفق', closed: 'إغلاق نهائي', quote: 'عرض سعر', quote_selected: 'اختيار عرض', claim: 'مطالبة مورد',
  payment: 'صرف', edit: 'تحديث بيانات', contract: 'عقد', contract_signed: 'توقيع عقد', contract_rejected: 'رفض عقد',
};

export function pipeline(current, total, closed) {
  return html`<div class="pipeline">${Array.from({ length: total }, (_, i) => html`<i class="${closed || i + 1 < current ? 'done' : i + 1 === current ? 'cur' : ''}"></i>`)}</div>`;
}

export function stagesHtml(d, openStage) {
  const e = d.entity;
  return html`<div class="stages">${d.stages.map((s) => {
    const open = s.n === openStage;
    const stateBadge = s.state === 'done' ? html`<span class="badge green">${icon('check')} منجزة</span>`
      : s.state === 'approval' ? html`<span class="badge orange">بانتظار اعتماد المدير العام</span>`
        : s.state === 'current' ? html`<span class="badge orange">المرحلة الحالية</span>` : html`<span class="badge">لاحقة</span>`;
    return html`<div class="stage ${s.state}">
      <div class="n">${s.state === 'done' ? icon('check', 'width="20"') : s.n}</div>
      <div class="box">
        <div class="box-head" data-toggle-stage="${s.n}"><h4>${s.title}</h4>${stateBadge}</div>
        <div class="box-body ${open ? '' : 'hidden'}" data-stage-body="${s.n}">
          <div class="kv">
            <div>الجهة المنفذة</div><div>${s.from}</div>
            <div>الجهة المستلمة</div><div>${s.to}</div>
            <div>الوسيلة</div><div>${s.via}</div>
            <div>الإجراء</div><div>${s.action}</div>
            <div>المخرج / التأكيد المطلوب</div><div><b>${s.output}</b></div>
          </div>
          ${s.checks.length ? html`<div class="checklist">${s.checks.map((c) => html`<label class="check ${c.done ? 'done' : ''} ${c.canTick ? '' : 'locked'}">
              <input type="checkbox" data-check="${c.id}" ${c.done ? raw('checked') : ''} ${c.canTick ? '' : raw('disabled')}>
              <span>${c.label}${c.done ? html`<br><span class="muted small">✔ ${c.done_by} · ${fmtDateTime(c.done_at)}</span>` : !c.canTick && s.state === 'current' ? html`<br><span class="muted small">${icon('lock', 'width="12"')} يؤكده المختص في الإدارة المعنية</span>` : ''}</span></label>`)}</div>` : ''}
          ${s.gateProblem ? html`<div class="gate" style="margin-top:10px">${icon('alert')}<span><b>متطلب قبل الإنجاز:</b> ${s.gateProblem}</span></div>` : ''}
          ${s.state === 'current' && d.can.act ? html`<div class="row" style="margin-top:12px">
              <button class="btn primary" data-complete>${icon('checkCircle')} ${s.approval ? 'رفع للمدير العام للاعتماد' : (s.n === d.stages.length ? 'إنجاز وإغلاق نهائي' : 'إنجاز المرحلة والانتقال للتالية')}</button>
            </div>` : ''}
          ${s.state === 'approval' && d.can.approve ? html`<div class="row" style="margin-top:12px">
              <button class="btn primary" data-approve>${icon('shield')} اعتماد</button>
              <button class="btn danger" data-return>${icon('undo')} رفض وإرجاع</button>
            </div>` : ''}
        </div>
      </div>
    </div>`;
  })}</div>`;
}

export function timelineHtml(events) {
  if (!events.length) return empty('لا توجد حركات بعد', 'history');
  return html`<div class="timeline">${events.map((ev) => html`<div class="tl ${ev.action}">
    <div class="row between"><b>${ev.full_name || 'النظام'} <span class="badge ${ev.action === 'returned' ? 'red' : ev.action === 'approved' || ev.action === 'closed' ? 'green' : ev.action === 'comment' ? 'blue' : ''}">${EVENT_LABEL[ev.action] || ev.action}${ev.stage ? ' · م' + ev.stage : ''}</span></b><span class="when" title="${fmtDateTime(ev.created_at)}">${ago(ev.created_at)}</span></div>
    ${ev.note ? html`<div class="${ev.action === 'comment' ? '' : 'muted'}" style="white-space:pre-wrap">${ev.note}</div>` : ''}
    ${ev.dept_name ? html`<div class="muted small">${ev.dept_name}</div>` : ''}
  </div>`)}</div>`;
}

export function errorsHtml(errors) {
  if (!errors.length) return empty('لا توجد أخطاء مقيدة على هذا الملف 👍', 'checkCircle');
  return html`<div class="table-wrap"><table class="t"><thead><tr><th>التاريخ</th><th>اسم الخطأ</th><th>المرحلة</th><th>الإدارة</th><th>المسؤول</th><th>قيّده</th><th>الحالة</th></tr></thead><tbody>
    ${errors.map((e) => html`<tr><td class="nowrap">${fmtDateTime(e.created_at)}</td><td><b>${e.error_name}</b>${e.description ? html`<div class="muted small">${e.description}</div>` : ''}</td><td>م${e.stage}</td><td>${e.dept_name || '—'}</td><td>${e.responsible_name || '—'}</td><td>${e.reported_by_name}</td><td>${e.status === 'resolved' ? html`<span class="badge green">مُعالج</span>` : html`<span class="badge red">مفتوح</span>`}</td></tr>`)}
  </tbody></table></div>`;
}

export function filesHtml(files, canDelete) {
  if (!files.length) return empty('لا توجد مرفقات', 'paperclip');
  return html`${files.map((f) => html`<div class="list-item"><div class="ic green" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;flex:none">${icon('file')}</div>
    <div class="body"><b>${f.original_name}</b><div class="meta">${f.category} · ${fmtSize(f.size)} · ${f.uploaded_by_name} · ${ago(f.created_at)}</div></div>
    <a class="btn sm" href="/api/files/${f.id}/download">${icon('download')} تنزيل</a>
    ${canDelete(f) ? html`<button class="btn sm ghost" data-del-file="${f.id}">${icon('trash')}</button>` : ''}</div>`)}`;
}

/** wires all workflow buttons inside root; reload() re-renders page */
export function bindWorkflow(root, type, d, reload) {
  const base = `/${type === 'project' ? 'projects' : 'requests'}/${d.entity.id}`;
  const offs = [];
  offs.push(on(root, 'click', '[data-toggle-stage]', (ev, t) => {
    root.querySelector(`[data-stage-body="${t.dataset.toggleStage}"]`).classList.toggle('hidden');
  }));
  offs.push(on(root, 'change', '[data-check]', async (ev, t) => {
    try { await post(base + '/check', { check_id: t.dataset.check, done: t.checked }); reload(); } catch (e) { t.checked = !t.checked; fail(e); }
  }));
  offs.push(on(root, 'click', '[data-complete]', () => {
    const stage = d.stages.find((s) => s.state === 'current');
    formModal({
      title: `إنجاز المرحلة ${stage.n}`, submit: stage.approval ? 'رفع للاعتماد' : 'تأكيد الإنجاز',
      intro: html`<div class="note-box" style="margin-bottom:12px"><b>المخرج المطلوب:</b> ${stage.output}<br>سيصل إشعار تلقائي للجهة المستلمة (${stage.to}) وللمدير العام (نسخة CC).</div>`,
      fields: [{ name: 'note', label: 'ملاحظة الإنجاز / التأكيد المكتوب (اختياري)', type: 'textarea', placeholder: stage.output }],
      onSubmit: async (v) => { await post(base + '/complete', v); toast(stage.approval ? 'رُفعت المرحلة للاعتماد' : 'تم إنجاز المرحلة ✔', 'ok'); reload(); },
    });
  }));
  offs.push(on(root, 'click', '[data-approve]', () => {
    formModal({
      title: 'اعتماد المرحلة', submit: 'اعتماد',
      fields: [{ name: 'note', label: 'ملاحظة الاعتماد (اختياري)', type: 'textarea' }],
      onSubmit: async (v) => { await post(base + '/approve', v); toast('تم الاعتماد ✔', 'ok'); reload(); },
    });
  }));
  offs.push(on(root, 'click', '[data-return]', () => openReturn(type, d, reload)));
  offs.push(on(root, 'click', '[data-comment]', () => {
    formModal({ title: 'إضافة ملاحظة على السجل', submit: 'إضافة', fields: [{ name: 'note', label: 'الملاحظة', type: 'textarea', required: true }],
      onSubmit: async (v) => { await post(base + '/comment', v); reload(); } });
  }));
  offs.push(on(root, 'click', '[data-upload]', async (ev, t) => {
    const f = await pickFile(); if (!f) return;
    try { toast('جارٍ الرفع…'); await uploadFile(f, type, d.entity.id, t.dataset.upload || 'عام'); toast('تم رفع الملف', 'ok'); reload(); } catch (e) { fail(e); }
  }));
  offs.push(on(root, 'click', '[data-del-file]', async (ev, t) => {
    if (!(await confirmBox('حذف هذا الملف نهائيًا؟', { danger: true, ok: 'حذف' }))) return;
    try { await del('/files/' + t.dataset.delFile); reload(); } catch (e) { fail(e); }
  }));
  return () => offs.forEach((f) => f());
}

export async function openReturn(type, d, reload) {
  const [deps, ppl] = await Promise.all([departments(), people()]);
  const cur = d.entity.current_stage;
  formModal({
    title: 'إرجاع لتصحيح خطأ — العملية الاستثنائية (أ)', submit: 'إرجاع وقيد الخطأ',
    intro: html`<div class="note-box" style="margin-bottom:12px">يُرجَع العمل إلى المرحلة التي وقع فيها الخطأ مباشرة، ويُقيَّد الخطأ تلقائيًا في <b>سجل الأخطاء الشهري</b> باسم الخطأ والقطاع والشخص المسؤول والمرحلة، ويصل إشعار للمسؤول وللمدير العام.</div>`,
    fields: [
      { name: 'to_stage', label: 'المرحلة التي وقع فيها الخطأ', type: 'select', required: true, value: cur, options: d.stages.filter((s) => s.n <= cur).map((s) => [s.n, `${s.n}. ${s.title}`]) },
      { name: 'error_name', label: 'اسم الخطأ', required: true, placeholder: 'مثال: نقص صور التوزيع' },
      { name: 'description', label: 'وصف الخطأ والتصحيح المطلوب', type: 'textarea' },
      { name: 'department_id', label: 'القطاع المسؤول', type: 'select', empty: 'تلقائي حسب المرحلة', options: deps.map((x) => [x.id, x.name]) },
      { name: 'responsible_user_id', label: 'الشخص المسؤول', type: 'select', empty: 'غير محدد', options: ppl.map((p) => [p.id, `${p.full_name} — ${p.dept_name || ''}`]) },
      { name: 'severity', label: 'درجة الخطأ', type: 'select', value: 'medium', empty: false, options: [['low', 'بسيط'], ['medium', 'متوسط'], ['high', 'جسيم']] },
    ],
    onSubmit: async (v) => { await post(`/${type === 'project' ? 'projects' : 'requests'}/${d.entity.id}/return`, v); toast('تم الإرجاع وقيد الخطأ', 'ok'); reload(); },
  });
}
