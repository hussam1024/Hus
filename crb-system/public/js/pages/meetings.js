import { html, mount, icon, api, post, patch, del, can, formModal, toast, fail, pageHead, empty, on, people, fmtDateTime, confirmBox, printHead } from '../lib.js';

const ST = { scheduled: ['مجدول', 'blue'], done: ['منعقد', 'green'], cancelled: ['ملغى', 'red'] };

export default async function ({ el }) {
  const M = can('meetings.manage');
  let rows;
  const load = async () => { rows = await api('/meetings'); render(); };
  function render() {
    mount(el, html`${printHead('محاضر الاجتماعات')}${pageHead('الاجتماعات والمحاضر', 'جدولة الاجتماعات، تدوين المحاضر، وتحويل القرارات إلى مهام متابعة', M ? html`<button class="btn primary" data-new>${icon('plus')} اجتماع جديد</button>` : '', 'coffee')}
      <div class="stack">${rows.length ? rows.map((m) => html`<div class="card">
        <div class="card-head"><div><h3>${m.title}</h3><div class="muted small">${fmtDateTime(m.meeting_date)} · ${m.location || ''} · دعا إليه ${m.created_by_name}</div></div>
          <div class="row"><span class="badge ${ST[m.status][1]}">${ST[m.status][0]}</span>${M ? html`<button class="btn sm" data-edit="${m.id}">${icon('edit')} المحضر</button><button class="btn sm" data-task="${m.id}">${icon('tasks')} قرار → مهمة</button><button class="btn sm ghost" data-del="${m.id}">${icon('trash')}</button>` : ''}</div></div>
        <div class="card-body grid g3">
          <div><b class="small">الحضور</b><div class="row" style="margin-top:6px;gap:4px">${m.attendees.map((a) => html`<span class="badge">${a.full_name}</span>`)}</div></div>
          <div><b class="small">جدول الأعمال</b><div style="white-space:pre-wrap" class="muted">${m.agenda || '—'}</div></div>
          <div><b class="small">المحضر والقرارات</b><div style="white-space:pre-wrap">${m.minutes || html`<span class="muted">لم يُدوَّن بعد</span>`}</div></div>
        </div>
        ${m.tasks.length ? html`<div class="card-body" style="border-top:1px solid var(--line-2)"><b class="small">مهام المتابعة الناتجة</b>${m.tasks.map((t) => html`<div class="row small" style="margin-top:4px"><span class="badge ${t.status === 'done' ? 'green' : 'amber'}">${t.status === 'done' ? 'منجزة' : 'مفتوحة'}</span> ${t.title} — ${t.assignee_name || ''}</div>`)}</div>` : ''}
      </div>`) : html`<div class="card">${empty('لا توجد اجتماعات', 'coffee')}</div>`}</div>`);
  }
  await load();
  const form = async (m = {}) => {
    const ppl = await people();
    formModal({ title: m.id ? 'تحديث الاجتماع والمحضر' : 'اجتماع جديد', wide: true, fields: [
      { name: 'title', label: 'العنوان', required: true, value: m.title }, { name: 'meeting_date', label: 'الموعد', type: 'datetime-local', value: m.meeting_date },
      { name: 'location', label: 'المكان / الرابط', value: m.location },
      ...(m.id ? [{ name: 'status', label: 'الحالة', type: 'select', empty: false, value: m.status, options: Object.entries(ST).map(([k, v]) => [k, v[0]]) }] : []),
      { name: 'attendees', label: 'المدعوون', type: 'multi', value: (m.attendees || []).map((a) => a.id), options: ppl.map((p) => [p.id, `${p.full_name} — ${p.dept_name || ''}`]) },
      { name: 'agenda', label: 'جدول الأعمال', type: 'textarea', value: m.agenda },
      { name: 'minutes', label: 'المحضر والقرارات', type: 'textarea', rows: 6, value: m.minutes },
    ], onSubmit: async (v) => { if (m.id) await patch('/meetings/' + m.id, v); else await post('/meetings', v); toast('تم الحفظ', 'ok'); load(); } });
  };
  on(el, 'click', '[data-new]', () => form());
  on(el, 'click', '[data-edit]', (e, t) => form(rows.find((x) => x.id === Number(t.dataset.edit))));
  on(el, 'click', '[data-del]', async (e, t) => { if (await confirmBox('حذف الاجتماع؟', { danger: true })) { await del('/meetings/' + t.dataset.del).catch(fail); load(); } });
  on(el, 'click', '[data-task]', async (e, t) => {
    const ppl = await people();
    formModal({ title: 'تحويل قرار إلى مهمة متابعة', fields: [
      { name: 'title', label: 'القرار / المهمة', required: true, full: true }, { name: 'assignee_id', label: 'المكلف', type: 'select', required: true, options: ppl.map((p) => [p.id, p.full_name]) },
      { name: 'due_date', label: 'موعد الإنجاز', type: 'date' }, { name: 'priority', label: 'الأولوية', type: 'select', empty: false, options: [['normal', 'عادية'], ['high', 'مرتفعة'], ['urgent', 'عاجلة']] },
    ], onSubmit: async (v) => { await post('/tasks', { ...v, meeting_id: Number(t.dataset.task) }); toast('أُسندت المهمة', 'ok'); load(); } });
  });
}
