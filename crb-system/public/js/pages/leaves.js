import { html, mount, icon, api, post, can, state, formModal, toast, fail, pageHead, empty, on, people, fmtDate, today } from '../lib.js';

const KIND = { annual: 'سنوية', sick: 'مرضية', emergency: 'اضطرارية', unpaid: 'بدون راتب', mission: 'مهمة عمل' };
const ST = { pending: ['بانتظار الاعتماد', 'amber'], approved: ['معتمدة', 'green'], rejected: ['مرفوضة', 'red'] };

export default async function ({ el }) {
  const A = can('leaves.approve'); const R = can('leaves.request');
  let rows;
  const load = async () => { rows = await api('/leaves'); render(); };
  function render() {
    const mine = rows.filter((l) => l.user_id === state.user.id);
    const used = mine.filter((l) => l.status === 'approved' && l.kind === 'annual' && l.start_date.startsWith(String(new Date().getFullYear()))).reduce((a, l) => a + l.days, 0);
    const pend = rows.filter((l) => l.status === 'pending' && l.user_id !== state.user.id);
    const table = (list, showName) => list.length ? html`<div class="table-wrap"><table class="t"><thead><tr>${showName ? html`<th>الموظف</th>` : ''}<th>النوع</th><th>من</th><th>إلى</th><th>الأيام</th><th>البديل</th><th>السبب</th><th>الحالة</th>${A ? html`<th></th>` : ''}</tr></thead><tbody>
      ${list.map((l) => html`<tr>${showName ? html`<td><b>${l.full_name}</b><div class="muted small">${l.dept_name || ''}</div></td>` : ''}<td>${KIND[l.kind]}</td><td>${fmtDate(l.start_date)}</td><td>${fmtDate(l.end_date)}</td><td class="num">${l.days}</td><td>${l.delegate_name || '—'}</td><td class="small">${l.reason || ''}</td>
        <td><span class="badge ${ST[l.status][1]}">${ST[l.status][0]}</span>${l.decided_by_name ? html`<div class="muted small">${l.decided_by_name}${l.decision_note ? ': ' + l.decision_note : ''}</div>` : ''}</td>
        ${A ? html`<td class="nowrap">${l.status === 'pending' && l.user_id !== state.user.id ? html`<button class="btn sm primary" data-decide="${l.id}" data-s="approved">اعتماد</button> <button class="btn sm danger" data-decide="${l.id}" data-s="rejected">رفض</button>` : ''}</td>` : ''}</tr>`)}
    </tbody></table></div>` : empty('لا توجد طلبات', 'briefcase');
    mount(el, html`${pageHead('الإجازات', 'طلب الإجازة، تعيين البديل خلال الغياب، واعتمادها إلكترونيًا', R ? html`<button class="btn primary" data-new>${icon('plus')} طلب إجازة</button>` : '', 'briefcase')}
      ${R ? html`<div class="grid g3" style="margin-bottom:16px"><div class="card stat"><div class="ic green">${icon('calendar')}</div><div><div class="v">${used}</div><div class="l">يوم إجازة سنوية معتمدة هذا العام</div></div></div>
        <div class="card stat"><div class="ic orange">${icon('clock')}</div><div><div class="v">${mine.filter((l) => l.status === 'pending').length}</div><div class="l">طلب لي بانتظار الاعتماد</div></div></div>
        ${A ? html`<div class="card stat"><div class="ic red">${icon('shield')}</div><div><div class="v">${pend.length}</div><div class="l">طلب بانتظار قرارك</div></div></div>` : ''}</div>` : ''}
      ${A ? html`<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>${icon('shield')} طلبات الطاقم</h3></div>${table(rows.filter((l) => l.user_id !== state.user.id), true)}</div>` : ''}
      ${R ? html`<div class="card"><div class="card-head"><h3>${icon('user')} طلباتي</h3></div>${table(mine, false)}</div>` : ''}`);
  }
  await load();
  on(el, 'click', '[data-new]', async () => {
    const ppl = (await people()).filter((p) => p.id !== state.user.id && (!state.user.department_id || p.department_id === state.user.department_id));
    formModal({ title: 'طلب إجازة', fields: [
      { name: 'kind', label: 'النوع', type: 'select', empty: false, options: Object.entries(KIND) },
      { name: 'delegate_id', label: 'البديل خلال الغياب', type: 'select', options: ppl.map((p) => [p.id, p.full_name]) },
      { name: 'start_date', label: 'من', type: 'date', required: true, min: today() }, { name: 'end_date', label: 'إلى', type: 'date', required: true, min: today() },
      { name: 'reason', label: 'السبب', type: 'textarea' },
    ], onSubmit: async (v) => { await post('/leaves', v); toast('أُرسل الطلب للاعتماد', 'ok'); load(); } });
  });
  on(el, 'click', '[data-decide]', (e, t) => formModal({ title: t.dataset.s === 'approved' ? 'اعتماد الإجازة' : 'رفض الإجازة', submit: 'تأكيد',
    fields: [{ name: 'note', label: 'ملاحظة (اختياري)', type: 'textarea' }],
    onSubmit: async (v) => { await post(`/leaves/${t.dataset.decide}/decide`, { ...v, status: t.dataset.s }); load(); } }));
}
