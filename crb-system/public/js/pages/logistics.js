import { html, mount, icon, api, post, patch, can, formModal, toast, fail, pageHead, empty, money, fmtDate, on, tabs, query, setQuery, downloadCSV } from '../lib.js';

const CLAIM = { submitted: ['مقدمة', 'amber'], approved: ['معتمدة – بانتظار الصرف', 'blue'], paid: ['مصروفة', 'green'], rejected: ['مرفوضة', 'red'] };
const CONTRACT = { draft: ['مسودة', ''], pending_signature: ['بانتظار توقيع المدير العام', 'amber'], signed: ['موقّع', 'green'], rejected: ['مرفوض', 'red'] };
const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));

export default async function ({ el }) {
  let tab = query().tab || 'board';
  const M = can('logistics.manage');
  let sup, claims, contracts, projects;
  const load = async () => {
    [sup, claims, contracts, projects] = await Promise.all([api('/suppliers'), api('/claims'), api('/contracts'), api('/projects?status=active')]);
    render();
  };
  function render() {
    const needQuotes = projects.filter((p) => [2, 4].includes(p.current_stage));
    const needMaterials = projects.filter((p) => p.current_stage === 7);
    const needClaims = projects.filter((p) => [11, 13].includes(p.current_stage));
    mount(el, html`
      ${pageHead('إدارة اللوجستيات', 'عروض الأسعار، الموردون، العقود، توفير المواد، ومطالبات الموردين', M ? html`<button class="btn primary" data-add-sup>${icon('plus')} مورد جديد</button>` : '', 'truck')}
      <div class="grid g4" style="margin-bottom:16px">
        <div class="card stat"><div class="ic orange">${icon('truck')}</div><div><div class="v">${needQuotes.length}</div><div class="l">مشاريع بانتظار عروض الأسعار</div></div></div>
        <div class="card stat"><div class="ic green">${icon('layers')}</div><div><div class="v">${needMaterials.length}</div><div class="l">مشاريع بانتظار توفير المواد</div></div></div>
        <div class="card stat"><div class="ic blue">${icon('file')}</div><div><div class="v">${contracts.filter((c) => c.status === 'pending_signature').length}</div><div class="l">عقود بانتظار التوقيع</div></div></div>
        <div class="card stat"><div class="ic purple">${icon('users')}</div><div><div class="v">${sup.filter((s) => s.is_active).length}</div><div class="l">مورد نشط</div></div></div>
      </div>
      ${tabs([{ id: 'board', label: 'لوحة العمل', icon: 'target' }, { id: 'suppliers', label: 'سجل الموردين', icon: 'users' }, { id: 'contracts', label: 'العقود', icon: 'file' }, { id: 'claims', label: 'مطالبات الموردين', icon: 'wallet', count: claims.filter((c) => c.status === 'submitted').length }], tab)}
      ${tab === 'board' ? html`<div class="grid g3">
        ${[['عروض الأسعار واعتماد الأقل (م2، م4)', needQuotes], ['توفير المواد في موعد التنفيذ (م7)', needMaterials], ['المطالبات والإخلاءات (م11، م13)', needClaims]].map(([t, list]) => html`
          <div class="card"><div class="card-head"><h3>${t}</h3><span class="badge">${list.length}</span></div>
          ${list.length ? list.map((p) => html`<a class="list-item" href="#/projects/${p.id}?tab=logistics"><div class="body"><b>${p.title}</b><div class="meta">${p.code} · م${p.current_stage} ${p.execution_date ? '· التنفيذ ' + fmtDate(p.execution_date) : ''}</div></div>${p.my_turn ? html`<span class="badge solid">دورك</span>` : ''}</a>`) : empty('لا شيء معلق', 'checkCircle')}</div>`)}
      </div>` : ''}
      ${tab === 'suppliers' ? html`<div class="card"><div class="card-head"><h3>سجل الموردين المعتمدين</h3><button class="btn sm" data-csv>${icon('download')} تصدير</button></div>
        ${sup.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>المورد</th><th>التصنيف</th><th>التواصل</th><th>التقييم</th><th>العروض / الفوز</th><th>مستحق</th><th>مصروف</th><th></th></tr></thead><tbody>
          ${sup.map((s) => html`<tr style="${s.is_active ? '' : 'opacity:.5'}"><td><b>${s.name}</b>${s.notes ? html`<div class="muted small">${s.notes}</div>` : ''}</td><td>${s.category || '—'}</td><td class="small">${s.contact_person || ''}<div class="ltr" style="text-align:right">${s.phone || ''}</div></td>
            <td style="color:var(--orange);letter-spacing:1px">${stars(s.rating)}</td><td class="num">${s.quotes_count} / ${s.wins}</td><td>${money(s.due_total)}</td><td>${money(s.paid_total)}</td>
            <td>${M ? html`<button class="btn sm ghost" data-edit-sup="${s.id}">${icon('edit')}</button>` : ''}</td></tr>`)}
        </tbody></table></div>` : empty('لا يوجد موردون. أضف أول مورد.', 'users')}</div>` : ''}
      ${tab === 'contracts' ? html`<div class="card"><div class="card-head"><h3>عقود الموردين (المشاريع الكبيرة – العملية الاستثنائية ب)</h3></div>
        ${contracts.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>العقد</th><th>المشروع</th><th>المورد</th><th>القيمة</th><th>الحالة</th><th></th></tr></thead><tbody>
          ${contracts.map((c) => html`<tr><td><b>${c.title}</b><div class="muted small">${c.quantities || ''}</div></td><td><a href="#/projects/${c.project_id}">${c.project_code}</a></td><td>${c.supplier_name || ''}</td><td>${money(c.amount)}</td>
            <td><span class="badge ${CONTRACT[c.status][1]}">${CONTRACT[c.status][0]}</span>${c.signed_by_name ? html`<div class="muted small">${c.signed_by_name} · ${fmtDate(c.signed_at)}</div>` : ''}</td>
            <td>${c.status === 'pending_signature' && can('workflow.approve') ? html`<button class="btn sm primary" data-sign="${c.id}">توقيع</button>` : ''}</td></tr>`)}
        </tbody></table></div>` : empty('لا توجد عقود. تُعد العقود من تبويب اللوجستيات داخل المشروع.', 'file')}</div>` : ''}
      ${tab === 'claims' ? html`<div class="card"><div class="card-head"><h3>مطالبات الموردين في جميع المشاريع</h3></div>
        ${claims.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>المورد</th><th>المشروع</th><th>المبلغ</th><th>اللوجستيات</th><th>المالية</th><th>الحالة</th></tr></thead><tbody>
          ${claims.map((c) => html`<tr class="clickable" data-open="${c.project_id}"><td><b>${c.supplier_name}</b><div class="muted small">${c.description || ''}</div></td><td>${c.project_code}</td><td>${money(c.amount)}</td><td>${c.logistics_ok ? '✔' : '—'}</td><td>${c.finance_ok ? '✔' : '—'}</td><td><span class="badge ${CLAIM[c.status][1]}">${CLAIM[c.status][0]}</span></td></tr>`)}
        </tbody></table></div>` : empty('لا توجد مطالبات', 'wallet')}</div>` : ''}
    `);
  }
  await load();
  const supForm = (s = {}) => formModal({ title: s.id ? 'تعديل مورد' : 'مورد جديد', fields: [
    { name: 'name', label: 'اسم المورد', required: true, value: s.name, full: true },
    { name: 'category', label: 'التصنيف', value: s.category, placeholder: 'مواد غذائية، مواد بناء…' }, { name: 'contact_person', label: 'الشخص المسؤول', value: s.contact_person },
    { name: 'phone', label: 'الهاتف', dir: 'ltr', value: s.phone }, { name: 'email', label: 'البريد', dir: 'ltr', value: s.email },
    { name: 'address', label: 'العنوان', value: s.address }, { name: 'rating', label: 'التقييم (0-5)', type: 'number', min: 0, max: 5, value: s.rating ?? 3 },
    { name: 'notes', label: 'ملاحظات (جودة، التزام بالمواعيد…)', type: 'textarea', value: s.notes },
    ...(s.id ? [{ name: 'is_active', label: 'مورد نشط', type: 'checkbox', value: s.is_active }] : []),
  ], onSubmit: async (v) => { if (s.id) await patch('/suppliers/' + s.id, v); else await post('/suppliers', v); toast('تم الحفظ', 'ok'); load(); } });
  on(el, 'click', '[data-tab]', (e, t) => { tab = t.dataset.tab; setQuery({ tab }); render(); });
  on(el, 'click', '[data-add-sup]', () => supForm());
  on(el, 'click', '[data-edit-sup]', (e, t) => supForm(sup.find((s) => s.id === Number(t.dataset.editSup))));
  on(el, 'click', '[data-sign]', async (e, t) => { try { await post(`/contracts/${t.dataset.sign}/sign`); load(); } catch (er) { fail(er); } });
  on(el, 'click', '[data-open]', (e, t) => { location.hash = `#/projects/${t.dataset.open}?tab=logistics`; });
  on(el, 'click', '[data-csv]', () => downloadCSV('الموردون', sup, [['name', 'المورد'], ['category', 'التصنيف'], ['contact_person', 'المسؤول'], ['phone', 'الهاتف'], ['rating', 'التقييم'], ['quotes_count', 'العروض'], ['wins', 'الفوز'], ['paid_total', 'المصروف']]));
}
