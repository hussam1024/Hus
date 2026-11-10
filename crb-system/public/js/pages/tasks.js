import { html, mount, icon, api, post, patch, del, state, can, formModal, toast, fail, pageHead, empty, on, people, prioBadge, daysUntil, fmtDate, confirmBox } from '../lib.js';

const COLS = [['todo', 'للتنفيذ'], ['doing', 'قيد العمل'], ['review', 'للمراجعة'], ['done', 'منجزة']];

export default async function ({ el }) {
  let scope = 'mine'; let rows;
  const A = can('tasks.assign');
  const canAll = state.user.isOwner || can('workflow.approve');
  const load = async () => { rows = await api('/tasks?scope=' + scope); render(); };
  function card(t) {
    const du = daysUntil(t.due_date);
    return html`<div class="kcard prio-${t.priority}" draggable="true" data-task="${t.id}">
      <div class="row between"><b>${t.title}</b>${prioBadge(t.priority)}</div>
      ${t.description ? html`<div class="muted small" style="white-space:pre-wrap">${t.description.slice(0, 140)}</div>` : ''}
      <div class="row small" style="margin-top:6px;gap:6px">
        ${scope !== 'mine' ? html`<span class="badge">${t.assignee_name || '—'}</span>` : t.created_by !== state.user.id ? html`<span class="muted">من ${t.created_by_name}</span>` : ''}
        ${t.project_code ? html`<a class="badge green" href="#/projects/${t.project_id}">${t.project_code}</a>` : ''}
        ${t.due_date ? html`<span class="badge ${t.status !== 'done' && du < 0 ? 'red' : du <= 1 && t.status !== 'done' ? 'amber' : ''}">${icon('clock', 'width="12"')} ${fmtDate(t.due_date)}</span>` : ''}
      </div>
      <div class="row" style="margin-top:6px;gap:4px">${COLS.filter(([k]) => k !== t.status).map(([k, l]) => html`<button class="btn sm ghost" data-move="${t.id}" data-to="${k}" style="padding:2px 7px;font-size:11.5px">→ ${l}</button>`)}
        ${t.created_by === state.user.id || state.user.isOwner ? html`<button class="btn sm ghost" data-del="${t.id}" style="padding:2px 6px">${icon('trash', 'width="13"')}</button>` : ''}</div>
    </div>`;
  }
  function render() {
    mount(el, html`${pageHead('المهام', 'لوحة كانبان شخصية وللفريق — اسحب البطاقة بين الأعمدة لتحديث حالتها', html`<button class="btn primary" data-new>${icon('plus')} مهمة جديدة</button>`, 'tasks')}
      <div class="row" style="margin-bottom:14px"><div class="seg">
        <button data-scope="mine" class="${scope === 'mine' ? 'active' : ''}">مهامي</button>
        <button data-scope="created" class="${scope === 'created' ? 'active' : ''}">أسندتها للآخرين</button>
        ${A ? html`<button data-scope="dept" class="${scope === 'dept' ? 'active' : ''}">مهام إدارتي</button>` : ''}
        ${canAll ? html`<button data-scope="all" class="${scope === 'all' ? 'active' : ''}">كل المنتدى</button>` : ''}
      </div></div>
      ${rows.length ? html`<div class="kanban">${COLS.map(([k, l]) => { const list = rows.filter((t) => t.status === k); return html`<div class="kcol" data-col="${k}"><h4><span>${l}</span><span class="badge">${list.length}</span></h4>${list.map(card)}</div>`; })}</div>`
        : html`<div class="card">${empty('لا توجد مهام هنا', 'tasks')}</div>`}`);
  }
  await load();
  const move = async (id, to) => { try { await patch('/tasks/' + id, { status: to }); load(); } catch (e) { fail(e); } };
  on(el, 'click', '[data-scope]', (e, t) => { scope = t.dataset.scope; load(); });
  on(el, 'click', '[data-move]', (e, t) => move(t.dataset.move, t.dataset.to));
  on(el, 'click', '[data-del]', async (e, t) => { if (await confirmBox('حذف المهمة؟', { danger: true })) { await del('/tasks/' + t.dataset.del).catch(fail); load(); } });
  on(el, 'dragstart', '[data-task]', (e, t) => e.dataTransfer.setData('text/plain', t.dataset.task));
  on(el, 'dragover', '[data-col]', (e, t) => { e.preventDefault(); t.classList.add('drag-over'); });
  on(el, 'dragleave', '[data-col]', (e, t) => t.classList.remove('drag-over'));
  on(el, 'drop', '[data-col]', (e, t) => { e.preventDefault(); t.classList.remove('drag-over'); move(e.dataTransfer.getData('text/plain'), t.dataset.col); });
  on(el, 'click', '[data-new]', async () => {
    const ppl = A ? await people() : [];
    const projects = can('projects.view') ? await api('/projects?status=active') : [];
    formModal({ title: 'مهمة جديدة', fields: [
      { name: 'title', label: 'عنوان المهمة', required: true, full: true },
      ...(A ? [{ name: 'assignee_id', label: 'المكلف', type: 'select', empty: 'أنا', options: ppl.map((p) => [p.id, `${p.full_name} — ${p.dept_name || ''}`]) }] : []),
      { name: 'due_date', label: 'تاريخ الاستحقاق', type: 'date' },
      { name: 'priority', label: 'الأولوية', type: 'select', empty: false, value: 'normal', options: [['low', 'منخفضة'], ['normal', 'عادية'], ['high', 'مرتفعة'], ['urgent', 'عاجلة']] },
      { name: 'project_id', label: 'مرتبطة بمشروع', type: 'select', options: projects.map((p) => [p.id, `${p.code} — ${p.title}`]) },
      { name: 'description', label: 'التفاصيل', type: 'textarea' },
    ], onSubmit: async (v) => { await post('/tasks', v); toast('تمت الإضافة', 'ok'); load(); } });
  });
}
