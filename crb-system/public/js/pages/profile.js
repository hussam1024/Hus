import { html, mount, icon, api, post, patch, state, toast, fail, pageHead, on, avatar, ago } from '../lib.js';

export default async function ({ el }) {
  const u = state.user;
  const sessions = await api('/auth/sessions');
  const catalog = await api('/admin/permissions-catalog');
  const groups = {};
  for (const p of catalog) if (u.permissions.includes(p.key)) (groups[p.group] = groups[p.group] || []).push(p.label);
  mount(el, html`${pageHead('ملفي الشخصي', 'بياناتك، كلمة المرور، وصلاحياتك الحالية', '', 'user')}
    <div class="grid g3">
      <div class="card card-pad"><div class="row">${avatar(u, 'lg')}<div><h3>${u.full_name}</h3><div class="muted">${u.job_title || ''}</div><div><span class="badge green">${u.role_name}</span> <span class="badge">${u.dept_name || 'بدون إدارة'}</span></div></div></div>
        <form id="pf" class="stack" style="margin-top:16px">
          <div class="field"><label>اسم المستخدم</label><input value="${u.username}" disabled dir="ltr"></div>
          <div class="field"><label>البريد الإلكتروني</label><input name="email" dir="ltr" value="${u.email || ''}"></div>
          <div class="field"><label>الهاتف</label><input name="phone" dir="ltr" value="${u.phone || ''}"></div>
          <button class="btn">حفظ البيانات</button></form></div>
      <div class="card card-pad"><h3 style="margin-bottom:12px">${icon('key', 'width="18" style="vertical-align:-3px"')} تغيير كلمة المرور</h3>
        <form id="cp" class="stack">
          <div class="field"><label>كلمة المرور الحالية</label><input name="current" type="password" dir="ltr" autocomplete="current-password"></div>
          <div class="field"><label>الجديدة</label><input name="next" type="password" dir="ltr" autocomplete="new-password"><span class="hint">8 أحرف على الأقل، حروف وأرقام</span></div>
          <div class="field"><label>تأكيد الجديدة</label><input name="next2" type="password" dir="ltr" autocomplete="new-password"></div>
          <button class="btn primary">تغيير كلمة المرور</button><p class="muted small">سيتم تسجيل خروجك من الأجهزة الأخرى تلقائيًا.</p></form></div>
      <div class="card card-pad"><h3 style="margin-bottom:12px">${icon('shield', 'width="18" style="vertical-align:-3px"')} الأجهزة المتصلة</h3>
        ${sessions.map((s) => html`<div class="small" style="padding:8px 0;border-bottom:1px solid var(--line-2)"><b class="ltr">${s.ip}</b> · آخر نشاط ${ago(s.last_seen)}<div class="muted" style="font-size:11px;direction:ltr;text-align:right">${(s.user_agent || '').slice(0, 80)}</div></div>`)}</div>
      <div class="card card-pad" style="grid-column:1/-1"><h3 style="margin-bottom:12px">${icon('lock', 'width="18" style="vertical-align:-3px"')} صلاحياتي في النظام ${u.isOwner ? html`<span class="badge solid">كل الصلاحيات — المضيف الرئيسي</span>` : ''}</h3>
        <div class="grid g4">${Object.entries(groups).map(([g, list]) => html`<div><b class="small" style="color:var(--green-700)">${g}</b><ul class="small" style="margin:4px 0;padding-inline-start:18px">${list.map((l) => html`<li>${l}</li>`)}</ul></div>`)}</div>
        <p class="muted small">لطلب صلاحية إضافية تواصل مع المضيف الرئيسي للنظام.</p></div>
    </div>`);
  on(el, 'submit', '#pf', async (e, f) => { e.preventDefault(); try { await patch('/auth/profile', { email: f.email.value, phone: f.phone.value }); toast('تم الحفظ', 'ok'); } catch (er) { fail(er); } });
  on(el, 'submit', '#cp', async (e, f) => {
    e.preventDefault();
    if (f.next.value !== f.next2.value) return toast('كلمتا المرور غير متطابقتين', 'err');
    try { await post('/auth/change-password', { current: f.current.value, next: f.next.value }); toast('تم تغيير كلمة المرور', 'ok'); f.reset(); } catch (er) { fail(er); }
  });
}
