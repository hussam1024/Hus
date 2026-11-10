import { html, raw, mount, icon, api, post, patch, del, state, can, formModal, modal, toast, fail, pageHead, empty, on, ago, fmtDateTime, avatar, departments, showSecret, confirmBox, downloadCSV } from '../lib.js';

const ACTION_AR = {
  'auth.login': 'تسجيل دخول', 'auth.logout': 'تسجيل خروج', 'auth.failed': 'محاولة دخول فاشلة', 'auth.locked': 'قفل الحساب بعد محاولات فاشلة', 'auth.password_changed': 'تغيير كلمة المرور',
  'access.denied': 'محاولة دخول صفحة غير مصرح بها', 'user.create': 'إنشاء مستخدم', 'user.update': 'تعديل مستخدم', 'user.reset_password': 'إعادة تعيين كلمة مرور', 'user.unlock': 'فك قفل حساب', 'user.force_logout': 'إخراج من كل الأجهزة',
  'role.create': 'إنشاء دور', 'role.update': 'تعديل صلاحيات دور', 'role.delete': 'حذف دور', 'department.create': 'إنشاء إدارة', 'department.update': 'تعديل إدارة', 'department.delete': 'حذف إدارة',
  'project.create': 'إنشاء مشروع', 'project.update': 'تعديل مشروع', 'project.delete': 'حذف مشروع', 'project.complete': 'إنجاز مرحلة مشروع', 'project.approve': 'اعتماد مرحلة مشروع', 'project.return': 'إرجاع مشروع', 'project.check': 'تأكيد مكتوب',
  'request.create': 'تسجيل طلب', 'request.update': 'تعديل طلب', 'request.complete': 'إنجاز مرحلة طلب', 'request.return': 'إرجاع طلب', 'request.check': 'تأكيد مكتوب', 'request.approve': 'اعتماد طلب',
  'settings.update': 'تعديل الإعدادات', 'settings.backup': 'تنزيل نسخة احتياطية', 'file.upload': 'رفع ملف', 'file.delete': 'حذف ملف', 'claim.pay': 'صرف مستحقات', 'quote.select': 'اعتماد عرض سعر',
};

export default async function ({ el, params }) {
  const section = params[0];
  if (section === 'users') return users(el);
  if (section === 'roles') return roles(el);
  if (section === 'departments') return depts(el);
  if (section === 'audit') return audit(el);
  if (section === 'settings') return settings(el);
}

