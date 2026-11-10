import { html, raw, mount, icon, api, post, state, can, canAny, on, toast, fail, avatar, ago, esc } from './lib.js';

// ---------------------------------------------------------------- navigation (filtered by permission)
const NAV = [
  { label: 'الرئيسية', items: [
    { href: '#/', icon: 'home', label: 'لوحة التحكم' },
    { href: '#/calendar', icon: 'calendar', label: 'التقويم' },
    { href: '#/notifications', icon: 'bell', label: 'الإشعارات', badge: 'unread' },
  ] },
  { label: 'سير العمل', items: [
    { href: '#/projects', icon: 'layers', label: 'المشاريع', perm: ['projects.view'] },
    { href: '#/requests', icon: 'inbox', label: 'الطلبات', perm: ['requests.view', 'requests.view_all'] },
  ] },
  { label: 'الإدارات', items: [
    { href: '#/logistics', icon: 'truck', label: 'اللوجستيات', perm: ['logistics.view'] },
    { href: '#/finance', icon: 'wallet', label: 'المالية', perm: ['finance.view'] },
    { href: '#/media', icon: 'camera', label: 'الإعلام', perm: ['media.view'] },
    { href: '#/secretariat', icon: 'book', label: 'السكرتارية والمراسلات', perm: ['secretariat.view'] },
  ] },
  { label: 'بيئة العمل', items: [
    { href: '#/chat', icon: 'chat', label: 'ساحة النقاش', perm: ['chat.use'], badge: 'chat' },
    { href: '#/announcements', icon: 'megaphone', label: 'التعميمات' },
    { href: '#/tasks', icon: 'tasks', label: 'المهام', perm: ['tasks.use'] },
    { href: '#/meetings', icon: 'coffee', label: 'الاجتماعات والمحاضر', perm: ['meetings.view'] },
    { href: '#/leaves', icon: 'briefcase', label: 'الإجازات', perm: ['leaves.request', 'leaves.approve'] },
    { href: '#/directory', icon: 'users', label: 'دليل الموظفين', perm: ['directory.view'] },
  ] },
  { label: 'الرقابة والجودة', items: [
    { href: '#/errors', icon: 'flag', label: 'سجل الأخطاء الشهري', perm: ['errors.view'] },
    { href: '#/reports', icon: 'chart', label: 'التقارير ومؤشرات الأداء', perm: ['reports.view'] },
    { href: '#/files', icon: 'folder', label: 'الأرشيف المركزي', perm: ['files.view'] },
    { href: '#/guide', icon: 'book', label: 'دليل العمليات والاستخدام' },
  ] },
  { label: 'إدارة النظام', items: [
    { href: '#/admin/users', icon: 'users', label: 'المستخدمون وكلمات المرور', perm: ['users.manage'] },
    { href: '#/admin/roles', icon: 'shield', label: 'الأدوار ومصفوفة الصلاحيات', perm: ['roles.manage'] },
    { href: '#/admin/departments', icon: 'grid', label: 'الإدارات والأقسام', perm: ['departments.manage', 'roles.manage'] },
    { href: '#/admin/audit', icon: 'history', label: 'سجل التدقيق', perm: ['audit.view'] },
    { href: '#/admin/settings', icon: 'settings', label: 'الإعدادات والنسخ الاحتياطي', perm: ['settings.manage'] },
  ] },
];

const ROUTES = [
  [/^\/$/, 'dashboard'],
  [/^\/projects$/, 'projects', ['projects.view']],
  [/^\/projects\/(\d+)$/, 'project', ['projects.view']],
  [/^\/requests$/, 'requests', ['requests.view', 'requests.view_all']],
  [/^\/requests\/(\d+)$/, 'request'],
  [/^\/logistics$/, 'logistics', ['logistics.view']],
  [/^\/finance$/, 'finance', ['finance.view']],
  [/^\/media$/, 'media', ['media.view']],
  [/^\/secretariat$/, 'secretariat', ['secretariat.view']],
  [/^\/chat(?:\/(\d+))?$/, 'chat', ['chat.use']],
  [/^\/announcements$/, 'announcements'],
  [/^\/tasks$/, 'tasks', ['tasks.use']],
  [/^\/meetings$/, 'meetings', ['meetings.view']],
  [/^\/leaves$/, 'leaves', ['leaves.request', 'leaves.approve']],
  [/^\/directory$/, 'directory', ['directory.view']],
  [/^\/calendar$/, 'calendar'],
  [/^\/notifications$/, 'notifications'],
  [/^\/errors$/, 'errors', ['errors.view']],
  [/^\/reports$/, 'reports', ['reports.view']],
  [/^\/files$/, 'files', ['files.view']],
  [/^\/guide$/, 'guide'],
  [/^\/profile$/, 'profile'],
  [/^\/admin\/(users|roles|departments|audit|settings)$/, 'admin'],
];

