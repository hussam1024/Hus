import { html, mount, icon, api, post, patch, del, can, formModal, toast, fail, pageHead, empty, fmtDate, on, people, confirmBox, daysUntil } from '../lib.js';

const ST = [['planned', 'مخطط', ''], ['covered', 'تمت التغطية', 'blue'], ['uploaded', 'تم الرفع', 'amber'], ['reviewed', 'تم الرفع والمراجعة', 'green'], ['published', 'منشور', 'purple']];
const KIND = { coverage: 'تغطية ميدانية', photo: 'تصوير', video: 'فيديو', story: 'قصة نجاح', report: 'تقرير', post: 'منشور' };

export default async function ({ el }) {
  const M = can('media.manage');
  let items, projects;
  const load = async () => { [items, projects] = await Promise.all([api('/media'), api('/projects?status=active')]); render(); };
  function render() {
    const upcoming = projects.filter((p) => p.execution_date && daysUntil(p.execution_date) >= 0 && daysUntil(p.execution_date) <= 21);
    const docs = projects.filter((p) => p.current_stage === 8);
    mount(el, html`
      ${pageHead('إدارة الإعلام', 'التغطية في موعد التنفيذ، رفع التوثيقات عبر الرابط المعتمد ومراجعتها، وقصص النجاح', M ? html`<button class="btn primary" data-add>${icon('plus')} تغطية جديدة</button>` : '', 'camera')}
      <div class="grid g3" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>${icon('calendar')} مواعيد تنفيذ خلال 3 أسابيع</h3></div>${upcoming.length ? upcoming.map((p) => html`<a class="list-item" href="#/projects/${p.id}?tab=media"><div class="body"><b>${p.title}</b><div class="meta">${p.location || ''}</div></div><span class="badge green">${fmtDate(p.execution_date)}</span></a>`) : empty('لا توجد مواعيد قريبة', 'calendar')}</div>
        <div class="card"><div class="card-head"><h3>${icon('upload')} بانتظار رفع التوثيقات ومراجعتها (م8)</h3></div>${docs.length ? docs.map((p) => html`<a class="list-item" href="#/projects/${p.id}"><div class="body"><b>${p.title}</b><div class="meta">${p.code}</div></div><span class="badge solid">دورنا</span></a>`) : empty('لا شيء معلق', 'checkCircle')}</div>
        <div class="card card-pad"><h3 style="font-size:15px;margin-bottom:8px">${icon('alert', 'width="18" style="vertical-align:-4px;color:var(--orange)"')} قاعدة ذهبية</h3><p class="muted" style="margin:0">في مراحل التوثيق يجب التأكيد على <b>«المراجعة والرفع»</b> معًا، ولا يُكتفى بالرفع فقط. النظام لن يسمح بإنجاز المرحلة 8 دون التأكيدين.</p></div>
      </div>
      <div class="card"><div class="card-head"><h3>${icon('camera')} سجل التغطيات</h3></div>
      ${items.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>التغطية</th><th>المشروع</th><th>النوع</th><th>الموعد</th><th>الإعلامي</th><th>الرابط</th><th>الحالة</th><th></th></tr></thead><tbody>
        ${items.map((m) => html`<tr><td><b>${m.title}</b></td><td>${m.project_code ? html`<a href="#/projects/${m.project_id}">${m.project_code}</a>` : '—'}</td><td>${KIND[m.kind]}</td><td class="nowrap">${fmtDate(m.scheduled_date)}</td><td>${m.reporter_name || '—'}</td>
          <td>${m.link ? html`<a href="${m.link}" target="_blank" rel="noopener noreferrer">${icon('link', 'width="16"')}</a>` : '—'}</td>
          <td>${M ? html`<select class="input" style="width:170px;padding:4px 8px" data-status="${m.id}">${ST.map(([k, l]) => html`<option value="${k}" ${k === m.status ? 'selected' : ''}>${l}</option>`)}</select>` : html`<span class="badge ${(ST.find((x) => x[0] === m.status) || [])[2]}">${(ST.find((x) => x[0] === m.status) || [])[1]}</span>`}</td>
          <td class="nowrap">${M ? html`<button class="btn sm ghost" data-edit="${m.id}">${icon('edit')}</button><button class="btn sm ghost" data-del="${m.id}">${icon('trash')}</button>` : ''}</td></tr>`)}
      </tbody></table></div>` : empty('لا توجد تغطيات', 'camera')}</div>`);
  }
  await load();
  const form = async (m = {}) => {
    const ppl = (await people()).filter((x) => x.dept_key === 'media');
    formModal({ title: m.id ? 'تعديل التغطية' : 'تغطية جديدة', fields: [
      { name: 'title', label: 'العنوان', required: true, value: m.title, full: true },
      { name: 'project_id', label: 'المشروع', type: 'select', options: projects.map((p) => [p.id, `${p.code} — ${p.title}`]), value: m.project_id },
      { name: 'kind', label: 'النوع', type: 'select', empty: false, value: m.kind, options: Object.entries(KIND) },
      { name: 'scheduled_date', label: 'الموعد', type: 'date', value: m.scheduled_date },
      { name: 'reporter_id', label: 'الإعلامي المكلف', type: 'select', value: m.reporter_id, options: ppl.map((x) => [x.id, x.full_name]) },
      { name: 'link', label: 'رابط المواد', dir: 'ltr', value: m.link, placeholder: 'https://' },
      { name: 'notes', label: 'ملاحظات', type: 'textarea', value: m.notes },
    ], onSubmit: async (v) => { if (m.id) await patch('/media/' + m.id, v); else await post('/media', v); toast('تم الحفظ', 'ok'); load(); } });
  };
  on(el, 'click', '[data-add]', () => form());
  on(el, 'click', '[data-edit]', (e, t) => form(items.find((x) => x.id === Number(t.dataset.edit))));
  on(el, 'click', '[data-del]', async (e, t) => { if (await confirmBox('حذف التغطية؟', { danger: true })) { await del('/media/' + t.dataset.del).catch(fail); load(); } });
  on(el, 'change', '[data-status]', async (e, t) => { try { await patch('/media/' + t.dataset.status, { status: t.value }); toast('تم التحديث', 'ok'); } catch (er) { fail(er); } });
}
