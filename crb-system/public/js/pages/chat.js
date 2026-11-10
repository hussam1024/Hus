import { html, raw, mount, icon, api, post, patch, del, state, can, formModal, toast, fail, empty, on, avatar, fmtTime, fmtDate, parseDate, people, esc, pickFile, uploadFile, confirmBox } from '../lib.js';

const KIND_LABEL = { public: 'القنوات العامة', department: 'قنوات الإدارات', project: 'نقاشات المشاريع', group: 'مجموعات العمل', dm: 'المحادثات الخاصة' };
const KIND_ICON = { public: '#', department: '◆', project: '▣', group: '◎', dm: '@' };
const EMOJIS = ['👍', '✅', '❤️', '👏', '🙏', '👀'];

// text → safe HTML with clickable links and highlighted @mentions
function richText(body) {
  let s = esc(body);
  s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/(^|\s)@([a-zA-Z0-9._-]{3,40})/g, '$1<span class="mention">@$2</span>');
  return raw(s);
}

export default async function ({ el, params, refreshPulse }) {
  let channels = await api('/chat/channels');
  let activeId = Number(params[0]) || (channels.find((c) => c.kind === 'public') || channels[0] || {}).id;
  let data = null; let replyTo = null; let timer = null; let showSide = !params[0];

  async function loadChannels() { channels = await api('/chat/channels'); }

  function sideHtml() {
    const groups = {};
    for (const c of channels) (groups[c.kind] = groups[c.kind] || []).push(c);
    return html`${['public', 'department', 'group', 'project', 'dm'].filter((k) => groups[k] || k === 'dm').map((k) => html`
      <div class="sec"><span>${KIND_LABEL[k]}</span>${k === 'dm' ? html`<button class="btn sm ghost" data-new-dm title="محادثة جديدة">${icon('plus', 'width="15"')}</button>` : (k === 'public' || k === 'group') && can('chat.manage') ? html`<button class="btn sm ghost" data-new-channel="${k}" title="إنشاء">${icon('plus', 'width="15"')}</button>` : ''}</div>
      ${(groups[k] || []).map((c) => html`<a class="chan ${c.id === activeId ? 'active' : ''}" href="#/chat/${c.id}" data-chan="${c.id}">
        <span class="hash" style="${c.dept_color ? raw('color:' + c.dept_color) : ''}">${KIND_ICON[k]}</span><span class="nm">${c.name}</span>${c.unread ? html`<span class="badge solid">${c.unread}</span>` : ''}</a>`)}`)}`;
  }

  function msgHtml(m, prev) {
    const d = parseDate(m.created_at);
    const pd = prev && parseDate(prev.created_at);
    const newDay = !pd || d.toDateString() !== pd.toDateString();
    const compact = !newDay && prev && prev.user_id === m.user_id && d - pd < 5 * 60e3 && !m.reply_to;
    const mine = m.user_id === state.user.id;
    return html`${newDay ? html`<div class="day-sep"><span>${fmtDate(m.created_at)}</span></div>` : ''}
      <div class="msg ${m.pinned ? 'pinned' : ''}" data-mid="${m.id}" ${compact ? raw('style="padding-top:0"') : ''}>
        ${compact ? html`<span style="width:36px;flex:none"></span>` : avatar({ id: m.user_id, full_name: m.full_name })}
        <div class="mb">
          ${compact ? '' : html`<div class="mh"><b>${m.full_name}</b><span>${m.dept_name || ''} · ${fmtTime(m.created_at)}</span>${m.pinned ? html`<span class="badge orange">📌 مثبتة</span>` : ''}</div>`}
          ${m.reply_to && m.reply_body ? html`<div class="reply">↩ ${m.reply_name}: ${m.reply_body.slice(0, 120)}</div>` : ''}
          ${m.deleted ? html`<div class="text muted"><i>تم حذف هذه الرسالة</i></div>` : html`<div class="text">${richText(m.body === '📎' && m.file_id ? '' : m.body)}${m.edited_at ? html` <span class="muted small">(معدّلة)</span>` : ''}</div>`}
          ${m.file_id ? html`<a class="btn sm" style="margin-top:4px" href="/api/files/${m.file_id}/download">${icon('paperclip')} ${m.file_name}</a>` : ''}
          ${m.reactions.length ? html`<div class="reacts">${m.reactions.map((r) => html`<button data-react="${m.id}" data-emoji="${r.emoji}" class="${r.users.includes(state.user.id) ? 'me' : ''}">${r.emoji} ${r.n}</button>`)}</div>` : ''}
        </div>
        ${m.deleted ? '' : html`<div class="tools">
          ${EMOJIS.slice(0, 4).map((e) => html`<button data-react="${m.id}" data-emoji="${e}">${e}</button>`)}
          <button data-reply="${m.id}" title="رد">↩</button>
          ${mine ? html`<button data-edit-msg="${m.id}" title="تعديل">✎</button>` : ''}
          ${data.canManage ? html`<button data-pin="${m.id}" title="تثبيت">📌</button>` : ''}
          ${mine || data.canManage ? html`<button data-del-msg="${m.id}" title="حذف">🗑</button>` : ''}
        </div>`}
      </div>`;
  }

  function render() {
    const ch = channels.find((c) => c.id === activeId);
    const title = ch ? ch.name : '';
    const desc = data && data.channel ? (data.channel.kind === 'dm' ? 'محادثة خاصة لا يطّلع عليها غيركما' : data.channel.description || '') : '';
    mount(el, html`<div class="card chat ${showSide ? 'show-side' : ''}">
      <aside class="chat-side">${sideHtml()}</aside>
      <section class="chat-main">
        ${data ? html`
        <div class="chat-head"><div class="row"><button class="btn sm ghost only-mobile" data-back>${icon('menu')}</button><div><b>${KIND_ICON[data.channel.kind]} ${title}</b><div class="muted small">${desc}</div></div></div>
          <div class="row">${data.members ? html`<span class="badge" title="${data.members.map((m) => m.full_name).join('، ')}">${icon('users', 'width="13"')} ${data.members.length} عضو</span>` : html`<span class="badge">${data.channel.kind === 'public' ? 'متاحة للجميع' : 'لمن يملك صلاحية المشاريع'}</span>`}
          ${data.channel.kind === 'project' ? html`<a class="btn sm" href="#/projects/${data.channel.project_id}">فتح المشروع</a>` : ''}</div></div>
        ${data.pinned.length ? html`<div class="pinned-bar">📌 ${data.pinned[0].full_name}: ${data.pinned[0].body.slice(0, 150)}${data.pinned.length > 1 ? html` <span class="muted">(+${data.pinned.length - 1})</span>` : ''}</div>` : ''}
        <div class="chat-msgs" id="msgs">${data.messages.length ? data.messages.map((m, i) => msgHtml(m, data.messages[i - 1])) : empty('ابدأ النقاش… اكتب أول رسالة 👋', 'chat')}</div>
        <div class="composer">
          ${replyTo ? html`<div class="replying"><span>↩ ردًا على ${replyTo.full_name}: ${replyTo.body.slice(0, 80)}</span><button class="btn sm ghost" data-cancel-reply>${icon('x', 'width="14"')}</button></div>` : ''}
          <form id="composer"><button type="button" class="icon-btn" data-attach title="إرفاق ملف">${icon('paperclip')}</button>
          <textarea id="mbody" rows="1" placeholder="اكتب رسالتك… (Enter للإرسال، Shift+Enter لسطر جديد، @اسم_المستخدم للإشارة)"></textarea>
          <button class="btn primary" type="submit">${icon('send')}</button></form>
        </div>` : empty(channels.length ? 'اختر قناة من القائمة' : 'لا توجد قنوات متاحة لك', 'chat')}
      </section></div>`);
    const box = el.querySelector('#msgs'); if (box) box.scrollTop = box.scrollHeight;
    const ta = el.querySelector('#mbody');
    if (ta) {
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; });
      el.querySelector('#composer').addEventListener('submit', (e) => { e.preventDefault(); send(); });
    }
  }

  async function open(id) {
    activeId = id;
    if (!id) { data = null; render(); return; }
    data = await api(`/chat/channels/${id}/messages`);
    const c = channels.find((x) => x.id === id); if (c) c.unread = 0;
    render(); refreshPulse();
    setTimeout(() => el.querySelector('#mbody')?.focus(), 30);
  }

  async function send() {
    const ta = el.querySelector('#mbody');
    const body = ta.value.trim(); if (!body) return;
    ta.value = '';
    try { await post(`/chat/channels/${activeId}/messages`, { body, reply_to: replyTo && replyTo.id }); replyTo = null; await poll(true); } catch (e) { ta.value = body; fail(e); }
  }

  async function poll(force) {
    if (!data || !activeId) return;
    const last = data.messages.length ? data.messages[data.messages.length - 1].id : 0;
    try {
      const r = await api(`/chat/channels/${activeId}/messages${last && !force ? '?after=' + last : ''}`);
      if (force || r.messages.length) {
        const box = el.querySelector('#msgs');
        const nearBottom = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 120;
        const draft = el.querySelector('#mbody')?.value || '';
        data = force ? r : { ...r, messages: [...data.messages, ...r.messages] };
        render();
        const ta = el.querySelector('#mbody'); if (ta) { ta.value = draft; ta.focus(); }
        const b2 = el.querySelector('#msgs'); if (b2 && !nearBottom) b2.scrollTop = b2.scrollTop; // keep position
      }
    } catch { /* ignore transient errors */ }
  }

  if (activeId) await open(activeId); else render();
  timer = setInterval(async () => { await poll(false); }, 4000);
  const chanTimer = setInterval(async () => { await loadChannels(); const side = el.querySelector('.chat-side'); if (side) mount(side, sideHtml()); }, 20000);

  // ---------- events
  on(el, 'click', '[data-chan]', (e, t) => { e.preventDefault(); history.replaceState(null, '', '#/chat/' + t.dataset.chan); showSide = false; open(Number(t.dataset.chan)); });
  on(el, 'click', '[data-back]', () => { showSide = true; render(); });
  on(el, 'click', '[data-react]', async (e, t) => { try { await post(`/chat/messages/${t.dataset.react}/react`, { emoji: t.dataset.emoji }); poll(true); } catch (er) { fail(er); } });
  on(el, 'click', '[data-reply]', (e, t) => { replyTo = data.messages.find((m) => m.id === Number(t.dataset.reply)); const draft = el.querySelector('#mbody').value; render(); el.querySelector('#mbody').value = draft; el.querySelector('#mbody').focus(); });
  on(el, 'click', '[data-cancel-reply]', () => { replyTo = null; render(); });
  on(el, 'click', '[data-pin]', async (e, t) => { try { await post(`/chat/messages/${t.dataset.pin}/pin`); poll(true); } catch (er) { fail(er); } });
  on(el, 'click', '[data-del-msg]', async (e, t) => { if (await confirmBox('حذف الرسالة؟', { danger: true })) { await del('/chat/messages/' + t.dataset.delMsg).catch(fail); poll(true); } });
  on(el, 'click', '[data-edit-msg]', (e, t) => {
    const m = data.messages.find((x) => x.id === Number(t.dataset.editMsg));
    formModal({ title: 'تعديل الرسالة', fields: [{ name: 'body', label: 'الرسالة', type: 'textarea', value: m.body, required: true }], onSubmit: async (v) => { await patch('/chat/messages/' + m.id, v); poll(true); } });
  });
  on(el, 'click', '[data-attach]', async () => {
    const f = await pickFile(); if (!f) return;
    try { const up = await uploadFile(f, 'channel', activeId, 'نقاش'); await post(`/chat/channels/${activeId}/messages`, { body: el.querySelector('#mbody').value.trim() || '📎', file_id: up.id }); poll(true); } catch (er) { fail(er); }
  });
  on(el, 'click', '[data-new-dm]', async () => {
    const ppl = (await people()).filter((p) => p.id !== state.user.id);
    formModal({ title: 'محادثة خاصة جديدة', submit: 'بدء المحادثة', fields: [{ name: 'user_id', label: 'الزميل', type: 'select', required: true, options: ppl.map((p) => [p.id, `${p.full_name} — ${p.dept_name || ''}`]) }],
      onSubmit: async (v) => { const r = await post('/chat/dm', v); await loadChannels(); history.replaceState(null, '', '#/chat/' + r.id); showSide = false; open(r.id); } });
  });
  on(el, 'click', '[data-new-channel]', async (e, t) => {
    const kind = t.dataset.newChannel;
    const ppl = await people();
    formModal({ title: kind === 'group' ? 'مجموعة عمل جديدة (أعضاء محددون)' : 'قناة عامة جديدة', submit: 'إنشاء', fields: [
      { name: 'name', label: 'الاسم', required: true }, { name: 'description', label: 'الوصف' },
      ...(kind === 'group' ? [{ name: 'members', label: 'الأعضاء', type: 'multi', options: ppl.filter((p) => p.id !== state.user.id).map((p) => [p.id, `${p.full_name} — ${p.dept_name || ''}`]) }] : []),
    ], onSubmit: async (v) => { const r = await post('/chat/channels', { ...v, kind }); await loadChannels(); toast('تم الإنشاء', 'ok'); history.replaceState(null, '', '#/chat/' + r.id); open(r.id); } });
  });

  return () => { clearInterval(timer); clearInterval(chanTimer); };
}
