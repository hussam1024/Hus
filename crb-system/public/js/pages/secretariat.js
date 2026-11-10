import { html, mount, icon, api, post, del, can, formModal, toast, fail, pageHead, empty, fmtDate, on, today, daysUntil, downloadCSV, confirmBox } from '../lib.js';

export default async function ({ el }) {
  const M = can('secretariat.manage');
  let dir = 'all'; let rows; let projects = []; let requests = [];
  const load = async () => {
    [rows, projects, requests] = await Promise.all([api('/correspondence'), can('projects.view') ? api('/projects') : [], api('/requests').catch(() => [])]);
    render();
  };
  function render() {
    const submitP = projects.filter((p) => p.status === 'active' && [10, 15].includes(p.current_stage));
    const openReq = requests.filter((r) => r.status === 'active').sort((a, b) => (a.donor_deadline || '9') < (b.donor_deadline || '9') ? -1 : 1);
    const list = rows.filter((r) => dir === 'all' || r.direction === dir);
    mount(el, html`
      ${pageHead('سكرتارية الإدارة العامة', 'مسؤول المتابعة والرفع: سجل الوارد والصادر، متابعة المهل، والرفع للجهة المانحة', M ? html`<button class="btn" data-new="out">${icon('send')} تسجيل صادر</button><button class="btn primary" data-new="in">${icon('inbox')} تسجيل وارد</button>` : '', 'book')}
      <div class="grid g2" style="margin-bottom:16px">
        <div class="card"><div class="card-head"><h3>${icon('clock')} متابعة مهل الطلبات المفتوحة</h3><a class="small" href="#/requests">الطلبات</a></div>
          ${openReq.length ? openReq.slice(0, 8).map((r) => { const n = daysUntil(r.donor_deadline); return html`<a class="list-item" href="#/requests/${r.id}"><div class="body"><b>${r.code} — ${r.title}</b><div class="meta">م${r.current_stage}: ${r.stage_title} · ${r.assignee_name || r.sector_name || ''}</div></div>${r.donor_deadline ? html`<span class="badge ${n < 0 ? 'red' : n <= 2 ? 'amber' : 'green'}">${n < 0 ? 'متأخر ' + -n : 'باقي ' + n} يوم</span>` : ''}</a>`; }) : empty('لا توجد طلبات مفتوحة', 'checkCircle')}</div>
        <div class="card"><div class="card-head"><h3>${icon('send')} بانتظار الرفع للجهة المانحة</h3></div>
          ${submitP.length ? submitP.map((p) => html`<a class="list-item" href="#/projects/${p.id}"><div class="body"><b>${p.title}</b><div class="meta">${p.code} · ${p.current_stage === 10 ? 'الإخلاءات الإعلامية' : 'الإخلاءات المالية والإغلاق'}</div></div><span class="badge solid">م${p.current_stage}</span></a>`) : empty('لا شيء بانتظار الرفع', 'checkCircle')}</div>
      </div>
      <div class="card"><div class="card-head"><h3>${icon('book')} سجل الوارد والصادر</h3>
        <div class="row"><div class="seg"><button data-d="all" class="${dir === 'all' ? 'active' : ''}">الكل</button><button data-d="in" class="${dir === 'in' ? 'active' : ''}">الوارد</button><button data-d="out" class="${dir === 'out' ? 'active' : ''}">الصادر</button></div>
        <button class="btn sm" data-csv>${icon('download')} تصدير</button></div></div>
        ${list.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>الرقم</th><th>النوع</th><th>الموضوع</th><th>الجهة</th><th>التاريخ</th><th>الوسيلة</th><th>مرتبط بـ</th><th></th></tr></thead><tbody>
          ${list.map((r) => html`<tr><td class="num nowrap"><b>${r.ref_no}</b></td><td>${r.direction === 'in' ? html`<span class="badge blue">وارد</span>` : html`<span class="badge orange">صادر</span>`}</td><td><b>${r.subject}</b>${r.notes ? html`<div class="muted small">${r.notes}</div>` : ''}</td>
            <td>${r.party || ''}</td><td class="nowrap">${fmtDate(r.corr_date)}</td><td class="small">${r.channel || ''}</td>
            <td>${r.project_code ? html`<a href="#/projects/${r.project_id}">${r.project_code}</a>` : ''} ${r.request_code ? html`<a href="#/requests/${r.request_id}">${r.request_code}</a>` : ''}</td>
            <td>${M ? html`<button class="btn sm ghost" data-del="${r.id}">${icon('trash')}</button>` : ''}</td></tr>`)}
        </tbody></table></div>` : empty('السجل فارغ', 'book')}</div>`);
  }
  await load();
  on(el, 'click', '[data-d]', (e, t) => { dir = t.dataset.d; render(); });
  on(el, 'click', '[data-csv]', () => downloadCSV('الوارد والصادر', rows, [['ref_no', 'الرقم'], [(r) => (r.direction === 'in' ? 'وارد' : 'صادر'), 'النوع'], ['subject', 'الموضوع'], ['party', 'الجهة'], ['corr_date', 'التاريخ'], ['channel', 'الوسيلة'], ['project_code', 'المشروع']]));
  on(el, 'click', '[data-del]', async (e, t) => { if (await confirmBox('حذف القيد؟', { danger: true })) { await del('/correspondence/' + t.dataset.del).catch(fail); load(); } });
  on(el, 'click', '[data-new]', (e, t) => {
    const d = t.dataset.new;
    formModal({ title: d === 'in' ? 'تسجيل وارد' : 'تسجيل صادر', fields: [
      { name: 'subject', label: 'الموضوع', required: true, full: true },
      { name: 'party', label: d === 'in' ? 'الجهة المرسِلة' : 'الجهة المرسَل إليها' },
      { name: 'corr_date', label: 'التاريخ', type: 'date', value: today() },
      { name: 'ref_no', label: 'الرقم المرجعي', hint: 'اتركه فارغًا ليُولّد تلقائيًا' },
      { name: 'channel', label: 'الوسيلة', type: 'select', empty: false, options: ['البريد الإلكتروني', 'وسيلة الرفع المعتمدة لدى المانح', 'تسليم ورقي', 'خطاب رسمي', 'أخرى'].map((x) => [x, x]) },
      { name: 'project_id', label: 'مشروع مرتبط', type: 'select', options: projects.map((p) => [p.id, `${p.code} — ${p.title}`]) },
      { name: 'request_id', label: 'طلب مرتبط', type: 'select', options: requests.map((r) => [r.id, `${r.code} — ${r.title}`]) },
      { name: 'notes', label: 'ملاحظات', type: 'textarea' },
    ], onSubmit: async (v) => { const r = await post('/correspondence', { ...v, direction: d }); toast('تم القيد برقم ' + r.ref_no, 'ok'); load(); } });
  });
}