// ================================================================== USERS
async function users(el) {
  let rows, roleList, deps, catalog; let q = '';
  const load = async () => {
    [rows, roleList, deps, catalog] = await Promise.all([api('/admin/users'), api('/admin/roles'), departments(true), api('/admin/permissions-catalog')]);
    render();
  };
  function render() {
    const list = rows.filter((u) => !q || `${u.full_name} ${u.username} ${u.dept_name} ${u.job_title}`.includes(q));
    mount(el, html`${pageHead('المستخدمون وكلمات المرور', 'أنت من يُنشئ الحسابات ويوزّع كلمات المرور المؤقتة. كل موظف يغيّرها بنفسه عند أول دخول ولا يراها أحد بعد ذلك.', html`
        <button class="btn" data-csv>${icon('download')} تصدير</button><button class="btn primary" data-new>${icon('plus')} إنشاء حساب موظف</button>`, 'users')}
      <div class="grid g4" style="margin-bottom:16px">
        <div class="card stat"><div class="ic green">${icon('users')}</div><div><div class="v">${rows.filter((u) => u.is_active).length}</div><div class="l">حساب نشط</div></div></div>
        <div class="card stat"><div class="ic orange">${icon('key')}</div><div><div class="v">${rows.filter((u) => u.must_change_password && u.is_active).length}</div><div class="l">لم يغيّر كلمة المرور المؤقتة بعد</div></div></div>
        <div class="card stat"><div class="ic red">${icon('lock')}</div><div><div class="v">${rows.filter((u) => u.locked).length}</div><div class="l">حساب مقفل مؤقتًا</div></div></div>
        <div class="card stat"><div class="ic blue">${icon('eye')}</div><div><div class="v">${rows.filter((u) => !u.last_login && u.is_active).length}</div><div class="l">لم يدخل النظام بعد</div></div></div>
      </div>
      <div class="card"><div class="card-head"><input class="input" style="width:280px" placeholder="بحث…" data-q value="${q}"><span class="badge">${list.length}</span></div>
      <div class="table-wrap"><table class="t"><thead><tr><th>الموظف</th><th>اسم المستخدم</th><th>الإدارة</th><th>الدور</th><th>استثناءات</th><th>الحالة</th><th>آخر دخول</th><th>إجراءات</th></tr></thead><tbody>
        ${list.map((u) => html`<tr style="${u.is_active ? '' : 'opacity:.55'}">
          <td><div class="row" style="flex-wrap:nowrap">${avatar(u, 'sm')}<div><b>${u.full_name}</b><div class="muted small">${u.job_title || ''}</div></div></div></td>
          <td class="ltr" style="text-align:right">${u.username}</td><td>${u.dept_name || '—'}</td>
          <td><span class="badge ${u.role_key === 'owner' ? 'solid' : u.role_key === 'gm' ? 'green' : ''}">${u.role_name}</span></td>
          <td>${u.extra_perms.length ? html`<span class="badge green">+${u.extra_perms.length}</span>` : ''} ${u.denied_perms.length ? html`<span class="badge red">−${u.denied_perms.length}</span>` : ''}</td>
          <td>${!u.is_active ? html`<span class="badge red">موقوف</span>` : u.locked ? html`<span class="badge red">مقفل</span>` : u.must_change_password ? html`<span class="badge amber">كلمة مرور مؤقتة</span>` : html`<span class="badge green">نشط</span>`}</td>
          <td class="small nowrap">${u.last_login ? ago(u.last_login) : '—'}</td>
          <td class="nowrap">
            <button class="btn sm" data-edit="${u.id}" title="تعديل البيانات والصلاحيات">${icon('edit')}</button>
            <button class="btn sm" data-perm="${u.id}" title="الصلاحيات الفعلية">${icon('shield')}</button>
            <button class="btn sm" data-reset="${u.id}" title="إعادة تعيين كلمة المرور">${icon('key')}</button>
            ${u.locked ? html`<button class="btn sm" data-unlock="${u.id}" title="فك القفل">${icon('unlock')}</button>` : ''}
            ${u.id !== state.user.id ? html`<button class="btn sm ${u.is_active ? 'danger' : ''}" data-active="${u.id}" data-v="${u.is_active ? 0 : 1}" title="${u.is_active ? 'إيقاف الحساب' : 'تفعيل'}">${icon(u.is_active ? 'lock' : 'check')}</button>` : ''}
          </td></tr>`)}
      </tbody></table></div></div>`);
  }
  await load();

  const permOverrideHtml = (u) => {
    const groups = {};
    for (const p of catalog) (groups[p.group] = groups[p.group] || []).push(p);
    return html`<div class="field full"><label>استثناءات الصلاحيات لهذا الموظف تحديدًا (تتجاوز الدور والإدارة)</label>
      <div style="max-height:320px;overflow:auto;border:1px solid var(--line);border-radius:10px">
      <table class="t"><tbody>${Object.entries(groups).map(([g, list]) => html`<tr class="grp"><td colspan="2" style="background:var(--green-50);font-weight:700;color:var(--green-700)">${g}</td></tr>
        ${list.map((p) => { const v = u.extra_perms?.includes(p.key) ? 'grant' : u.denied_perms?.includes(p.key) ? 'deny' : ''; return html`<tr><td class="small">${p.label}</td><td style="width:170px"><select class="input" style="padding:3px 6px;font-size:12.5px" data-ov="${p.key}">
          <option value="" ${v === '' ? 'selected' : ''}>حسب الدور والإدارة</option><option value="grant" ${v === 'grant' ? 'selected' : ''}>✚ منح إضافي</option><option value="deny" ${v === 'deny' ? 'selected' : ''}>⛔ منع</option></select></td></tr>`; })}`)}
      </tbody></table></div></div>`;
  };

  function userForm(u = null) {
    const fields = [
      { name: 'full_name', label: 'الاسم الكامل', required: true, value: u?.full_name },
      ...(u ? [] : [{ name: 'username', label: 'اسم المستخدم (بالإنجليزية)', required: true, dir: 'ltr', placeholder: 'مثال: ahmed.fin', hint: 'يستخدمه الموظف للدخول' }]),
      { name: 'job_title', label: 'المسمى الوظيفي', value: u?.job_title },
      { name: 'department_id', label: 'الإدارة (تحدد المساحة التي يدخلها)', type: 'select', value: u?.department_id, options: deps.map((d) => [d.id, d.name]) },
      { name: 'role_id', label: 'الدور (يحدد مستوى الصلاحية)', type: 'select', required: true, value: u?.role_id ?? roleList.find((r) => r.key === 'officer')?.id, empty: false,
        options: roleList.filter((r) => r.key !== 'owner' || state.user.isOwner).map((r) => [r.id, r.name]) },
      { name: 'email', label: 'البريد الإلكتروني', dir: 'ltr', value: u?.email }, { name: 'phone', label: 'الهاتف', dir: 'ltr', value: u?.phone },
      ...(u ? [] : [{ name: 'password', label: 'كلمة مرور مؤقتة (اختياري)', dir: 'ltr', hint: 'اتركها فارغة ليولّد النظام كلمة مرور قوية تلقائيًا' }]),
      { name: 'ov', type: 'html', full: true, html: permOverrideHtml(u || {}) },
    ];
    const m = formModal({
      title: u ? `تعديل: ${u.full_name}` : 'إنشاء حساب موظف جديد', wide: true, submit: u ? 'حفظ' : 'إنشاء الحساب وتوليد كلمة المرور',
      intro: u ? '' : html`<div class="note-box" style="margin-bottom:12px"><b>كيف تعمل الصلاحيات؟</b> الإدارة = <u>أين</u> يدخل (المالية، اللوجستيات…). الدور = <u>ماذا</u> يفعل (موظف ينفّذ، مدير إدارة يُسند ويُرجع، مدقق يطّلع فقط). ويمكنك منح أو منع صلاحية محددة لهذا الشخص من الجدول أدناه.</div>`,
      fields,
      onSubmit: async (v, mm) => {
        const extra = []; const denied = [];
        mm.el.querySelectorAll('[data-ov]').forEach((s) => { if (s.value === 'grant') extra.push(s.dataset.ov); if (s.value === 'deny') denied.push(s.dataset.ov); });
        const body = { ...v, extra_perms: extra, denied_perms: denied }; delete body.ov;
        if (u) { await patch('/admin/users/' + u.id, body); toast('تم الحفظ', 'ok'); } else {
          const r = await post('/admin/users', body);
          showSecret('تم إنشاء الحساب ✔', r.username, r.temp_password);
        }
        load();
      },
    });
    return m;
  }

  on(el, 'input', '[data-q]', (e, t) => { q = t.value.trim(); render(); const n = el.querySelector('[data-q]'); n.focus(); n.setSelectionRange(q.length, q.length); });
  on(el, 'click', '[data-new]', () => userForm());
  on(el, 'click', '[data-edit]', (e, t) => userForm(rows.find((u) => u.id === Number(t.dataset.edit))));
  on(el, 'click', '[data-csv]', () => downloadCSV('المستخدمون', rows, [['full_name', 'الاسم'], ['username', 'اسم المستخدم'], ['job_title', 'المسمى'], ['dept_name', 'الإدارة'], ['role_name', 'الدور'], ['email', 'البريد'], ['phone', 'الهاتف'], ['last_login', 'آخر دخول']]));
  on(el, 'click', '[data-reset]', (e, t) => {
    const u = rows.find((x) => x.id === Number(t.dataset.reset));
    formModal({ title: `إعادة تعيين كلمة مرور: ${u.full_name}`, submit: 'توليد كلمة مرور جديدة',
      intro: html`<p class="muted" style="margin-top:0">سيُخرج الموظف من جميع أجهزته، ويُطلب منه تعيين كلمة مرور جديدة عند الدخول.</p>`,
      fields: [{ name: 'password', label: 'كلمة مرور مخصصة (اختياري)', dir: 'ltr', hint: 'اتركها فارغة لتوليد كلمة مرور قوية' }],
      onSubmit: async (v) => { const r = await post(`/admin/users/${u.id}/reset-password`, v); showSecret('كلمة المرور المؤقتة الجديدة', u.username, r.temp_password); load(); } });
  });
  on(el, 'click', '[data-unlock]', async (e, t) => { await post(`/admin/users/${t.dataset.unlock}/unlock`).catch(fail); toast('تم فك القفل', 'ok'); load(); });
  on(el, 'click', '[data-active]', async (e, t) => {
    const v = t.dataset.v === '1';
    if (!v && !(await confirmBox('إيقاف هذا الحساب؟ سيُمنع من الدخول فورًا ويُخرج من جميع الأجهزة (تبقى بياناته وسجله محفوظة).', { danger: true, ok: 'إيقاف' }))) return;
    try { await patch('/admin/users/' + t.dataset.active, { is_active: v }); load(); } catch (er) { fail(er); }
  });
  on(el, 'click', '[data-perm]', async (e, t) => {
    const u = rows.find((x) => x.id === Number(t.dataset.perm));
    const d = await api(`/admin/users/${u.id}/effective`);
    const src = (k) => (d.denied.includes(k) ? html`<span class="badge red">ممنوعة يدويًا</span>` : d.extra.includes(k) ? html`<span class="badge green">منحة إضافية</span>` : d.role.includes(k) && d.department.includes(k) ? html`<span class="badge">الدور + الإدارة</span>` : d.role.includes(k) ? html`<span class="badge blue">من الدور</span>` : d.department.includes(k) ? html`<span class="badge purple">من الإدارة</span>` : '');
    modal({ title: `الصلاحيات الفعلية: ${u.full_name}`, wide: true, body: html`
      <p class="muted" style="margin-top:0">${u.role_key === 'owner' ? 'المضيف الرئيسي يملك جميع الصلاحيات.' : `الدور: ${u.role_name} · الإدارة: ${u.dept_name || '—'}`}</p>
      <table class="t"><thead><tr><th>الصلاحية</th><th>متاحة؟</th><th>المصدر</th></tr></thead><tbody>
        ${catalog.map((p) => { const has = d.effective.includes(p.key); return html`<tr><td><span class="muted small">${p.group} ·</span> ${p.label}</td><td>${has ? html`<span class="yes">✔</span>` : html`<span class="muted">—</span>`}</td><td>${has || d.denied.includes(p.key) ? src(p.key) : ''}</td></tr>`; })}
      </tbody></table>
      <h4 style="margin-top:16px">الجلسات النشطة (${d.sessions.length})</h4>
      ${d.sessions.map((s) => html`<div class="small">${s.ip} · ${ago(s.last_seen)}</div>`)}
      ${d.sessions.length ? html`<button class="btn sm danger" style="margin-top:8px" data-kick="${u.id}">${icon('logout')} إخراجه من كل الأجهزة</button>` : ''}`,
    onMount: (m) => m.el.querySelector('[data-kick]')?.addEventListener('click', async () => { await post(`/admin/users/${u.id}/logout-all`); toast('تم', 'ok'); m.close(); }) });
  });
}