let pulse = { unread: 0, chat: 0 };
let cleanup = null;
let lastLatest = 0;

// ---------------------------------------------------------------- theme
function applyTheme(t) {
  if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
}
try { applyTheme(localStorage.getItem('crb-theme')); } catch { /* ignore */ }
function currentTheme() {
  const a = document.documentElement.getAttribute('data-theme');
  if (a) return a;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ---------------------------------------------------------------- boot
async function boot() {
  try {
    const me = await api('/auth/me');
    state.user = me.user; state.org = me.org;
  } catch { return renderLogin(); }
  if (state.user.must_change_password) return renderChangePassword(true);
  renderShell();
}

// ---------------------------------------------------------------- login
function renderLogin() {
  document.title = 'تسجيل الدخول — منتدى الإغاثة والبناء';
  mount(document.getElementById('root'), html`<div class="login">
    <div class="art">
      <div class="row"><img src="/img/logo-sm.png" alt="" style="width:58px;border-radius:12px;background:#fff"><div><b style="font-size:18px">منتدى الإغاثة والبناء</b><div style="opacity:.8;direction:ltr;text-align:right">Coalition of Relief and Building</div></div></div>
      <div>
        <h1>نظام الإدارة المتكامل</h1>
        <p>بيئة عمل واحدة تجمع المشاريع والطلبات والإدارات وفريق العمل، وفق دليل العمليات الإدارية المعتمد.</p>
        <ul>
          <li>${icon('layers')} تتبع المشروع عبر 15 مرحلة من الاعتماد حتى الإغلاق</li>
          <li>${icon('shield')} لكل إدارة مساحتها وصلاحياتها، ولا يدخل أحد صفحة غيره</li>
          <li>${icon('flag')} قيد الأخطاء تلقائيًا في سجل الأخطاء الشهري</li>
          <li>${icon('chat')} ساحة نقاش وتعميمات ومهام واجتماعات في مكان واحد</li>
        </ul>
      </div>
      <div style="opacity:.75;font-size:13px;position:relative">الإدارة العامة – مأرب</div>
    </div>
    <div class="form-side"><form class="box" id="login-form" autocomplete="on">
      <img src="/img/logo.jpg" alt="شعار منتدى الإغاثة والبناء">
      <h2>منتدى الإغاثة والبناء</h2>
      <div class="sub">Coalition of Relief and Building</div>
      <div class="stack">
        <div class="field"><label for="u">اسم المستخدم</label><input id="u" name="username" dir="ltr" autocomplete="username" required></div>
        <div class="field"><label for="p">كلمة المرور</label><input id="p" name="password" type="password" dir="ltr" autocomplete="current-password" required></div>
        <div class="err hidden" id="login-err"></div>
        <button class="btn primary" style="width:100%;padding:11px" type="submit">${icon('lock')} دخول آمن</button>
        <p class="muted small" style="text-align:center">لا تملك حسابًا؟ الحسابات وكلمات المرور يصدرها المضيف الرئيسي للنظام فقط.</p>
      </div>
    </form></div>
  </div>`);
  const f = document.getElementById('login-form');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('login-err');
    err.classList.add('hidden');
    const btn = f.querySelector('button'); btn.disabled = true;
    try {
      const r = await post('/auth/login', { username: f.username.value.trim(), password: f.password.value });
      state.user = r.user;
      const me = await api('/auth/me').catch(() => null);
      if (me) state.org = me.org;
      if (state.user.must_change_password) renderChangePassword(true); else { location.hash = '#/'; renderShell(); }
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); } finally { btn.disabled = false; }
  });
  setTimeout(() => document.getElementById('u').focus(), 50);
}

