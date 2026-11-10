import { html, mount, icon, api, post, can, pageHead, empty, on, avatar, ago, query } from '../lib.js';

export default async function ({ el }) {
  const rows = await api('/directory');
  let q = ''; const hl = Number(query().u) || null;
  function render() {
    const list = rows.filter((u) => !q || `${u.full_name} ${u.job_title} ${u.dept_name} ${u.username}`.includes(q));
    const groups = {};
    for (const u of list) (groups[u.dept_name || 'بدون إدارة'] = groups[u.dept_name || 'بدون إدارة'] || { color: u.dept_color, users: [] }).users.push(u);
    mount(el, html`${pageHead('دليل الموظفين', `${rows.length} عضو في طاقم المنتدى`, html`<input class="input" style="width:260px" placeholder="ابحث بالاسم أو المسمى…" data-q value="${q}">`, 'users')}
      ${Object.keys(groups).length ? Object.entries(groups).map(([name, g]) => html`<h3 style="margin:18px 0 10px;display:flex;align-items:center;gap:8px"><span class="dot-c" style="background:${g.color || '#999'}"></span>${name} <span class="badge">${g.users.length}</span></h3>
        <div class="grid g4">${g.users.map((u) => html`<div class="card card-pad" style="${u.id === hl ? 'border-color:var(--orange);box-shadow:0 0 0 3px var(--orange-50)' : ''}">
          <div class="row">${avatar(u, 'lg')}<div style="min-width:0"><b>${u.full_name}</b><div class="muted small">${u.job_title || ''}</div><div class="small"><span class="badge">${u.role_name}</span> ${u.on_leave ? html`<span class="badge amber">في إجازة</span>` : ''}</div></div></div>
          <div class="small" style="margin-top:10px;line-height:1.9">${u.email ? html`<div class="ltr" style="text-align:right">✉ ${u.email}</div>` : ''}${u.phone ? html`<div class="ltr" style="text-align:right">☎ ${u.phone}</div>` : ''}<div class="muted">@${u.username} · ${u.last_login ? 'آخر دخول ' + ago(u.last_login) : 'لم يدخل بعد'}</div></div>
          ${can('chat.use') ? html`<button class="btn sm" style="margin-top:8px;width:100%" data-dm="${u.id}">${icon('chat')} مراسلة خاصة</button>` : ''}
        </div>`)}</div>`) : html`<div class="card">${empty('لا نتائج', 'users')}</div>`}`);
  }
  render();
  on(el, 'input', '[data-q]', (e, t) => { q = t.value.trim(); render(); const n = el.querySelector('[data-q]'); n.focus(); n.setSelectionRange(q.length, q.length); });
  on(el, 'click', '[data-dm]', async (e, t) => { const r = await post('/chat/dm', { user_id: Number(t.dataset.dm) }); location.hash = '#/chat/' + r.id; });
}
