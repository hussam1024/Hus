import { html, mount, icon, api, post, pageHead, empty, on, ago } from '../lib.js';

const KI = { action: ['target', 'orange'], approval: ['shield', 'orange'], error: ['alert', 'red'], success: ['checkCircle', 'green'], cc: ['eye', 'blue'], mention: ['chat', 'purple'], message: ['chat', 'purple'], announcement: ['megaphone', 'green'], info: ['bell', 'blue'] };

export default async function ({ el, refreshPulse }) {
  let rows; let filter = 'all';
  const load = async () => { rows = await api('/notifications'); render(); };
  function render() {
    const list = rows.filter((n) => filter === 'all' || (filter === 'unread' ? !n.read_at : n.kind !== 'cc'));
    mount(el, html`${pageHead('الإشعارات', 'بديل الإيميلات العشوائية: كل حركة تخصك تصلك هنا فورًا', html`<button class="btn" data-all>${icon('check')} تعليم الكل كمقروء</button>`, 'bell')}
      <div class="card"><div class="card-head"><div class="seg"><button data-f="all" class="${filter === 'all' ? 'active' : ''}">الكل</button><button data-f="unread" class="${filter === 'unread' ? 'active' : ''}">غير المقروءة (${rows.filter((n) => !n.read_at).length})</button><button data-f="nocc" class="${filter === 'nocc' ? 'active' : ''}">بدون نسخ CC</button></div></div>
      ${list.length ? list.map((n) => { const [ic, c] = KI[n.kind] || KI.info; return html`<a class="list-item" href="${n.link || '#/notifications'}" data-n="${n.id}" style="${n.read_at ? '' : 'background:var(--green-50)'}">
        <div class="ic ${c}" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none">${icon(ic)}</div>
        <div class="body"><b style="${n.read_at ? 'font-weight:500' : ''}">${n.title}</b>${n.body ? html`<div class="meta">${n.body}</div>` : ''}</div><span class="muted small nowrap">${ago(n.created_at)}</span></a>`; }) : empty('لا توجد إشعارات', 'bell')}</div>`);
  }
  await load();
  on(el, 'click', '[data-f]', (e, t) => { filter = t.dataset.f; render(); });
  on(el, 'click', '[data-all]', async () => { await post('/notifications/read-all'); refreshPulse(); load(); });
  on(el, 'click', '[data-n]', (e, t) => { post(`/notifications/${t.dataset.n}/read`).then(refreshPulse).catch(() => {}); });
}