// ================================================================== ROLES & MATRIX
async function roles(el) {
  let roleList, deps, catalog, matrix; let view = 'roles';
  const load = async () => {
    [roleList, deps, catalog] = await Promise.all([api('/admin/roles'), departments(true), api('/admin/permissions-catalog')]);
    matrix = await api('/admin/access-matrix');
    render();
  };
  const grouped = () => { const g = {}; for (const p of catalog) (g[p.group] = g[p.group] || []).push(p); return g; };
  function matrixTable(cols, kind) {
    return html`<div class="table-wrap" style="max-height:70vh"><table class="t matrix"><thead><tr><th style="min-width:260px">الصلاحية</th>${cols.map((c) => html`<th class="vert">${c.name}${c.key === 'owner' ? ' 🔒' : ''}</th>`)}</tr></thead><tbody>
      ${Object.entries(grouped()).map(([g, list]) => html`<tr class="grp"><td colspan="${cols.length + 1}">${g}</td></tr>
        ${list.map((p) => html`<tr><td class="small">${p.label}<div class="muted ltr" style="font-size:10.5px;text-align:right">${p.key}</div></td>${cols.map((c) => html`<td>
          <input type="checkbox" data-m="${kind}" data-id="${c.id}" data-perm="${p.key}" ${c.key === 'owner' || c.permissions.includes(p.key) ? raw('checked') : ''} ${c.key === 'owner' ? raw('disabled') : ''}></td>`)}</tr>`)}`)}
    </tbody></table></div>`;
  }
  function render() {
    const MODS = [['projects.view', 'المشاريع'], ['requests.view_all', 'كل الطلبات'], ['logistics.view', 'اللوجستيات'], ['finance.view', 'المالية'], ['media.view', 'الإعلام'], ['secretariat.view', 'السكرتارية'], ['workflow.approve', 'الاعتماد'], ['workflow.return', 'الإرجاع'], ['errors.view', 'سجل الأخطاء'], ['reports.view', 'التقارير'], ['chat.use', 'النقاش'], ['users.manage', 'إدارة المستخدمين']];
    mount(el, html`${pageHead('الأدوار ومصفوفة الصلاحيات', 'تحكّم كامل بمن يدخل أين ومن يفعل ماذا. التغييرات تُحفظ فورًا وتسري على الجميع.', view === 'roles' ? html`<button class="btn primary" data-new-role>${icon('plus')} دور جديد</button>` : '', 'shield')}
      <div class="card card-pad" style="margin-bottom:16px"><div class="grid g3">
        <div><b style="color:var(--green-700)">① الإدارة = المجال</b><p class="muted small" style="margin:4px 0 0">موظف المالية يرى تبويب المالية فقط، وموظف اللوجستيات يرى اللوجستيات فقط… ولا يدخل أحد صفحة غيره.</p></div>
        <div><b style="color:var(--green-700)">② الدور = المستوى</b><p class="muted small" style="margin:4px 0 0">موظف (ينفّذ)، مدير إدارة (يُسند ويُرجع الأخطاء)، المدير العام (يعتمد)، مدقق (يطّلع فقط).</p></div>
        <div><b style="color:var(--green-700)">③ الاستثناء الفردي</b><p class="muted small" style="margin:4px 0 0">من صفحة المستخدمين يمكنك منح شخص صلاحية إضافية أو منعه من صلاحية بعينها.</p></div>
      </div></div>
      <div class="tabs"><button data-view="roles" class="${view === 'roles' ? 'active' : ''}">${icon('shield')} صلاحيات الأدوار (المستوى)</button><button data-view="depts" class="${view === 'depts' ? 'active' : ''}">${icon('grid')} صلاحيات الإدارات (المجال)</button><button data-view="map" class="${view === 'map' ? 'active' : ''}">${icon('users')} خريطة الوصول: من يدخل ماذا</button></div>
      ${view === 'roles' ? html`<div class="grid g4" style="margin-bottom:14px">${roleList.map((r) => html`<div class="card card-pad"><div class="row between"><b>${r.name}</b><span class="badge">${r.users_count} مستخدم</span></div><p class="muted small" style="margin:6px 0">${r.description || ''}</p>
          ${r.key !== 'owner' ? html`<div class="row"><button class="btn sm" data-edit-role="${r.id}">${icon('edit')} تعديل</button>${!r.system ? html`<button class="btn sm ghost" data-del-role="${r.id}">${icon('trash')}</button>` : ''}</div>` : html`<span class="badge solid">كل الصلاحيات دائمًا</span>`}</div>`)}</div>
        <div class="card">${matrixTable(roleList, 'role')}</div>` : ''}
      ${view === 'depts' ? html`<div class="card">${matrixTable(deps, 'dept')}</div>` : ''}
      ${view === 'map' ? html`<div class="card"><div class="table-wrap"><table class="t matrix"><thead><tr><th>الموظف</th>${MODS.map(([, l]) => html`<th class="vert">${l}</th>`)}</tr></thead><tbody>
        ${matrix.map((u) => html`<tr><td><b>${u.full_name}</b><div class="muted small">${u.dept_name || ''} · ${u.role_name}</div></td>${MODS.map(([k]) => html`<td>${u.perms.includes(k) ? html`<span class="yes">●</span>` : html`<span class="no">○</span>`}</td>`)}</tr>`)}
      </tbody></table></div></div>` : ''}`);
  }
  await load();
  on(el, 'click', '[data-view]', (e, t) => { view = t.dataset.view; render(); });
  on(el, 'change', '[data-m]', async (e, t) => {
    const kind = t.dataset.m; const id = Number(t.dataset.id);
    const col = kind === 'role' ? roleList.find((r) => r.id === id) : deps.find((d) => d.id === id);
    const set = new Set(col.permissions);
    if (t.checked) set.add(t.dataset.perm); else set.delete(t.dataset.perm);
    try {
      await patch(kind === 'role' ? `/admin/roles/${id}` : `/admin/departments/${id}`, { permissions: [...set] });
      col.permissions = [...set];
      toast(`${t.checked ? 'مُنحت' : 'سُحبت'} الصلاحية — ${col.name}`, 'ok');
      matrix = await api('/admin/access-matrix');
    } catch (er) { t.checked = !t.checked; fail(er); }
  });
  const roleForm = (r) => formModal({ title: r ? 'تعديل الدور' : 'دور جديد', fields: [
    { name: 'name', label: 'اسم الدور', required: true, value: r?.name }, { name: 'description', label: 'الوصف', type: 'textarea', value: r?.description },
  ], onSubmit: async (v) => { if (r) await patch('/admin/roles/' + r.id, v); else await post('/admin/roles', { ...v, permissions: ['chat.use', 'tasks.use', 'directory.view'] }); toast('تم الحفظ — حدد صلاحياته من المصفوفة', 'ok'); load(); } });
  on(el, 'click', '[data-new-role]', () => roleForm());
  on(el, 'click', '[data-edit-role]', (e, t) => roleForm(roleList.find((r) => r.id === Number(t.dataset.editRole))));
  on(el, 'click', '[data-del-role]', async (e, t) => { if (await confirmBox('حذف الدور؟', { danger: true })) { try { await del('/admin/roles/' + t.dataset.delRole); load(); } catch (er) { fail(er); } } });
}