// ---------------------------------------------------------------- forced password change
function renderChangePassword(forced) {
  mount(document.getElementById('root'), html`<div class="login"><div class="art">
      <div class="row"><img src="/img/logo-sm.png" alt="" style="width:58px;border-radius:12px;background:#fff"><b style="font-size:18px">منتدى الإغاثة والبناء</b></div>
      <div><h1>مرحبًا ${state.user.full_name}</h1><p>لحماية حسابك، يجب استبدال كلمة المرور المؤقتة التي استلمتها بكلمة مرور خاصة بك لا يعرفها أحد غيرك — ولا حتى المضيف الرئيسي.</p></div><div></div></div>
    <div class="form-side"><form class="box" id="cp">
      <img src="/img/logo.jpg" alt=""><h2>تعيين كلمة مرور جديدة</h2><div class="sub">${forced ? 'خطوة إلزامية قبل الدخول' : ''}</div>
      <div class="stack">
        <div class="field"><label>كلمة المرور الحالية (المؤقتة)</label><input name="current" type="password" dir="ltr" autocomplete="current-password"></div>
        <div class="field"><label>كلمة المرور الجديدة</label><input name="next" type="password" dir="ltr" autocomplete="new-password"><span class="hint">8 أحرف على الأقل وتحتوي على حروف وأرقام</span></div>
        <div class="field"><label>تأكيد كلمة المرور الجديدة</label><input name="next2" type="password" dir="ltr" autocomplete="new-password"></div>
        <div class="err hidden" id="cp-err"></div>
        <button class="btn primary" style="width:100%;padding:11px">${icon('key')} حفظ ومتابعة</button>
        <button type="button" class="btn ghost" style="width:100%" id="cp-out">${icon('logout')} تسجيل الخروج</button>
      </div></form></div></div>`);
  const f = document.getElementById('cp');
  document.getElementById('cp-out').onclick = logout;
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('cp-err');
    const show = (m) => { err.textContent = m; err.classList.remove('hidden'); };
    if (f.next.value !== f.next2.value) return show('كلمتا المرور غير متطابقتين');
    try {
      await post('/auth/change-password', { current: f.current.value, next: f.next.value });
      const me = await api('/auth/me'); state.user = me.user; state.org = me.org;
      toast('تم تعيين كلمة المرور بنجاح', 'ok');
      location.hash = '#/guide?welcome=1'; renderShell();
    } catch (ex) { show(ex.message); }
  });
}
window.addEventListener('crb:must-change', () => { if (state.user) { state.user.must_change_password = true; renderChangePassword(true); } });

async function logout() {
  try { await post('/auth/logout'); } catch { /* ignore */ }
  state.user = null; location.hash = '#/'; renderLogin();
}

// ---------------------------------------------------------------- shell
function navHtml() {
  return NAV.map((g) => {
    const items = g.items.filter((i) => !i.perm || canAny(...i.perm));
    if (!items.length) return '';
    return html`<div class="nav-group"><div class="label">${g.label}</div>${items.map((i) => html`<a href="${i.href}" data-nav="${i.href}">${icon(i.icon)}<span>${i.label}</span>${i.badge ? html`<span class="badge solid hidden" data-badge="${i.badge}"></span>` : ''}</a>`)}</div>`;
  });
}

function renderShell() {
  const u = state.user;
  mount(document.getElementById('root'), html`<div class="app">
    <aside class="sidebar" id="sidebar">
      <a class="brand" href="#/" style="text-decoration:none"><img src="/img/logo-sm.png" alt=""><div><div class="t1">${state.org.name || 'منتدى الإغاثة والبناء'}</div><div class="t2">${state.org.name_en || 'Coalition of Relief and Building'}</div></div></a>
      <nav class="nav">${navHtml()}</nav>
      <div class="sidebar-foot">نظام الإدارة المتكامل · الإصدار 1.0<br>وفق دليل العمليات الإدارية – نوفمبر 2026</div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" id="menu-btn" aria-label="القائمة">${icon('menu')}</button>
        <div class="search">${icon('search')}<input id="gsearch" placeholder="ابحث عن مشروع، طلب، موظف، مورد…" autocomplete="off"><div class="search-results hidden" id="gsearch-res"></div></div>
        <div class="top-actions">
          <button class="icon-btn" id="theme-btn" title="الوضع الليلي / النهاري">${icon(currentTheme() === 'dark' ? 'sun' : 'moon')}</button>
          ${can('chat.use') ? html`<a class="icon-btn" href="#/chat" title="ساحة النقاش">${icon('chat')}<span class="dot hidden" data-badge="chat"></span></a>` : ''}
          <a class="icon-btn" href="#/notifications" title="الإشعارات">${icon('bell')}<span class="dot hidden" data-badge="unread"></span></a>
          <button class="user-chip" id="user-btn">${avatar(u)}<div class="who"><b>${u.full_name}</b><span>${u.role_name}${u.dept_name ? ' · ' + u.dept_name : ''}</span></div></button>
        </div>
      </header>
      <main class="content" id="page"></main>
    </div>
  </div>`);

  const sidebar = document.getElementById('sidebar');
  document.getElementById('menu-btn').onclick = () => sidebar.classList.toggle('open');
  sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) sidebar.classList.remove('open'); });
  document.getElementById('theme-btn').onclick = (e) => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next); try { localStorage.setItem('crb-theme', next); } catch { /* ignore */ }
    mount(e.currentTarget, icon(next === 'dark' ? 'sun' : 'moon'));
  };
  document.getElementById('user-btn').onclick = (e) => { e.stopPropagation(); toggleUserMenu(); };
  setupSearch();
  api('/admin/settings').then((s) => { state.settings = s; }).catch(() => {});
  window.onhashchange = route;
  route();
  refreshPulse();
  clearInterval(window.__pulse);
  window.__pulse = setInterval(refreshPulse, 15000);
}

