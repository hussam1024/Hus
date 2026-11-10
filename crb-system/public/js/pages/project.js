import { html, raw, mount, icon, api, post, patch, del, can, state, formModal, toast, fail, money, fmtNum, fmtDate, fmtDateTime, on, tabs, empty, prioBadge, confirmBox, people, query, setQuery, printHead, ago } from '../lib.js';
import { stagesHtml, timelineHtml, errorsHtml, filesHtml, bindWorkflow, openReturn, pipeline } from './workflow-ui.js';

const CLAIM = { submitted: ['مقدمة – بانتظار الإفادات والاعتماد', 'amber'], approved: ['معتمدة – بانتظار الصرف', 'blue'], paid: ['مصروفة', 'green'], rejected: ['مرفوضة', 'red'] };
const CONTRACT = { draft: ['مسودة', ''], pending_signature: ['بانتظار توقيع المدير العام', 'amber'], signed: ['موقّع', 'green'], rejected: ['مرفوض', 'red'] };
const MEDIA = { planned: 'مخطط', covered: 'تمت التغطية', uploaded: 'تم الرفع', reviewed: 'تم الرفع والمراجعة', published: 'منشور' };

export default async function ({ el, params }) {
  const id = Number(params[0]);
  let tab = query().tab || 'workflow';
  let d; let unbind;

  const load = async () => {
    d = await api('/projects/' + id);
    render();
  };

  function render() {
    if (unbind) unbind();
    const p = d.entity;
    const closed = p.status === 'closed';
    const cur = d.stages[p.current_stage - 1];
    const T = [
      { id: 'workflow', label: 'سير العمل', icon: 'layers' },
      { id: 'info', label: 'بيانات المشروع', icon: 'file' },
      { id: 'logistics', label: 'اللوجستيات', icon: 'truck', show: !!d.quotes, count: d.claims ? d.claims.filter((c) => c.status === 'submitted').length : 0 },
      { id: 'finance', label: 'المالية', icon: 'wallet', show: !!d.transactions },
      { id: 'media', label: 'الإعلام والتوثيق', icon: 'camera', show: !!d.media },
      { id: 'files', label: `المرفقات (${d.files.length})`, icon: 'paperclip' },
      { id: 'errors', label: 'الأخطاء', icon: 'flag', count: d.errors.filter((e) => e.status === 'open').length },
      { id: 'log', label: 'السجل الكامل', icon: 'history' },
    ];
    mount(el, html`
      ${printHead('ملف مشروع ' + p.code)}
      <div class="page-head">
        <div>
          <a href="#/projects" class="small no-print">${icon('arrowLeft', 'width="14" style="transform:scaleX(-1)"')} المشاريع</a>
          <h1 style="margin-top:4px">${p.title} ${prioBadge(p.priority)}</h1>
          <p><span class="num">${p.code}</span> · ${p.donor || 'جهة مانحة غير محددة'} · ${p.location || ''} · ${p.size === 'large' ? 'مشروع كبير' : 'مشروع صغير'}</p>
        </div>
        <div class="actions">
          ${d.channel_id && can('chat.use') ? html`<a class="btn" href="#/chat/${d.channel_id}">${icon('chat')} نقاش المشروع</a>` : ''}
          <button class="btn" data-print>${icon('printer')} طباعة</button>
          ${d.can.return && !closed ? html`<button class="btn danger" data-return>${icon('undo')} إرجاع لتصحيح خطأ</button>` : ''}
          ${d.can.delete ? html`<button class="btn ghost" data-delete title="حذف المشروع">${icon('trash')}</button>` : ''}
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:16px">
        <div class="row between">
          <div>${closed ? html`<span class="badge green" style="font-size:14px">${icon('checkCircle')} أُغلق المشروع نهائيًا ${fmtDate(p.closed_at)}</span>`
            : html`<b>المرحلة ${p.current_stage} من 15:</b> ${cur.title} ${p.stage_status === 'pending_approval' ? html`<span class="badge orange">بانتظار اعتماد المدير العام</span>` : ''}`}</div>
          <div class="row">${d.can.act && !closed && p.stage_status === 'active' ? html`<span class="badge solid">${icon('target', 'width="13"')} هذه المرحلة من مسؤوليتك</span>` : ''}
            <span class="muted small">آخر حركة ${d.events[0] ? ago(d.events[0].created_at) : ''}</span></div>
        </div>
        ${pipeline(p.current_stage, 15, closed)}
        <div class="grid g4" style="margin-top:12px">
          <div><div class="muted small">مبلغ المنحة</div><b>${money(p.grant_amount, p.currency)}</b></div>
          ${'net_amount' in p ? html`<div><div class="muted small">المعتمد للتنفيذ (بعد المخصص)</div><b>${money(p.net_amount, p.currency)}</b></div>` : html`<div><div class="muted small">المستفيدون</div><b class="num">${fmtNum(p.beneficiaries)}</b></div>`}
          <div><div class="muted small">موعد التنفيذ</div><b>${fmtDate(p.execution_date)}</b></div>
          <div><div class="muted small">تاريخ ورود الاعتماد</div><b>${fmtDate(p.approval_date)}</b></div>
        </div>
      </div>

      ${tabs(T, tab)}
      <div id="tab-body">${tabBody(tab)}</div>`);
    unbind = bindWorkflow(el, 'project', d, load);
  }

  function tabBody(t) {
    const p = d.entity;
    if (t === 'workflow') return html`<div class="grid g3"><div class="span2">${stagesHtml(d, p.current_stage)}</div>
      <div class="stack"><div class="card"><div class="card-head"><h3>${icon('history')} آخر الحركات</h3><button class="btn sm" data-comment>${icon('plus')} ملاحظة</button></div><div class="card-body">${timelineHtml(d.events.slice(0, 12))}</div></div>
      ${d.tasks.length ? html`<div class="card"><div class="card-head"><h3>${icon('tasks')} مهام مرتبطة</h3></div>${d.tasks.map((x) => html`<div class="list-item"><div class="body"><b>${x.title}</b><div class="meta">${x.assignee_name || ''} · ${x.status === 'done' ? 'منجزة' : 'مفتوحة'}</div></div></div>`)}</div>` : ''}
      ${d.requests.length ? html`<div class="card"><div class="card-head"><h3>${icon('inbox')} طلبات المانح المرتبطة</h3></div>${d.requests.map((r) => html`<a class="list-item" href="#/requests/${r.id}"><div class="body"><b>${r.code} — ${r.title}</b><div class="meta">${r.status === 'closed' ? 'منجز' : 'المرحلة ' + r.current_stage}</div></div></a>`)}</div>` : ''}
      </div></div>`;

    if (t === 'info') {
      const ed = d.can.edit && (p.status === 'active' || state.user.isOwner);
      return html`<div class="grid g2">
        <div class="card"><div class="card-head"><h3>${icon('file')} البيانات الأساسية</h3>${ed ? html`<button class="btn sm" data-edit-info>${icon('edit')} تعديل</button>` : ''}</div>
          <div class="card-body"><div class="kv">
            <div>الرمز</div><div class="num">${p.code}</div><div>الجهة المانحة</div><div>${p.donor || '—'}</div><div>القطاع</div><div>${p.sector || '—'}</div>
            <div>الموقع</div><div>${p.location || '—'}</div><div>الحجم</div><div>${p.size === 'large' ? 'كبير (عقود موردين)' : 'صغير (توريد مباشر)'}</div>
            <div>المنحة</div><div>${money(p.grant_amount, p.currency)}</div><div>المستفيدون</div><div class="num">${fmtNum(p.beneficiaries)}</div>
            <div>ورود الاعتماد</div><div>${fmtDate(p.approval_date)}</div><div>تاريخ الانتهاء المتوقع</div><div>${fmtDate(p.end_date)}</div>
            <div>الوصف</div><div style="white-space:pre-wrap">${p.description || '—'}</div>
          </div></div></div>
        <div class="card"><div class="card-head"><h3>${icon('target')} خطة التنفيذ (العملية 6)</h3>${ed ? html`<button class="btn sm" data-edit-plan>${icon('edit')} ${p.execution_date ? 'تعديل' : 'إعداد'} الخطة</button>` : ''}</div>
          <div class="card-body"><div class="kv">
            <div>موعد التنفيذ</div><div>${fmtDate(p.execution_date)}</div>
            <div>ميزانية ومصاريف التنفيذ</div><div>${money(p.plan_budget, p.currency)}</div>
            ${'plan_wages' in p ? html`<div>الأجور التشغيلية</div><div>${money(p.plan_wages, p.currency)}</div>` : ''}
            <div>تفاصيل الخطة</div><div style="white-space:pre-wrap">${p.plan_notes || '—'}</div>
          </div>${!p.execution_date ? html`<p class="muted small">تُعد إدارة المشاريع الخطة وترفعها للمدير العام في المرحلة 6.</p>` : ''}</div></div>
      </div>`;
    }

    if (t === 'logistics') {
      const lowest = d.quotes.length ? Math.min(...d.quotes.map((x) => x.amount)) : null;
      const L = d.can.logistics && p.status === 'active';
      return html`<div class="stack">
        <div class="card"><div class="card-head"><h3>${icon('truck')} عروض الأسعار (العمليتان 2 و 4)</h3>${L ? html`<button class="btn sm primary" data-add-quote>${icon('plus')} إضافة عرض سعر</button>` : ''}</div>
          ${d.quotes.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>المورد</th><th>المبلغ</th><th>مدة التوريد</th><th>التفاصيل</th><th></th></tr></thead><tbody>
            ${d.quotes.map((x) => html`<tr><td><b>${x.supplier_name}</b> ${x.amount === lowest ? html`<span class="badge green">الأقل سعرًا</span>` : ''}</td><td>${money(x.amount, p.currency)}</td><td>${x.delivery_days ? x.delivery_days + ' يوم' : '—'}</td><td class="small">${x.details || ''}</td>
            <td class="nowrap">${x.selected ? html`<span class="badge solid">${icon('check', 'width="12"')} العرض المعتمد</span>` : L ? html`<button class="btn sm" data-select-quote="${x.id}" data-low="${x.amount === lowest ? 1 : 0}">اعتماد هذا العرض</button> <button class="btn sm ghost" data-del-quote="${x.id}">${icon('trash')}</button>` : ''}</td></tr>`)}
          </tbody></table></div>` : empty('لم تُضف عروض أسعار بعد. يوصى بثلاثة عروض على الأقل.', 'truck')}
          ${d.quotes.length && d.quotes.length < 3 ? html`<div class="card-body"><div class="gate">${icon('alert')} أفضل الممارسات: ثلاثة عروض أسعار على الأقل لضمان الشفافية والمقارنة العادلة.</div></div>` : ''}
        </div>
        ${p.size === 'large' || d.contracts.length ? html`<div class="card"><div class="card-head"><h3>${icon('file')} عقود الموردين — العملية الاستثنائية (ب)</h3>${L ? html`<button class="btn sm" data-add-contract>${icon('plus')} إعداد عقد</button>` : ''}</div>
          ${d.contracts.length ? d.contracts.map((c) => html`<div class="list-item"><div class="body"><b>${c.title}</b><div class="meta">${c.supplier_name || ''} · ${money(c.amount, p.currency)} ${c.signed_by_name ? '· وقّعه ' + c.signed_by_name : ''}</div></div>
            <span class="badge ${CONTRACT[c.status][1]}">${CONTRACT[c.status][0]}</span>
            ${c.status === 'pending_signature' && can('workflow.approve') ? html`<button class="btn sm primary" data-sign="${c.id}">توقيع</button><button class="btn sm danger" data-reject-contract="${c.id}">رفض</button>` : ''}</div>`) : empty('مشروع كبير: تتفق اللوجستيات مع الموردين على الكميات والأسعار ومواعيد التوريد، ويُعد العقد ويُرفع للمدير العام لتوقيعه.', 'file')}
        </div>` : ''}
        <div class="card"><div class="card-head"><h3>${icon('wallet')} مطالبات الموردين (العمليتان 11 و 12)</h3>${L ? html`<button class="btn sm" data-add-claim>${icon('plus')} تقديم مطالبة</button>` : ''}</div>
          ${claimsTable(d.claims, p)}</div>
      </div>`;
    }

    if (t === 'finance') {
      const F = d.can.finance && p.status === 'active';
      const spent = d.transactions.filter((x) => x.type === 'expense').reduce((a, x) => a + x.amount, 0);
      const pct = p.net_amount ? Math.min(100, Math.round((spent / p.net_amount) * 100)) : 0;
      return html`<div class="grid g3">
        <div class="card"><div class="card-head"><h3>${icon('wallet')} المخصص الإداري (العملية 3)</h3>${F ? html`<button class="btn sm" data-fee>${icon('edit')} تحديد</button>` : ''}</div>
          <div class="card-body stack">
            <div class="row between"><span class="muted">مبلغ المنحة</span><b>${money(p.grant_amount, p.currency)}</b></div>
            <div class="row between"><span class="muted">نسبة المخصص الإداري</span><b class="num">${p.admin_fee_pct != null ? p.admin_fee_pct + '%' : '—'}</b></div>
            <div class="row between"><span class="muted">قيمة المخصص</span><b>${money(p.admin_fee_amount, p.currency)}</b></div>
            <div class="row between" style="border-top:1px solid var(--line);padding-top:10px"><span>المبلغ المعتمد للتنفيذ</span><b style="color:var(--green-700);font-size:17px">${money(p.net_amount, p.currency)}</b></div>
            ${p.net_amount ? html`<div><div class="row between small"><span>المصروف من المعتمد</span><span class="num">${pct}%</span></div><div class="progress"><div style="width:${raw(String(pct))}%"></div></div></div>` : ''}
          </div></div>
        <div class="card span2"><div class="card-head"><h3>${icon('database')} الحركات المالية للمشروع</h3>${F ? html`<button class="btn sm primary" data-add-tx>${icon('plus')} حركة مالية</button>` : ''}</div>
          ${d.transactions.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>المرجع</th><th>المبلغ</th></tr></thead><tbody>
            ${d.transactions.map((x) => html`<tr><td class="nowrap">${fmtDate(x.tx_date)}</td><td>${x.type === 'income' ? html`<span class="badge green">وارد</span>` : html`<span class="badge orange">منصرف</span>`}</td><td>${x.description || ''}</td><td class="small">${x.ref || ''}</td><td>${money(x.amount, p.currency)}</td></tr>`)}
          </tbody></table></div>` : empty('لا توجد حركات مالية', 'database')}</div>
        <div class="card span2" style="grid-column:1/-1"><div class="card-head"><h3>${icon('wallet')} المطالبات والصرف بالشيكات</h3></div>${claimsTable(d.claims || [], p)}</div>
      </div>`;
    }

    if (t === 'media') {
      const M = d.can.media && p.status === 'active';
      return html`<div class="grid g3">
        <div class="card"><div class="card-head"><h3>${icon('link')} الرابط المعتمد للتوثيقات</h3>${M ? html`<button class="btn sm" data-media-link>${icon('edit')} ${p.media_link ? 'تعديل' : 'إضافة'}</button>` : ''}</div>
          <div class="card-body">${p.media_link ? html`<a href="${p.media_link}" target="_blank" rel="noopener noreferrer" class="ltr" style="word-break:break-all">${p.media_link}</a>` : html`<p class="muted">لم يُضف الرابط بعد. ترفع إدارة الإعلام التوثيقات عبر الرابط ثم تؤكد «تم الرفع والمراجعة» في المرحلة 8.</p>`}</div></div>
        <div class="card span2"><div class="card-head"><h3>${icon('camera')} خطة التغطية الإعلامية</h3>${M ? html`<button class="btn sm primary" data-add-media>${icon('plus')} تغطية</button>` : ''}</div>
          ${d.media.length ? d.media.map((m) => html`<div class="list-item"><div class="body"><b>${m.title}</b><div class="meta">${fmtDate(m.scheduled_date)} · ${m.reporter_name || 'لم يُحدد الإعلامي'}</div></div><span class="badge ${m.status === 'reviewed' || m.status === 'published' ? 'green' : 'amber'}">${MEDIA[m.status]}</span></div>`) : empty('لا توجد تغطيات مخططة', 'camera')}</div>
      </div>`;
    }

    if (t === 'files') return html`<div class="card"><div class="card-head"><h3>${icon('paperclip')} مرفقات المشروع</h3>
        <div class="row"><select class="input" style="width:200px" data-file-cat>${['الاعتماد الرسمي', 'عروض الأسعار', 'العقود', 'خطة التنفيذ', 'كشوف المستفيدين', 'سندات الدفع', 'الفواتير', 'سندات الاستلام', 'التوثيقات', 'الإخلاءات', 'أخرى'].map((c) => html`<option>${c}</option>`)}</select>
        <button class="btn sm primary" data-upload-cat>${icon('upload')} رفع ملف</button></div></div>
      ${filesHtml(d.files, (f) => state.user.isOwner || f.uploaded_by_name === state.user.full_name)}</div>`;
    if (t === 'errors') return html`<div class="card"><div class="card-head"><h3>${icon('flag')} الأخطاء المقيدة على المشروع</h3></div>${errorsHtml(d.errors)}</div>`;
    if (t === 'log') return html`<div class="card"><div class="card-head"><h3>${icon('history')} السجل الكامل لكل حركة</h3><button class="btn sm" data-comment>${icon('plus')} ملاحظة</button></div><div class="card-body">${timelineHtml(d.events)}</div></div>`;
    return '';
  }

  function claimsTable(claims, p) {
    if (!claims.length) return empty('لا توجد مطالبات بعد', 'wallet');
    const L = can('logistics.manage'); const F = can('finance.manage');
    return html`<div class="table-wrap"><table class="t"><thead><tr><th>المورد</th><th>المبلغ</th><th>إفادة اللوجستيات</th><th>إفادة المالية</th><th>الحالة</th><th>الصرف</th></tr></thead><tbody>
      ${claims.map((c) => html`<tr><td><b>${c.supplier_name}</b><div class="muted small">${c.description || ''}</div></td><td>${money(c.amount, p.currency)}</td>
        <td>${c.status === 'submitted' && L ? html`<label class="check"><input type="checkbox" data-claim-ok="${c.id}" data-as="logistics" ${c.logistics_ok ? raw('checked') : ''}> مطابقة</label>` : c.logistics_ok ? html`<span class="yes">✔</span>` : '—'}</td>
        <td>${c.status === 'submitted' && F ? html`<label class="check"><input type="checkbox" data-claim-ok="${c.id}" data-as="finance" ${c.finance_ok ? raw('checked') : ''}> مراجعة</label>` : c.finance_ok ? html`<span class="yes">✔</span>` : '—'}</td>
        <td><span class="badge ${CLAIM[c.status][1]}">${CLAIM[c.status][0]}</span></td>
        <td class="nowrap">${c.status === 'approved' && F ? html`<button class="btn sm primary" data-pay="${c.id}">${icon('wallet')} صرف بشيك</button>` : c.status === 'paid' ? html`<span class="small">شيك ${c.cheque_no} — ${c.bank}<br>${fmtDate(c.paid_at)}</span>` : ''}</td></tr>`)}
    </tbody></table></div>`;
  }

  await load();

  // ---------------- actions
  const reload = () => load().catch(fail);
  on(el, 'click', '[data-tab]', (e, t) => { tab = t.dataset.tab; setQuery({ tab }); render(); });
  on(el, 'click', '[data-print]', () => window.print());
  on(el, 'click', '[data-return]', () => openReturn('project', d, reload));
  on(el, 'click', '[data-delete]', async () => {
    if (!(await confirmBox('حذف المشروع وكل بياناته نهائيًا؟ لا يمكن التراجع.', { danger: true, ok: 'حذف نهائي' }))) return;
    try { await del('/projects/' + id); toast('تم الحذف', 'ok'); location.hash = '#/projects'; } catch (e) { fail(e); }
  });
  on(el, 'click', '[data-upload-cat]', () => { const c = el.querySelector('[data-file-cat]').value; const b = document.createElement('button'); b.dataset.upload = c; b.hidden = true; el.appendChild(b); b.click(); b.remove(); });
  on(el, 'click', '[data-edit-info]', () => {
    const p = d.entity;
    formModal({ title: 'تعديل بيانات المشروع', wide: true, fields: [
      { name: 'title', label: 'اسم المشروع', required: true, value: p.title, full: true },
      { name: 'donor', label: 'الجهة المانحة', value: p.donor }, { name: 'sector', label: 'القطاع', value: p.sector },
      { name: 'location', label: 'الموقع', value: p.location }, { name: 'approval_date', label: 'تاريخ ورود الاعتماد', type: 'date', value: p.approval_date },
      { name: 'grant_amount', label: 'مبلغ المنحة', type: 'number', value: p.grant_amount }, { name: 'beneficiaries', label: 'المستفيدون', type: 'number', value: p.beneficiaries },
      { name: 'size', label: 'الحجم', type: 'select', empty: false, value: p.size, options: [['small', 'صغير'], ['large', 'كبير']] },
      { name: 'priority', label: 'الأولوية', type: 'select', empty: false, value: p.priority, options: [['normal', 'عادية'], ['high', 'مرتفعة'], ['urgent', 'عاجلة']] },
      { name: 'end_date', label: 'تاريخ الانتهاء المتوقع', type: 'date', value: p.end_date },
      { name: 'description', label: 'الوصف', type: 'textarea', value: p.description },
    ], onSubmit: async (v) => { await patch('/projects/' + id, v); toast('تم الحفظ', 'ok'); reload(); } });
  });
  on(el, 'click', '[data-edit-plan]', () => {
    const p = d.entity;
    const fields = [
      { name: 'execution_date', label: 'موعد التنفيذ', type: 'date', required: true, value: p.execution_date },
      { name: 'plan_budget', label: 'ميزانية ومصاريف التنفيذ', type: 'number', step: '0.01', required: true, value: p.plan_budget },
      { name: 'plan_wages', label: 'الأجور التشغيلية', type: 'number', step: '0.01', value: p.plan_wages },
      { name: 'plan_notes', label: 'تفاصيل الخطة (الأنشطة، الفريق، آلية التوزيع، معايير الاستهداف)', type: 'textarea', rows: 6, value: p.plan_notes },
    ];
    if (!('plan_wages' in p) && !can('projects.edit')) fields.splice(2, 1);
    formModal({ title: 'خطة التنفيذ', fields, onSubmit: async (v) => { await patch('/projects/' + id, v); toast('تم حفظ الخطة', 'ok'); reload(); } });
  });
  on(el, 'click', '[data-fee]', () => {
    const p = d.entity;
    formModal({ title: 'خصم المخصص الإداري', intro: html`<p class="muted" style="margin-top:0">يُحسب المبلغ المعتمد للتنفيذ تلقائيًا = المنحة − (المنحة × النسبة).</p>`,
      fields: [{ name: 'admin_fee_pct', label: 'نسبة المخصص الإداري %', type: 'number', step: '0.1', min: 0, max: 100, required: true, value: p.admin_fee_pct ?? state.settings.default_admin_fee_pct ?? 7 }],
      onSubmit: async (v) => { await patch('/projects/' + id, v); toast('تم تحديد المبلغ المعتمد للتنفيذ', 'ok'); reload(); } });
  });
  on(el, 'click', '[data-media-link]', () => formModal({ title: 'الرابط المعتمد للتوثيقات', fields: [{ name: 'media_link', label: 'الرابط', dir: 'ltr', value: d.entity.media_link, placeholder: 'https://' }],
    onSubmit: async (v) => { await patch('/projects/' + id, v); reload(); } }));
  on(el, 'click', '[data-add-quote]', async () => {
    const sup = await api('/suppliers');
    if (!sup.length) return toast('أضف الموردين أولًا من صفحة اللوجستيات', 'err');
    formModal({ title: 'إضافة عرض سعر', fields: [
      { name: 'supplier_id', label: 'المورد', type: 'select', required: true, options: sup.filter((s) => s.is_active).map((s) => [s.id, s.name]) },
      { name: 'amount', label: 'إجمالي العرض', type: 'number', step: '0.01', required: true },
      { name: 'delivery_days', label: 'مدة التوريد (أيام)', type: 'number' },
      { name: 'details', label: 'تفاصيل وبنود العرض', type: 'textarea' },
    ], onSubmit: async (v) => { await post(`/projects/${id}/quotes`, v); reload(); } });
  });
  on(el, 'click', '[data-select-quote]', async (e, t) => {
    if (t.dataset.low === '1') { try { await post(`/quotes/${t.dataset.selectQuote}/select`); reload(); } catch (er) { fail(er); } return; }
    formModal({ title: 'اعتماد عرض ليس الأقل سعرًا', intro: html`<div class="gate" style="margin-bottom:12px">${icon('alert')} القاعدة اعتماد أقل عرض سعر. الاستثناء يتطلب مبررًا مكتوبًا يُحفظ في السجل.</div>`,
      fields: [{ name: 'reason', label: 'مبرر الاستثناء', type: 'textarea', required: true }],
      onSubmit: async (v) => { await post(`/quotes/${t.dataset.selectQuote}/select`, v); reload(); } });
  });
  on(el, 'click', '[data-del-quote]', async (e, t) => { if (await confirmBox('حذف العرض؟', { danger: true })) { try { await del('/quotes/' + t.dataset.delQuote); reload(); } catch (er) { fail(er); } } });
  on(el, 'click', '[data-add-contract]', async () => {
    const sup = await api('/suppliers');
    formModal({ title: 'إعداد عقد مورد', fields: [
      { name: 'title', label: 'عنوان العقد', required: true, value: 'عقد توريد – ' + d.entity.title, full: true },
      { name: 'supplier_id', label: 'المورد', type: 'select', required: true, options: sup.map((s) => [s.id, s.name]) },
      { name: 'amount', label: 'قيمة العقد', type: 'number', step: '0.01' },
      { name: 'delivery_date', label: 'موعد التوريد', type: 'date' },
      { name: 'quantities', label: 'الكميات والأسعار المتفق عليها', type: 'textarea' },
    ], onSubmit: async (v) => { await post('/contracts', { ...v, project_id: id }); toast('رُفع العقد للمدير العام لتوقيعه', 'ok'); reload(); } });
  });
  on(el, 'click', '[data-sign]', async (e, t) => { try { await post(`/contracts/${t.dataset.sign}/sign`); toast('تم التوقيع', 'ok'); reload(); } catch (er) { fail(er); } });
  on(el, 'click', '[data-reject-contract]', async (e, t) => { try { await post(`/contracts/${t.dataset.rejectContract}/sign`, { reject: true }); reload(); } catch (er) { fail(er); } });
  on(el, 'click', '[data-add-claim]', async () => {
    const sup = await api('/suppliers');
    formModal({ title: 'تقديم مطالبة مورد', fields: [
      { name: 'supplier_id', label: 'المورد', type: 'select', required: true, options: sup.map((s) => [s.id, s.name]), value: (d.quotes.find((q) => q.selected) || {}).supplier_id },
      { name: 'amount', label: 'المبلغ المستحق', type: 'number', step: '0.01', required: true },
      { name: 'description', label: 'مقابل (المواد التي تم توريدها)', type: 'textarea' },
    ], onSubmit: async (v) => { await post('/claims', { ...v, project_id: id }); reload(); } });
  });
  on(el, 'change', '[data-claim-ok]', async (e, t) => { try { await post(`/claims/${t.dataset.claimOk}/review`, { ok: t.checked, as: t.dataset.as }); reload(); } catch (er) { t.checked = !t.checked; fail(er); } });
  on(el, 'click', '[data-pay]', (e, t) => formModal({ title: 'صرف مستحقات المورد (العملية 12)', fields: [
    { name: 'cheque_no', label: 'رقم الشيك', required: true, dir: 'ltr' }, { name: 'bank', label: 'البنك', required: true },
    { name: 'html', type: 'html', full: true, html: html`<div class="note-box">لا تنسَ أخذ سندات الاستلام والفواتير من المورد وإرفاقها في تبويب المرفقات.</div>` },
  ], submit: 'تسجيل الصرف', onSubmit: async (v) => { await post(`/claims/${t.dataset.pay}/pay`, v); toast('تم تسجيل الصرف', 'ok'); reload(); } }));
  on(el, 'click', '[data-add-tx]', () => formModal({ title: 'حركة مالية على المشروع', fields: [
    { name: 'type', label: 'النوع', type: 'select', required: true, empty: false, options: [['income', 'وارد (استلام دفعة منحة)'], ['expense', 'منصرف']] },
    { name: 'amount', label: 'المبلغ', type: 'number', step: '0.01', required: true }, { name: 'tx_date', label: 'التاريخ', type: 'date', value: new Date().toISOString().slice(0, 10) },
    { name: 'category', label: 'التصنيف', type: 'select', options: [['grant', 'منحة'], ['operations', 'تشغيلية'], ['wages', 'أجور'], ['transport', 'نقل'], ['other', 'أخرى']] },
    { name: 'ref', label: 'المرجع (رقم سند/شيك)' }, { name: 'description', label: 'البيان', type: 'textarea' },
  ], onSubmit: async (v) => { await post('/transactions', { ...v, project_id: id }); reload(); } }));
  on(el, 'click', '[data-add-media]', async () => {
    const ppl = (await people()).filter((x) => x.dept_key === 'media');
    formModal({ title: 'تغطية إعلامية', fields: [
      { name: 'title', label: 'العنوان', required: true, value: 'تغطية يوم التنفيذ' },
      { name: 'kind', label: 'النوع', type: 'select', empty: false, options: [['coverage', 'تغطية ميدانية'], ['photo', 'تصوير'], ['video', 'فيديو'], ['story', 'قصة نجاح'], ['report', 'تقرير'], ['post', 'منشور']] },
      { name: 'scheduled_date', label: 'الموعد', type: 'date', value: d.entity.execution_date },
      { name: 'reporter_id', label: 'الإعلامي المكلف', type: 'select', options: ppl.map((x) => [x.id, x.full_name]) },
    ], onSubmit: async (v) => { await post('/media', { ...v, project_id: id }); reload(); } });
  });
}
