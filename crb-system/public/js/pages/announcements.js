import { html, mount, icon, api, post, del, can, formModal, toast, fail, pageHead, empty, on, ago, avatar, departments, confirmBox, fmtDateTime } from '../lib.js';

const PR = { normal: ['عادي', ''], important: ['مهم', 'orange'], urgent: ['عاجل', 'red'] };

export default async function ({ el }) {
  const P = can('announcements.publish');
  let rows;
  const load = async () => { rows = await api('/announcements'); render(); };
  function render() {
    mount(el, html`${pageHead('التعميمات الرسمية', 'قرارات وتعليمات الإدارة العامة — مع تتبع من قرأ ومن أكّد الاطلاع', P ? html`<button class="btn primary" data-new>${icon('megaphone')} نشر تعميم</button>` : '', 'megaphone')}
      <div class="stack">${rows.length ? rows.map((a) => html`<div class="card" style="${a.priority === 'urgent' ? 'border-color:var(--red)' : a.priority === 'important' ? 'border-color:var(--orange)' : ''}">
        <div class="card-head"><div class="row">${avatar({ id: a.created_by, full_name: a.author })}<div><h3>${a.title}</h3><div class="muted small">${a.author} · ${ago(a.created_at)} ${a.audience_name ? '· موجّه إلى: ' + a.audience_name : '· لجميع الطاقم'}</div></div></div>
          <div class="row">${a.priority !== 'normal' ? html`<span class="badge ${PR[a.priority][1]}">${PR[a.priority][0]}</span>` : ''}${P ? html`<button class="btn sm ghost" data-del="${a.id}">${icon('trash')}</button>` : ''}</div></div>
        <div class="card-body" style="white-space:pre-wrap">${a.body}</div>
        <div class="card-head" style="border-top:1px solid var(--line-2);border-bottom:0">
          ${a.my_read ? html`<span class="badge green">${icon('check', 'width="13"')} اطّلعت وأكّدت ${fmtDateTime(a.my_read)}</span>` : html`<button class="btn sm ${a.require_ack ? 'accent' : ''}" data-ack="${a.id}">${icon('check')} ${a.require_ack ? 'أؤكد اطلاعي والتزامي' : 'تمت القراءة'}</button>`}
          ${P && a.audience_total ? html`<details><summary class="small" style="cursor:pointer">اطّلع ${a.reads} من ${a.audience_total}</summary><div class="small muted">${a.readers.map((r) => r.full_name).join('، ') || '—'}</div></details>` : ''}
        </div></div>`) : html`<div class="card">${empty('لا توجد تعميمات', 'megaphone')}</div>`}</div>`);
  }
  await load();
  on(el, 'click', '[data-ack]', async (e, t) => { await post(`/announcements/${t.dataset.ack}/ack`).catch(fail); load(); });
  on(el, 'click', '[data-del]', async (e, t) => { if (await confirmBox('حذف التعميم؟', { danger: true })) { await del('/announcements/' + t.dataset.del).catch(fail); load(); } });
  on(el, 'click', '[data-new]', async () => {
    const deps = await departments();
    formModal({ title: 'نشر تعميم رسمي', submit: 'نشر وإشعار الجميع', wide: true, fields: [
      { name: 'title', label: 'العنوان', required: true, full: true }, { name: 'body', label: 'نص التعميم', type: 'textarea', rows: 8, required: true },
      { name: 'audience_dept_id', label: 'الجمهور', type: 'select', empty: 'جميع الطاقم', options: deps.map((x) => [x.id, x.name]) },
      { name: 'priority', label: 'الأهمية', type: 'select', empty: false, options: [['normal', 'عادي'], ['important', 'مهم'], ['urgent', 'عاجل']] },
      { name: 'expires_at', label: 'ينتهي عرضه في (اختياري)', type: 'date' },
      { name: 'require_ack', label: 'يتطلب تأكيد اطلاع من كل موظف (يظهر لك من أكّد ومن لم يؤكد)', type: 'checkbox', full: true },
    ], onSubmit: async (v) => { await post('/announcements', v); toast('تم النشر', 'ok'); load(); } });
  });
}
