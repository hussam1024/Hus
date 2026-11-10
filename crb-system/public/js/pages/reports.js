import { html, mount, icon, api, can, pageHead, on, bars, vbars, fmtNum, money, printHead, raw } from '../lib.js';

export default async function ({ el }) {
  const r = await api('/reports');
  const rate = r.requests.rate;
  mount(el, html`${printHead('تقرير مؤشرات الأداء')}
    ${pageHead('التقارير ومؤشرات الأداء (KPIs)', 'مؤشرات مبنية على معايير إدارة المنظمات الإنسانية: الالتزام بالمهل، زمن الدورة، جودة العمل، وتوزيع العبء', html`<button class="btn" data-print>${icon('printer')} طباعة التقرير</button>`, 'chart')}
    <div class="grid g4" style="margin-bottom:16px">
      <div class="card stat"><div class="ic green">${icon('layers')}</div><div><div class="v">${r.projects.total || 0}</div><div class="l">إجمالي المشاريع (${r.projects.closed || 0} مغلق)</div></div></div>
      <div class="card stat"><div class="ic orange">${icon('heart')}</div><div><div class="v">${fmtNum(r.projects.beneficiaries || 0)}</div><div class="l">إجمالي المستفيدين</div></div></div>
      <div class="card stat"><div class="ic blue">${icon('clock')}</div><div><div class="v">${rate === null ? '—' : rate + '%'}</div><div class="l">نسبة إنجاز الطلبات ضمن مهلة المانح (${r.requests.onTime}/${r.requests.closed})</div></div></div>
      <div class="card stat"><div class="ic red">${icon('flag')}</div><div><div class="v">${r.errorsByDept.reduce((a, x) => a + x.n, 0)}</div><div class="l">إجمالي الأخطاء المقيدة</div></div></div>
    </div>
    <div class="grid g2">
      <div class="card"><div class="card-head"><h3>${icon('clock')} متوسط زمن كل مرحلة (بالأيام)</h3></div><div class="card-body">
        ${bars(r.stageDur.filter((s) => s.samples).map((s) => ({ label: `${s.n}. ${s.title}`, value: Math.round(s.days * 10) / 10 })))}
        <p class="muted small">يكشف «عنق الزجاجة» في سير العمل: المراحل الأطول تحتاج تدخلًا إداريًا أو تحسين إجراء.</p></div></div>
      <div class="card"><div class="card-head"><h3>${icon('flag')} الأخطاء الشهرية (آخر 12 شهرًا)</h3></div><div class="card-body">
        ${vbars(r.errorsMonthly.map((m) => ({ label: m.month.slice(5), value: m.n, alt: true })))}
        <p class="muted small">الهدف: اتجاه تنازلي شهرًا بعد شهر.</p></div></div>
      <div class="card"><div class="card-head"><h3>${icon('grid')} عبء العمل والجودة حسب الإدارة</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>الإدارة</th><th>مهام مفتوحة</th><th>مهام منجزة</th><th>نسبة الإنجاز</th><th>الأخطاء</th></tr></thead><tbody>
        ${r.deptLoad.map((d) => { const tot = d.open_tasks + d.done_tasks; const p = tot ? Math.round((d.done_tasks / tot) * 100) : 0; return html`<tr><td><span class="dot-c" style="background:${raw(d.color)}"></span> ${d.name}</td><td class="num">${d.open_tasks}</td><td class="num">${d.done_tasks}</td><td style="min-width:100px"><div class="progress"><div style="width:${raw(String(p))}%"></div></div><span class="small num">${p}%</span></td><td class="num">${d.errors}</td></tr>`; })}
      </tbody></table></div></div>
      <div class="card"><div class="card-head"><h3>${icon('heart')} المشاريع حسب الجهة المانحة</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>الجهة المانحة</th><th>المشاريع</th><th>المستفيدون</th>${can('finance.view') ? html`<th>المنح</th>` : ''}</tr></thead><tbody>
        ${r.byDonor.map((d) => html`<tr><td>${d.donor}</td><td class="num">${d.n}</td><td class="num">${fmtNum(d.beneficiaries)}</td>${can('finance.view') ? html`<td>${money(d.grants)}</td>` : ''}</tr>`)}
      </tbody></table></div></div>
      <div class="card"><div class="card-head"><h3>${icon('target')} المشاريع حسب القطاع</h3></div><div class="card-body">${bars(r.bySector.map((s) => ({ label: s.sector, value: s.n })))}</div></div>
      <div class="card"><div class="card-head"><h3>${icon('alert')} الأخطاء حسب الإدارة (تراكمي)</h3></div><div class="card-body">${bars(r.errorsByDept.map((e) => ({ label: e.name || 'غير محدد', value: e.n })), { color: 'var(--orange)' })}</div></div>
    </div>`);
  on(el, 'click', '[data-print]', () => window.print());
}