// ================================================================== DEPARTMENTS
async function depts(el) {
  let deps, ppl;
  const load = async () => { [deps, ppl] = await Promise.all([departments(true), api('/people')]); render(); };
  function render() {
    mount(el, html`${pageHead('الإدارات والأقسام', 'الهيكل التنظيمي للمنتدى. الإدارات الست الأساسية مرتبطة بسير العمل في دليل العمليات.', can('departments.manage') ? html`<button class="btn primary" data-new>${icon('plus')} إدارة / قسم جديد</button>` : '', 'grid')}
      <div class="grid g3">${deps.map((d) => html`<div class="card" style="border-top:4px solid ${d.color}">
        <div class="card-head"><h3><span class="dot-c" style="background:${d.color}"></span> ${d.name}</h3><span class="badge">${d.users_count} موظف</span></div>
        <div class="card-body"><p class="muted small" style="margin-top:0">${d.description || ''}</p>
          <div class="small"><b>رئيس الإدارة:</b> ${d.head_name || '—'}</div>
          <div class="small muted" style="margin-top:4px">${ppl.filter((p) => p.department_id === d.id).map((p) => p.full_name).join('، ') || 'لا يوجد موظفون'}</div>
          ${can('departments.manage') ? html`<div class="row" style="margin-top:10px"><button class="btn sm" data-edit="${d.id}">${icon('edit')} تعديل</button>${['gm', 'secretariat', 'projects', 'logistics', 'finance', 'media'].includes(d.key) ? html`<span class="badge green">أساسية</span>` : html`<button class="btn sm ghost" data-del="${d.id}">${icon('trash')}</button>`}</div>` : ''}
        </div></div>`)}</div>`);
  }
  await load();
  const form = (d) => formModal({ title: d ? 'تعديل الإدارة' : 'إدارة جديدة', fields: [
    { name: 'name', label: 'الاسم', required: true, value: d?.name }, ...(d ? [] : [{ name: 'key', label: 'المعرّف (إنجليزي صغير)', dir: 'ltr', placeholder: 'hr' }]),
    { name: 'color', label: 'اللون', type: 'color', value: d?.color || '#01a453' },
    ...(d ? [{ name: 'head_user_id', label: 'رئيس الإدارة', type: 'select', value: d.head_user_id, options: ppl.filter((p) => p.department_id === d.id).map((p) => [p.id, p.full_name]) }] : []),
    { name: 'description', label: 'المهام والمسؤوليات', type: 'textarea', value: d?.description },
  ], onSubmit: async (v) => {
    if (d) await patch('/admin/departments/' + d.id, v);
    else await post('/admin/departments', { ...v, permissions: ['projects.view', 'files.view'] });
    toast('تم الحفظ', 'ok'); load();
  } });
  on(el, 'click', '[data-new]', () => form());
  on(el, 'click', '[data-edit]', (e, t) => form(deps.find((d) => d.id === Number(t.dataset.edit))));
  on(el, 'click', '[data-del]', async (e, t) => { if (await confirmBox('حذف الإدارة؟', { danger: true })) { try { await del('/admin/departments/' + t.dataset.del); load(); } catch (er) { fail(er); } } });
}

