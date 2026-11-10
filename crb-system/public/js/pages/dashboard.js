import { html, mount, icon, api, state, can, ago, fmtDate, money, fmtNum, bars, empty, daysUntil, prioBadge, daysSince } from '../lib.js';

const ACTION_LABEL = { created: 'أنشأ', completed: 'أنجز المرحلة', approved: 'اعتمد', submitted: 'رفع للاعتماد', returned: 'أرجع لتصحيح خطأ', check: 'أكّد', comment: 'علّق', file: 'أرفق ملفًا', closed: 'أغلق', quote: 'أضاف عرض سعر', claim: 'أضاف مطالبة', payment: 'صرف دفعة', edit: 'حدّث بيانات' };

export default async function ({ el }) {
  const d = await api('/dashboard');
  const u = state.user;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const kpis = [];
  if (d.kpi) {
    kpis.push(['layers', 'green', d.kpi.activeProjects, 'مشروع قيد التنفيذ']);
    kpis.push(['checkCircle', 'blue', d.kpi.closedProjects, 'مشروع مغلق نهائيًا']);
    kpis.push(['heart', 'orange', fmtNum(d.kpi.beneficiaries), 'إجمالي المستفيدين']);
  }
  if (d.requestsKpi) kpis.push(['inbox', d.requestsKpi.overdue ? 'red' : 'purple', d.requestsKpi.open, `طلب مفتوح${d.requestsKpi.overdue ? ` (${d.requestsKpi.overdue} متجاوز المهلة)` : ''}`]);
  if (d.errorsThisMonth !== undefined && kpis.length < 4) kpis.push(['flag', 'red', d.errorsThisMonth, 'خطأ مقيد هذا الشهر']);
  if (!kpis.length) kpis.push(['tasks', 'green', d.myTasks.length, 'مهمة مفتوحة'], ['target', 'orange', d.myQueue.length, 'عمل بانتظارك']);

  mount(el, html`
  <div class="hero">
    <h2>${greet}، ${u.full_name} 🌿</h2>
    <p>${u.role_name}${u.dept_name ? ' — ' + u.dept_name : ''} · ${new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</p>
    <div class="hero-meta">
      <div><b>${d.myQueue.length}</b>عمل بانتظار إجرائك</div>
      <div><b>${d.myTasks.length}</b>مهمة مفتوحة</div>
      ${d.kpi && can('workflow.approve') ? html`<div><b>${d.kpi.pendingApprovals}</b>بانتظار الاعتماد</div>` : ''}
    </div>
  </div>

  <div class="grid g4" style="margin-bottom:16px">${kpis.slice(0, 4).map(([ic, c, v, l]) => html`<div class="card stat"><div class="ic ${c}">${icon(ic)}</div><div><div class="v num">${v}</div><div class="l">${l}</div></div></div>`)}</div>

  <div class="grid g3">
    <div class="card span2">
      <div class="card-head"><h3>${icon('target')} بانتظار إجرائك الآن</h3><span class="badge orange">${d.myQueue.length}</span></div>
      ${d.myQueue.length ? d.myQueue.map((q) => html`<a class="list-item" href="#/${q.type === 'project' ? 'projects' : 'requests'}/${q.id}">
          <div class="ic ${q.approval ? 'orange' : q.overdue ? 'red' : 'green'}" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none">${icon(q.approval ? 'shield' : q.type === 'project' ? 'layers' : 'inbox')}</div>
          <div class="body"><b>${q.code} — ${q.title}</b><div class="meta">${q.approval ? 'بانتظار اعتمادك: ' : `المرحلة ${q.stage}: `}${q.stage_title}</div></div>
          <div style="text-align:left">${prioBadge(q.priority)} ${q.deadline ? html`<span class="badge ${q.overdue ? 'red' : 'amber'}">${q.overdue ? 'متجاوز المهلة' : 'المهلة ' + fmtDate(q.deadline)}</span>` : ''}<div class="muted small">منذ ${daysSince(q.since)} يوم</div></div>
        </a>`) : empty('لا يوجد عمل معلّق عليك. أحسنت! ✨', 'checkCircle')}
    </div>

    <div class="card">
      <div class="card-head"><h3>${icon('tasks')} مهامي</h3><a href="#/tasks" class="small">الكل</a></div>
      ${d.myTasks.length ? d.myTasks.map((t) => {
        const du = daysUntil(t.due_date);
        return html`<a class="list-item" href="#/tasks"><div class="body"><b>${t.title}</b><div class="meta">${t.project_code || ''} ${t.due_date ? html`· <span style="${du < 0 ? 'color:var(--red)' : ''}">${du < 0 ? `متأخرة ${-du} يوم` : du === 0 ? 'اليوم' : 'خلال ' + du + ' يوم'}</span>` : ''}</div></div>${prioBadge(t.priority)}</a>`;
      }) : empty('لا توجد مهام مفتوحة', 'tasks')}
    </div>

    ${d.announcements.length ? html`<div class="card">
      <div class="card-head"><h3>${icon('megaphone')} آخر التعميمات</h3><a href="#/announcements" class="small">الكل</a></div>
      ${d.announcements.map((a) => html`<a class="list-item" href="#/announcements"><div class="body"><b>${a.title}</b><div class="meta">${ago(a.created_at)}</div></div>${!a.read && a.require_ack ? html`<span class="badge red">يتطلب تأكيدك</span>` : a.priority !== 'normal' ? html`<span class="badge orange">مهم</span>` : ''}</a>`)}
    </div>` : ''}

    ${d.stageDistribution ? html`<div class="card ${d.announcements.length ? '' : 'span2'}">
      <div class="card-head"><h3>${icon('chart')} توزيع المشاريع النشطة على المراحل</h3><a href="#/projects" class="small">المشاريع</a></div>
      <div class="card-body">${bars(d.stageDistribution.filter((s) => s.count).map((s) => ({ label: `${s.n}. ${s.title}`, value: s.count })))}</div>
    </div>` : ''}

    ${d.stalled && d.stalled.length ? html`<div class="card">
      <div class="card-head"><h3>${icon('clock')} مشاريع متوقفة في مرحلتها</h3></div>
      ${d.stalled.map((p) => html`<a class="list-item" href="#/projects/${p.id}"><div class="body"><b>${p.code} — ${p.title}</b><div class="meta">م${p.current_stage}: ${p.stage_title}</div></div><span class="badge red">${p.days} يوم</span></a>`)}
    </div>` : ''}

    ${d.upcoming && d.upcoming.length ? html`<div class="card">
      <div class="card-head"><h3>${icon('calendar')} مواعيد تنفيذ قادمة</h3><a href="#/calendar" class="small">التقويم</a></div>
      ${d.upcoming.map((p) => html`<a class="list-item" href="#/projects/${p.id}"><div class="body"><b>${p.title}</b><div class="meta">${p.code} · ${p.location || ''}</div></div><span class="badge green">${fmtDate(p.execution_date)}</span></a>`)}
    </div>` : ''}

    ${d.finance ? html`<div class="card">
      <div class="card-head"><h3>${icon('wallet')} الموقف المالي للمشاريع النشطة</h3><a href="#/finance" class="small">المالية</a></div>
      <div class="card-body stack">
        <div class="row between"><span class="muted">إجمالي المنح</span><b>${money(d.finance.grants)}</b></div>
        <div class="row between"><span class="muted">المخصص الإداري</span><b>${money(d.finance.fees)}</b></div>
        <div class="row between"><span class="muted">المعتمد للتنفيذ</span><b>${money(d.finance.net)}</b></div>
        <div class="row between"><span class="muted">مستحقات موردين معتمدة غير مصروفة</span><b style="color:var(--orange-600)">${money(d.finance.due)}</b></div>
      </div>
    </div>` : ''}

    ${d.errorsByDept && d.errorsByDept.length ? html`<div class="card">
      <div class="card-head"><h3>${icon('flag')} أخطاء هذا الشهر حسب الإدارة</h3><a href="#/errors" class="small">السجل</a></div>
      <div class="card-body">${bars(d.errorsByDept.map((e) => ({ label: e.name || 'غير محدد', value: e.n })), { color: 'var(--orange)' })}</div>
    </div>` : ''}

    ${d.activity.length ? html`<div class="card span2">
      <div class="card-head"><h3>${icon('history')} آخر الحركات على المشاريع</h3></div>
      ${d.activity.map((a) => html`<a class="list-item" href="#/${a.entity_type === 'project' ? 'projects' : 'requests'}/${a.entity_id}">
        <div class="body"><b>${a.full_name || 'النظام'} <span class="muted" style="font-weight:400">${ACTION_LABEL[a.action] || a.action}</span> · ${a.code}</b><div class="meta">${a.note || ''}</div></div><span class="muted small nowrap">${ago(a.created_at)}</span></a>`)}
    </div>` : ''}
  </div>`);
}