function toggleUserMenu() {
  const ex = document.querySelector('.dropdown'); if (ex) { ex.remove(); return; }
  const d = document.createElement('div'); d.className = 'dropdown';
  mount(d, html`<div style="padding:10px 12px"><b>${state.user.full_name}</b><div class="muted small ltr" style="text-align:right">@${state.user.username}</div></div><hr>
    <a href="#/profile">${icon('user')} ملفي وكلمة المرور</a>
    <a href="#/tasks">${icon('tasks')} مهامي</a>
    <a href="#/guide">${icon('book')} دليل الاستخدام</a><hr>
    <button data-logout>${icon('logout')} تسجيل الخروج</button>`);
  document.body.appendChild(d);
  d.querySelector('[data-logout]').onclick = logout;
  setTimeout(() => document.addEventListener('click', function h(e) { if (!d.contains(e.target)) { d.remove(); document.removeEventListener('click', h); } }), 0);
  d.addEventListener('click', (e) => { if (e.target.closest('a')) d.remove(); });
}

function setupSearch() {
  const inp = document.getElementById('gsearch');
  const box = document.getElementById('gsearch-res');
  let t;
  inp.addEventListener('input', () => {
    clearTimeout(t);
    const q = inp.value.trim();
    if (q.length < 2) { box.classList.add('hidden'); return; }
    t = setTimeout(async () => {
      try {
        const r = await api('/search?q=' + encodeURIComponent(q));
        mount(box, r.length ? r.map((x) => html`<a href="${x.link}"><span class="badge">${x.type}</span><span>${x.label}</span></a>`) : html`<div class="empty small">لا نتائج</div>`);
        box.classList.remove('hidden');
      } catch { /* ignore */ }
    }, 250);
  });
  box.addEventListener('click', () => { box.classList.add('hidden'); inp.value = ''; });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) box.classList.add('hidden'); });
}

async function refreshPulse() {
  if (!state.user) return;
  try {
    pulse = await api('/pulse');
    document.querySelectorAll('[data-badge]').forEach((b) => {
      const n = pulse[b.dataset.badge] || 0;
      b.textContent = n > 99 ? '99+' : n;
      b.classList.toggle('hidden', !n);
    });
    if (pulse.latest && pulse.latest.id > lastLatest) {
      if (lastLatest) toast('🔔 ' + pulse.latest.title);
      lastLatest = pulse.latest.id;
    }
    document.title = (pulse.unread ? `(${pulse.unread}) ` : '') + (state.org.name || 'منتدى الإغاثة والبناء');
  } catch { /* ignore */ }
}
export function bumpPulse() { refreshPulse(); }

// ---------------------------------------------------------------- router
async function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path] = hash.split('?');
  const old = document.getElementById('page');
  if (!old) return;
  // fresh element per route → listeners of the previous page are dropped automatically
  const page = old.cloneNode(false); old.replaceWith(page);
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const href = a.dataset.nav.slice(1);
    a.classList.toggle('active', href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  });
  const found = ROUTES.find(([re]) => re.test(path));
  if (!found) { mount(page, html`<div class="card card-pad empty">${icon('alert')}الصفحة غير موجودة</div>`); return; }
  const [re, mod, perms] = found;
  if (perms && !canAny(...perms)) {
    mount(page, html`<div class="card card-pad empty" style="padding:60px">${icon('lock')}<h3 style="color:var(--ink)">لا تملك صلاحية دخول هذه الصفحة</h3><p>هذه المساحة خاصة بإدارة أخرى. إذا كنت تحتاج الوصول، اطلب من المضيف الرئيسي منحك الصلاحية.</p><a class="btn" href="#/">العودة للوحة التحكم</a></div>`);
    return;
  }
  const params = path.match(re).slice(1);
  mount(page, html`<div class="grid g3"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`);
  window.scrollTo(0, 0);
  try {
    const m = await import(`./pages/${mod}.js`);
    const token = Symbol('route'); route.current = token;
    const c = await m.default({ el: page, params, refreshPulse });
    if (route.current !== token) { if (typeof c === 'function') c(); return; }
    cleanup = typeof c === 'function' ? c : null;
  } catch (e) {
    console.error(e);
    mount(page, html`<div class="card card-pad empty">${icon('alert')}${e.message || 'حدث خطأ'}</div>`);
  }
}

boot();
// expose for console-free debugging of rendering issues
window.__crb = { state, esc, ago };