// ================================================================== AUDIT
async function audit(el) {
  let q = ''; let rows;
  const load = async () => { rows = await api('/admin/audit' + (q ? '?q=' + encodeURIComponent(q) : '')); render(); };
  function render() {
    mount(el, html`${pageHead('سجل التدقيق', 'سجل غير قابل للتعديل لكل عملية: من فعل ماذا، ومتى، ومن أي جهاز — آخر 500 حركة', html`<button class="btn" data-csv>${icon('download')} تصدير</button>`, 'history')}
      <div class="card"><div class="card-head"><form data-search class="row"><input class="input" style="width:280px" name="q" placeholder="ابحث في السجل…" value="${q}"><button class="btn sm">بحث</button></form>
        <span class="badge red">${rows.filter((r) => r.action === 'access.denied' || r.action.startsWith('auth.failed') || r.action === 'auth.locked').length} محاولة مشبوهة</span></div>
      <div class="table-wrap"><table class="t"><thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>العنصر</th><th>التفاصيل</th><th>IP</th></tr></thead><tbody>
        ${rows.map((r) => html`<tr style="${['access.denied', 'auth.failed', 'auth.locked'].includes(r.action) ? 'background:var(--red-50)' : ''}"><td class="nowrap small">${fmtDateTime(r.created_at)}</td><td>${r.full_name || r.username || '—'}</td>
          <td><b class="small">${ACTION_AR[r.action] || r.action}</b></td><td class="small">${r.entity || ''} ${r.entity_id || ''}</td>
          <td class="small ltr" style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right" title="${r.details || ''}">${r.details || ''}</td><td class="small ltr">${r.ip || ''}</td></tr>`)}
      </tbody></table></div></div>`);
  }
  await load();
  on(el, 'submit', '[data-search]', (e, f) => { e.preventDefault(); q = f.q.value.trim(); load(); });
  on(el, 'click', '[data-csv]', () => downloadCSV('سجل التدقيق', rows, [['created_at', 'الوقت'], ['username', 'المستخدم'], ['action', 'العملية'], ['entity', 'العنصر'], ['entity_id', 'الرقم'], ['details', 'التفاصيل'], ['ip', 'IP']]));
}

// ================================================================== SETTINGS
async function settings(el) {
  const s = await api('/admin/settings');
  mount(el, html`${pageHead('الإعدادات والنسخ الاحتياطي', 'إعدادات عامة للنظام وحماية البيانات', '', 'settings')}
    <div class="grid g2">
      <div class="card card-pad"><h3 style="margin-bottom:14px">الإعدادات العامة</h3><form id="sf" class="form-grid">
        <div class="field full"><label>اسم المنظمة</label><input name="org_name" value="${s.org_name || ''}"></div>
        <div class="field full"><label>الاسم بالإنجليزية</label><input name="org_name_en" dir="ltr" value="${s.org_name_en || ''}"></div>
        <div class="field"><label>نسبة المخصص الإداري الافتراضية %</label><input name="default_admin_fee_pct" type="number" step="0.1" value="${s.default_admin_fee_pct || ''}"></div>
        <div class="field"><label>العملة الافتراضية</label><input name="currency" dir="ltr" value="${s.currency || 'USD'}"></div>
        <div class="field"><label>التنبيه على توقف المرحلة بعد (أيام)</label><input name="sla_warning_days" type="number" value="${s.sla_warning_days || 5}"></div>
        <div class="field"><label>رابط رفع التوثيقات المعتمد</label><input name="media_upload_link" dir="ltr" value="${s.media_upload_link || ''}"></div>
        <div class="full"><button class="btn primary">حفظ الإعدادات</button></div></form></div>
      <div class="card card-pad"><h3 style="margin-bottom:10px">${icon('database', 'width="18" style="vertical-align:-3px"')} النسخ الاحتياطي</h3>
        <p class="muted">تنزيل نسخة كاملة من قاعدة البيانات (المشاريع، الطلبات، المستخدمين، النقاشات، السجلات). احفظها في مكان آمن خارج الخادم — يوصى بنسخة أسبوعية على الأقل.</p>
        <a class="btn accent" href="/api/admin/backup">${icon('download')} تنزيل نسخة احتياطية الآن</a>
        <h3 style="margin:22px 0 10px">${icon('shield', 'width="18" style="vertical-align:-3px"')} الحماية المفعّلة</h3>
        <ul class="small" style="line-height:2;padding-inline-start:18px;margin:0">
          <li>تشفير كلمات المرور (bcrypt) — لا يمكن لأحد قراءتها ولا حتى المضيف الرئيسي</li>
          <li>قفل الحساب 15 دقيقة بعد 5 محاولات خاطئة، وحد لمحاولات الدخول من نفس الجهاز</li>
          <li>كلمة مرور مؤقتة إلزامية التغيير عند أول دخول</li>
          <li>التحقق من الصلاحية في الخادم لكل طلب — لا يكفي إخفاء الصفحة</li>
          <li>حماية من CSRF و XSS و Clickjacking ورؤوس أمان صارمة</li>
          <li>سجل تدقيق لكل عملية ولكل محاولة دخول غير مصرح بها</li>
          <li>الملفات تُحفظ بأسماء عشوائية خارج المجلد العام ولا تُنزّل إلا لمن يملك الصلاحية</li>
        </ul></div>
    </div>`);
  on(el, 'submit', '#sf', async (e, f) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f).entries());
    try { await api('/admin/settings', { method: 'PUT', body: v }); toast('تم الحفظ', 'ok'); } catch (er) { fail(er); }
  });
}
