import { html, mount, icon, api, post, del, can, formModal, toast, fail, pageHead, empty, money, fmtDate, on, tabs, vbars, downloadCSV, today, confirmBox, raw } from '../lib.js';

const CAT = { grant: 'منحة', supplier: 'موردون', operations: 'تشغيلية', wages: 'أجور', transport: 'نقل', other: 'أخرى' };

export default async function ({ el }) {
  let tab = 'overview';
  const M = can('finance.manage');
  let s, tx, claims;
  const load = async () => { [s, tx, claims] = await Promise.all([api('/finance/summary'), api('/transactions'), api('/claims')]); render(); };
  function render() {
    const t = s.totals;
    const months = [...new Set(s.monthly.map((m) => m.month))];
    mount(el, html`
      ${pageHead('الإدارة المالية', 'المخصص الإداري، صرف المستحقات بالشيكات، مراجعة الإخلاءات والإقفال المالي', M ? html`<button class="btn primary" data-add-tx>${icon('plus')} حركة مالية</button>` : '', 'wallet')}
      <div class="grid g4" style="margin-bottom:16px">
        <div class="card stat"><div class="ic green">${icon('wallet')}</div><div><div class="v">${money(t.grants)}</div><div class="l">إجمالي المنح (${t.projects} مشروع)</div></div></div>
        <div class="card stat"><div class="ic blue">${icon('briefcase')}</div><div><div class="v">${money(t.fees)}</div><div class="l">إجمالي المخصص الإداري</div></div></div>
        <div class="card stat"><div class="ic orange">${icon('truck')}</div><div><div class="v">${money(t.due)}</div><div class="l">مستحقات معتمدة غير مصروفة</div></div></div>
        <div class="card stat"><div class="ic purple">${icon('database')}</div><div><div class="v">${money(t.spent)}</div><div class="l">إجمالي المنصرف</div></div></div>
      </div>
      ${tabs([{ id: 'overview', label: 'الموقف المالي للمشاريع', icon: 'chart' }, { id: 'payables', label: 'مستحقات للصرف', icon: 'truck', count: claims.filter((c) => c.status === 'approved').length }, { id: 'ledger', label: 'دفتر الحركات', icon: 'database' }], tab)}
      ${tab === 'overview' ? html`<div class="grid g3">
        <div class="card span2"><div class="card-head"><h3>المشاريع: المنحة والمعتمد والمصروف</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>المشروع</th><th>المنحة</th><th>المخصص</th><th>المعتمد للتنفيذ</th><th>المصروف</th><th>نسبة الصرف</th></tr></thead><tbody>
          ${s.perProject.map((p) => { const pct = p.net_amount ? Math.min(100, Math.round((p.spent / p.net_amount) * 100)) : 0; return html`<tr class="clickable" data-open="${p.id}"><td class="title-cell"><b>${p.title}</b><span>${p.code} · ${p.status === 'closed' ? 'مغلق' : 'م' + p.current_stage}</span></td>
            <td>${money(p.grant_amount, p.currency)}</td><td>${p.admin_fee_amount != null ? money(p.admin_fee_amount, p.currency) : html`<span class="badge amber">لم يُحدد</span>`}</td><td>${money(p.net_amount, p.currency)}</td><td>${money(p.spent, p.currency)}</td>
            <td style="min-width:110px"><div class="progress"><div style="width:${raw(String(pct))}%"></div></div><span class="small num">${pct}%</span></td></tr>`; })}
        </tbody></table></div></div>
        <div class="card"><div class="card-head"><h3>الحركة الشهرية (منصرف)</h3></div><div class="card-body">${vbars(months.map((m) => ({ label: m.slice(5), value: (s.monthly.find((x) => x.month === m && x.type === 'expense') || {}).total || 0 })))}
          <p class="muted small">آخر 12 شهرًا — المنصرف فقط</p></div></div>
      </div>` : ''}
      ${tab === 'payables' ? html`<div class="card"><div class="card-head"><h3>مطالبات معتمدة من المدير العام بانتظار الصرف</h3></div>
        ${claims.filter((c) => c.status === 'approved').length ? claims.filter((c) => c.status === 'approved').map((c) => html`<div class="list-item"><div class="body"><b>${c.supplier_name} — ${money(c.amount)}</b><div class="meta">${c.project_code} · ${c.project_title}</div></div>
          <a class="btn sm primary" href="#/projects/${c.project_id}?tab=finance">${icon('wallet')} صرف</a></div>`) : empty('لا توجد مستحقات معلقة', 'checkCircle')}
        <div class="card-head" style="border-top:1px solid var(--line-2)"><h3>مطالبات بانتظار إفادة المالية</h3></div>
        ${claims.filter((c) => c.status === 'submitted' && !c.finance_ok).map((c) => html`<a class="list-item" href="#/projects/${c.project_id}?tab=finance"><div class="body"><b>${c.supplier_name} — ${money(c.amount)}</b><div class="meta">${c.project_code}</div></div><span class="badge amber">بانتظار المراجعة</span></a>`)}
      </div>` : ''}
      ${tab === 'ledger' ? html`<div class="card"><div class="card-head"><h3>دفتر الحركات المالية</h3><button class="btn sm" data-csv>${icon('download')} تصدير</button></div>
        ${tx.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>التاريخ</th><th>المشروع</th><th>النوع</th><th>التصنيف</th><th>البيان</th><th>المرجع</th><th>المبلغ</th><th>بواسطة</th><th></th></tr></thead><tbody>
          ${tx.map((x) => html`<tr><td class="nowrap">${fmtDate(x.tx_date)}</td><td>${x.project_code || '—'}</td><td>${x.type === 'income' ? html`<span class="badge green">وارد</span>` : html`<span class="badge orange">منصرف</span>`}</td><td>${CAT[x.category] || x.category || ''}</td><td>${x.description || ''}</td><td class="small">${x.ref || ''}</td><td>${money(x.amount)}</td><td class="small">${x.created_by_name || ''}</td>
            <td>${M && x.category !== 'supplier' ? html`<button class="btn sm ghost" data-del="${x.id}">${icon('trash')}</button>` : ''}</td></tr>`)}
        </tbody></table></div>` : empty('لا توجد حركات', 'database')}</div>` : ''}
    `);
  }
  await load();
  on(el, 'click', '[data-tab]', (e, t) => { tab = t.dataset.tab; render(); });
  on(el, 'click', '[data-open]', (e, t) => { location.hash = `#/projects/${t.dataset.open}?tab=finance`; });
  on(el, 'click', '[data-csv]', () => downloadCSV('دفتر الحركات', tx, [['tx_date', 'التاريخ'], ['project_code', 'المشروع'], [(r) => (r.type === 'income' ? 'وارد' : 'منصرف'), 'النوع'], ['description', 'البيان'], ['ref', 'المرجع'], ['amount', 'المبلغ']]));
  on(el, 'click', '[data-del]', async (e, t) => { if (await confirmBox('حذف الحركة؟', { danger: true })) { try { await del('/transactions/' + t.dataset.del); load(); } catch (er) { fail(er); } } });
  on(el, 'click', '[data-add-tx]', () => formModal({ title: 'حركة مالية', fields: [
    { name: 'type', label: 'النوع', type: 'select', required: true, empty: false, options: [['income', 'وارد'], ['expense', 'منصرف']] },
    { name: 'project_id', label: 'المشروع', type: 'select', empty: 'عام (غير مرتبط بمشروع)', options: s.perProject.map((p) => [p.id, `${p.code} — ${p.title}`]) },
    { name: 'amount', label: 'المبلغ', type: 'number', step: '0.01', required: true }, { name: 'tx_date', label: 'التاريخ', type: 'date', value: today() },
    { name: 'category', label: 'التصنيف', type: 'select', options: Object.entries(CAT).filter(([k]) => k !== 'supplier') },
    { name: 'ref', label: 'المرجع' }, { name: 'description', label: 'البيان', type: 'textarea' },
  ], onSubmit: async (v) => { await post('/transactions', v); toast('تم التسجيل', 'ok'); load(); } }));
}
