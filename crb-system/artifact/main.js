// =====================================================================
//  منتدى الإغاثة والبناء — نسخة Claude (قاعدة بيانات مشتركة عبر db)
//  lib.js (html/esc/icon/modal/formModal/toast/fmt...) is inlined above.
// =====================================================================

// ------------------------------------------------------------ manual
const PROJECT_STAGES = __PROJECT_STAGES__;
const REQUEST_STAGES = __REQUEST_STAGES__;
const GENERAL_RULES = __GENERAL_RULES__;

// ------------------------------------------------------------ permissions
const PERMS = [
  ['المشاريع', 'projects.view', 'عرض المشاريع ومراحلها'], ['المشاريع', 'projects.create', 'تسجيل مشروع معتمد'], ['المشاريع', 'projects.edit', 'تعديل بيانات المشروع وخطة التنفيذ'], ['المشاريع', 'projects.delete', 'حذف مشروع'],
  ['الطلبات', 'requests.view', 'عرض طلبات إدارته أو المكلّف بها'], ['الطلبات', 'requests.view_all', 'عرض جميع الطلبات'], ['الطلبات', 'requests.create', 'تسجيل طلب وارد من المانح'],
  ['سير العمل', 'workflow.act', 'تنفيذ المراحل الخاصة بإدارته'], ['سير العمل', 'workflow.approve', 'اعتماد المراحل (المدير العام) وتوقيع العقود'], ['سير العمل', 'workflow.return', 'إرجاع العمل لتصحيح خطأ'], ['سير العمل', 'workflow.override', 'تنفيذ أي مرحلة نيابةً عن أي إدارة'],
  ['اللوجستيات', 'logistics.view', 'عرض عروض الأسعار والموردين والعقود'], ['اللوجستيات', 'logistics.manage', 'إدارة العروض والموردين والعقود والمطالبات'],
  ['المالية', 'finance.view', 'عرض البيانات المالية'], ['المالية', 'finance.manage', 'المخصص الإداري والصرف والحركات المالية'],
  ['الإعلام', 'media.view', 'عرض التغطيات والتوثيقات'], ['الإعلام', 'media.manage', 'إدارة التغطيات ورابط التوثيقات'],
  ['السكرتارية', 'secretariat.view', 'عرض سجل الوارد والصادر'], ['السكرتارية', 'secretariat.manage', 'إدارة الوارد والصادر'],
  ['الرقابة', 'errors.view', 'عرض سجل الأخطاء الشهري'], ['الرقابة', 'errors.manage', 'تعديل وإغلاق قيود الأخطاء'], ['الرقابة', 'reports.view', 'التقارير ومؤشرات الأداء'],
  ['التواصل', 'chat.use', 'المشاركة في ساحة النقاش'], ['التواصل', 'chat.all', 'الاطلاع على قنوات كل الإدارات'], ['التواصل', 'announcements.publish', 'نشر التعميمات الرسمية'],
  ['الموظف', 'tasks.use', 'المهام'], ['الموظف', 'tasks.assign', 'إسناد المهام للآخرين'], ['الموظف', 'directory.view', 'دليل الموظفين'],
];
const ALLP = PERMS.map((p) => p[1]);
const BASE = ['chat.use', 'tasks.use', 'directory.view'];
const DEFAULT_ROLES = {
  gm: { name: 'المدير العام', desc: 'يطّلع على كل العمليات (نسخة CC)، ويعتمد المراحل، وينشر التعميمات.', perms: [...BASE, 'projects.view', 'projects.create', 'projects.edit', 'requests.view', 'requests.view_all', 'requests.create', 'workflow.act', 'workflow.approve', 'workflow.return', 'logistics.view', 'finance.view', 'media.view', 'secretariat.view', 'errors.view', 'errors.manage', 'reports.view', 'chat.all', 'announcements.publish', 'tasks.assign'] },
  head: { name: 'مدير إدارة', desc: 'يدير إدارته، يُسند المهام لفريقه، ويُرجع الأخطاء.', perms: [...BASE, 'workflow.act', 'workflow.return', 'tasks.assign', 'errors.view', 'reports.view'] },
  officer: { name: 'موظف', desc: 'ينفّذ المراحل والمهام الخاصة بإدارته.', perms: [...BASE, 'workflow.act'] },
  auditor: { name: 'مدقق / مراقب', desc: 'اطلاع فقط على جميع الوحدات دون أي تعديل.', perms: ['projects.view', 'requests.view', 'requests.view_all', 'logistics.view', 'finance.view', 'media.view', 'secretariat.view', 'errors.view', 'reports.view', 'directory.view', 'chat.use', 'chat.all'] },
};
const DEFAULT_DEPTS = {
  gm: { name: 'الإدارة العامة', color: '#0b7a3e', perms: ['projects.view', 'projects.create', 'projects.edit', 'requests.view', 'requests.view_all', 'logistics.view', 'finance.view', 'media.view', 'secretariat.view', 'reports.view', 'errors.view'] },
  secretariat: { name: 'سكرتارية الإدارة العامة', color: '#6c4bb4', perms: ['projects.view', 'requests.view', 'requests.view_all', 'requests.create', 'secretariat.view', 'secretariat.manage', 'media.view', 'errors.view', 'errors.manage', 'reports.view'] },
  projects: { name: 'إدارة المشاريع', color: '#01a453', perms: ['projects.view', 'projects.edit', 'requests.view', 'media.view', 'logistics.view'] },
  logistics: { name: 'إدارة اللوجستيات', color: '#d9631a', perms: ['projects.view', 'requests.view', 'logistics.view', 'logistics.manage'] },
  finance: { name: 'الإدارة المالية', color: '#1769aa', perms: ['projects.view', 'requests.view', 'finance.view', 'finance.manage', 'logistics.view'] },
  media: { name: 'إدارة الإعلام', color: '#c2185b', perms: ['projects.view', 'requests.view', 'media.view', 'media.manage'] },
};
const CORE_DEPTS = Object.keys(DEFAULT_DEPTS);

// ------------------------------------------------------------ state
const S = {
  db: null, user: null, assets: null, uid: null, isOwner: false, writable: null,
  loaded: {}, staff: {}, join: {}, config: null, projects: {}, requests: {}, errors: {}, suppliers: {}, tasks: {}, ann: {}, corr: {}, chat: {}, mine: null,
};
const UI = { prj: { f: 'active', q: '', view: 'list' }, req: { f: 'active' }, tabs: {}, chatCh: 'general', reply: null, month: new Date().toISOString().slice(0, 7), taskScope: 'mine', open: {} };

const now = () => new Date().toISOString();
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const vals = (o) => Object.entries(o || {}).filter(([, v]) => v).map(([id, v]) => ({ id, ...v }));
const cfg = () => {
  const c = S.config || {};
  const roles = { ...DEFAULT_ROLES }; for (const [k, v] of Object.entries(c.roles || {})) if (v) roles[k] = { ...(roles[k] || {}), ...v };
  const depts = { ...DEFAULT_DEPTS }; for (const [k, v] of Object.entries(c.depts || {})) if (v) depts[k] = { ...(depts[k] || {}), ...v };
  return { roles, depts };
};
const deptName = (k) => (cfg().depts[k] || {}).name || '—';
const deptColor = (k) => (cfg().depts[k] || {}).color || '#7b8a81';
const roleName = (s) => (s && s.role === 'owner' ? 'المضيف الرئيسي' : (cfg().roles[s && s.role] || {}).name || '—');
const me = () => S.staff[S.uid] || null;
const myDept = () => (me() || {}).dept;
const nm = (uid) => (S.staff[uid] || {}).name || (S.join[uid] || {}).name || 'غير معروف';
const activeStaff = () => vals(S.staff).filter((s) => s.active !== false);

function permsOf(uid) {
  const s = S.staff[uid];
  if (!s || s.active === false) return new Set();
  if (s.role === 'owner' || (uid === S.uid && S.isOwner)) return new Set(ALLP);
  const c = cfg();
  const set = new Set([...((c.roles[s.role] || {}).perms || []), ...((c.depts[s.dept] || {}).perms || [])]);
  for (const p of s.extra || []) set.add(p);
  for (const p of s.denied || []) set.delete(p);
  return set;
}
const can = (p) => S.isOwner || permsOf(S.uid).has(p);
const canAny = (...ps) => ps.some(can);

function hashColor(s) { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ['#01a453', '#ef7023', '#1769aa', '#6c4bb4', '#c2185b', '#0b7a3e', '#d9631a', '#00838f'][h % 8]; }
const av = (uid, cls = '') => html`<span class="avatar ${cls}" style="background:${raw(hashColor(uid))}">${initials(nm(uid))}</span>`;

// ------------------------------------------------------------ db helpers
const ERR = { invalid_argument: 'تعذّر الحفظ: ليست لديك صلاحية كتابة على هذه الصفحة. اطلب من المضيف الرئيسي مشاركتها معك بصلاحية «محرر».', quota_exceeded: 'امتلأت سعة قاعدة البيانات.', resource_exhausted: 'طلبات كثيرة في وقت قصير، انتظر لحظة ثم أعد المحاولة.', revoked: 'سُحبت صلاحية الوصول لهذه الصفحة.' };
async function W(path, data, mode = 'update') {
  try {
    const ref = S.db.doc(path);
    if (mode === 'set') await ref.set(data); else if (mode === 'delete') await ref.delete(); else await ref.update(data);
  } catch (e) {
    if (e && e.code === 'unavailable') { await new Promise((r) => setTimeout(r, 600 + Math.random() * 600)); return W(path, data, mode); }
    const msg = ERR[e && e.code] || 'تعذّر الحفظ، أعد المحاولة.';
    toast(msg, 'err');
    const er = new Error(msg); er.silent = true; er.code = (e && e.code) || 'error'; throw er;
  }
}
const evt = (stage, action, note) => ({ [nid()]: { stage: stage || null, action, note: note || null, by: S.uid, at: now() } });

// ------------------------------------------------------------ boot
function subscribe(coll, key, opts = {}) {
  let q = S.db.collection(coll);
  if (opts.order) q = q.orderBy(opts.order, 'desc');
  if (opts.limit) q = q.limit(opts.limit);
  q.onSnapshot((snap) => {
    const o = {}; for (const d of snap.docs) o[d.id] = d.data();
    S[key] = o; if (!snap.metadata.fromCache) S.loaded[key] = true;
    schedule();
  }, (e) => { S.loaded[key] = true; if (e.code === 'revoked') S.revoked = true; schedule(); });
}

async function boot() {
  document.documentElement.setAttribute('dir', 'rtl'); document.documentElement.setAttribute('lang', 'ar');
  mount(document.getElementById('root'), splash('جارٍ الاتصال بقاعدة البيانات…'));
  let tries = 0; while (!window.claude && tries++ < 30) await new Promise((r) => setTimeout(r, 100));
  if (!window.claude) return mount(document.getElementById('root'), splash('افتح هذا الرابط من داخل Claude وأنت مسجّل الدخول.', true));
  const [db, user, assets] = await Promise.all([claude.use('db'), claude.use('user'), claude.use('assets').catch(() => null)]);
  S.db = db; S.user = user; S.assets = assets;
  if (!db || !user) return mount(document.getElementById('root'), splash('لا يمكن تشغيل النظام هنا. سجّل الدخول إلى Claude ثم افتح الرابط الذي شاركه معك المضيف الرئيسي.', true));
  S.uid = await user.id(); S.isOwner = await user.isOwner(); S.writable = await user.can('data.write');
  if (!S.uid) return mount(document.getElementById('root'), splash('لم يتعرّف النظام على حسابك. سجّل الدخول إلى Claude ثم افتح الرابط مجددًا.', true));
  S.myName = await user.name();
  S.db.doc('config/perms').onSnapshot((d) => { S.config = d.exists ? d.data() : null; S.loaded.config = true; schedule(); }, () => { S.loaded.config = true; schedule(); });
  S.db.doc(`data/users/${S.uid}/state`).onSnapshot((d) => { S.mine = d.exists ? d.data() : {}; schedule(); }, () => { S.mine = {}; });
  subscribe('staff', 'staff'); subscribe('join', 'join');
  ['projects', 'requests', 'errors', 'suppliers', 'tasks', 'corr'].forEach((c) => subscribe(c, c));
  subscribe('ann', 'ann'); subscribe('chat', 'chat', { order: 'day', limit: 120 });
  setTimeout(() => { if (!S.loaded.staff) { S.slow = true; schedule(); } }, 10000);
  window.addEventListener('hashchange', () => { closeMenus(); schedule(true); });
  bindGlobal();
}

function splash(msg, err) {
  return html`<div class="login"><div class="art"><div class="row"><img src="${raw(LOGO)}" alt="" style="width:58px;border-radius:12px;background:#fff"><div><b style="font-size:18px">منتدى الإغاثة والبناء</b><div style="opacity:.8;direction:ltr;text-align:right">Coalition of Relief and Building</div></div></div>
    <div><h1>نظام الإدارة المتكامل</h1><p>بيئة عمل واحدة تجمع المشاريع والطلبات والإدارات وفريق العمل، وفق دليل العمليات الإدارية المعتمد.</p></div><div></div></div>
    <div class="form-side"><div class="box" style="text-align:center"><img src="${raw(LOGO)}" alt="شعار منتدى الإغاثة والبناء"><h2>منتدى الإغاثة والبناء</h2><div class="sub">Coalition of Relief and Building</div>
    <p class="${err ? 'err' : 'muted'}">${msg}</p>${err ? '' : html`<div class="skeleton" style="height:8px;margin-top:14px"></div>`}</div></div></div>`;
}

// ------------------------------------------------------------ render loop
let pending = false; let lastPage = '';
function schedule(scrollTop) {
  if (scrollTop) UI.scrollTop = true;
  if (pending) return; pending = true;
  requestAnimationFrame(() => { pending = false; renderApp(); });
}

let gateKey = '';
function gate() {
  gateKey = 'x';
  if (S.revoked) return splash('سُحبت صلاحية وصولك إلى هذه الصفحة.', true);
  if (!S.loaded.staff || !S.loaded.config) return S.slow ? splash('تعذّر الوصول إلى البيانات حتى الآن. تحقّق من اتصالك بالإنترنت؛ ستظهر البيانات تلقائيًا عند عودته.', true) : splash('جارٍ تحميل البيانات…');
  const s = me();
  if (!s && S.isOwner) { gateKey = 'owner'; return ownerSetup(); }
  if (!s && !S.join[S.uid]) gateKey = 'join';
  if (!s) return S.join[S.uid] ? splash('تم استلام طلب انضمامك ✔ بانتظار موافقة المضيف الرئيسي وتحديد إدارتك وصلاحياتك. ستُفتح لك مساحتك تلقائيًا فور الموافقة.') : joinForm();
  if (s.active === false) return splash('حسابك موقوف حاليًا. تواصل مع المضيف الرئيسي.', true);
  return null;
}

function renderApp() {
  const root = document.getElementById('root');
  const g = gate();
  if (g) {
    const typing = root.querySelector('#gate-form') && root.dataset.gate === gateKey;
    if (!typing) { mount(root, g); root.dataset.gate = gateKey; }
    lastPage = ''; return;
  }
  root.dataset.gate = '';
  if (!root.querySelector('.app')) { mount(root, shell()); lastPage = ''; }
  // sidebar badges & topbar
  mount(document.getElementById('nav'), navHtml());
  const n = notifs().filter((x) => x.isNew).length;
  const dot = document.getElementById('bell-dot'); dot.textContent = n > 99 ? '99+' : n; dot.hidden = !n;
  const page = document.getElementById('page');
  const { name, param } = parseRoute();
  const key = name + ':' + (param || '');
  const ae = document.activeElement;
  const keep = ae && ae.id && page.contains(ae) ? { id: ae.id, v: ae.value, s: ae.selectionStart, e: ae.selectionEnd } : null;
  const chatBox = document.getElementById('msgs'); const nearBottom = !chatBox || chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 140; const oldTop = chatBox && chatBox.scrollTop;
  let content;
  try { content = routeContent(name, param); } catch (e) { console.error(e); content = html`<div class="card card-pad empty">${icon('alert')}حدث خطأ في عرض الصفحة</div>`; }
  mount(page, content);
  if (keep) { const el = document.getElementById(keep.id); if (el) { if ('value' in el && keep.v !== undefined && el.value !== keep.v) el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch { /* */ } } }
  const box = document.getElementById('msgs');
  if (box) { if (key !== lastPage || nearBottom) box.scrollTop = box.scrollHeight; else box.scrollTop = oldTop; }
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + (NAV_ALIAS[name] || name)));
  if (key !== lastPage && UI.scrollTop) { window.scrollTo(0, 0); UI.scrollTop = false; }
  if (name === 'chat') markChatSeen();
  lastPage = key;
}
const NAV_ALIAS = { project: 'projects', request: 'requests', '': 'home' };
function parseRoute() {
  const h = location.hash.replace(/^#/, '') || 'home';
  const m = /^(project|request|chat)-(.+)$/.exec(h);
  return m ? { name: m[1], param: m[2] } : { name: h, param: null };
}

// ------------------------------------------------------------ gate screens
function ownerSetup() {
  return html`<div class="login"><div class="art"><div class="row"><img src="${raw(LOGO)}" alt="" style="width:58px;border-radius:12px;background:#fff"><b style="font-size:18px">منتدى الإغاثة والبناء</b></div>
    <div><h1>أهلًا بك أيها المضيف الرئيسي</h1><p>هذه أول مرة يُفتح فيها النظام. أدخل اسمك لتفعيل حسابك كمضيف رئيسي، ثم ادعُ الموظفين من زر المشاركة في Claude ووزّع عليهم الإدارات والصلاحيات.</p></div><div></div></div>
    <div class="form-side"><form class="box" id="gate-form" data-submit="ownerSetup"><img src="${raw(LOGO)}" alt=""><h2>تفعيل حساب المضيف الرئيسي</h2><div class="sub">خطوة واحدة</div>
      <div class="stack"><div class="field"><label for="g-name">اسمك الكامل</label><input id="g-name" name="name" value="${S.myName || ''}" required></div>
      <div class="field"><label for="g-title">المسمى الوظيفي</label><input id="g-title" name="title" value="المدير العام"></div>
      <button class="btn primary" style="width:100%;padding:11px">${icon('crown')} تفعيل النظام</button></div></form></div></div>`;
}
function joinForm() {
  return html`<div class="login"><div class="art"><div class="row"><img src="${raw(LOGO)}" alt="" style="width:58px;border-radius:12px;background:#fff"><b style="font-size:18px">منتدى الإغاثة والبناء</b></div>
    <div><h1>مرحبًا بك في نظام المنتدى</h1><p>عرّف بنفسك ليوافق المضيف الرئيسي على انضمامك ويحدد إدارتك. بعد الموافقة تظهر لك مساحة عملك مباشرة.</p></div><div></div></div>
    <div class="form-side"><form class="box" id="gate-form" data-submit="join"><img src="${raw(LOGO)}" alt=""><h2>طلب الانضمام</h2><div class="sub">Coalition of Relief and Building</div>
      <div class="stack"><div class="field"><label for="g-name">الاسم الكامل</label><input id="g-name" name="name" value="${S.myName || ''}" required></div>
      <div class="field"><label for="g-title">المسمى الوظيفي</label><input id="g-title" name="title" placeholder="مثال: محاسب"></div>
      <div class="field"><label for="g-dept">الإدارة التي تعمل بها</label><select id="g-dept" name="dept"><option value="">— اختر —</option>${Object.entries(cfg().depts).map(([k, d]) => html`<option value="${k}">${d.name}</option>`)}</select></div>
      <div class="field"><label for="g-phone">رقم الهاتف</label><input id="g-phone" name="phone" dir="ltr"></div>
      ${S.writable === false ? html`<div class="err">صلاحيتك الحالية على الصفحة «مشاهدة فقط». اطلب من المضيف الرئيسي مشاركتها معك بصلاحية «محرر».</div>` : ''}
      <button class="btn primary" style="width:100%;padding:11px">${icon('send')} إرسال طلب الانضمام</button></div></form></div></div>`;
}

// ------------------------------------------------------------ shell & nav
const NAV = [
  { label: 'الرئيسية', items: [['home', 'home', 'لوحة التحكم'], ['notifications', 'bell', 'الإشعارات', null, 'notif']] },
  { label: 'سير العمل', items: [['projects', 'layers', 'المشاريع', ['projects.view']], ['requests', 'inbox', 'الطلبات', ['requests.view', 'requests.view_all']]] },
  { label: 'الإدارات', items: [['logistics', 'truck', 'اللوجستيات', ['logistics.view']], ['finance', 'wallet', 'المالية', ['finance.view']], ['media', 'camera', 'الإعلام', ['media.view']], ['secretariat', 'book', 'السكرتارية والمراسلات', ['secretariat.view']]] },
  { label: 'بيئة العمل', items: [['chat', 'chat', 'ساحة النقاش', ['chat.use'], 'chat'], ['announcements', 'megaphone', 'التعميمات'], ['tasks', 'tasks', 'المهام', ['tasks.use']], ['directory', 'users', 'دليل الموظفين', ['directory.view']]] },
  { label: 'الرقابة والجودة', items: [['errors', 'flag', 'سجل الأخطاء الشهري', ['errors.view']], ['reports', 'chart', 'التقارير ومؤشرات الأداء', ['reports.view']], ['guide', 'book', 'دليل العمليات والاستخدام']] },
  { label: 'إدارة النظام', owner: true, items: [['staff', 'users', 'الموظفون والصلاحيات', null, 'join'], ['matrix', 'shield', 'مصفوفة الصلاحيات'], ['departments', 'grid', 'الإدارات والأقسام']] },
];
function navHtml() {
  const badges = { notif: notifs().filter((x) => x.isNew).length, chat: chatUnreadTotal(), join: S.isOwner ? Object.keys(S.join).filter((k) => S.join[k] && !S.staff[k]).length : 0 };
  return NAV.filter((g) => !g.owner || S.isOwner).map((g) => {
    const items = g.items.filter(([, , , p]) => !p || canAny(...p));
    if (!items.length) return '';
    return html`<div class="nav-group"><div class="label">${g.label}</div>${items.map(([k, ic, l, , b]) => html`<a href="#${k}">${icon(ic)}<span>${l}</span>${b && badges[b] ? html`<span class="badge solid">${badges[b]}</span>` : ''}</a>`)}</div>`;
  });
}
function shell() {
  return html`<div class="app">
    <aside class="sidebar" id="sidebar">
      <a class="brand" href="#home" style="text-decoration:none"><img src="${raw(LOGO)}" alt=""><div><div class="t1">منتدى الإغاثة والبناء</div><div class="t2">Coalition of Relief and Building</div></div></a>
      <nav class="nav" id="nav"></nav>
      <div class="sidebar-foot">نظام الإدارة المتكامل · وفق دليل العمليات الإدارية – نوفمبر 2026</div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" data-act="menu" aria-label="القائمة">${icon('menu')}</button>
        <div class="search">${icon('search')}<input id="gsearch" placeholder="ابحث عن مشروع، طلب، موظف، مورد…" autocomplete="off" data-input="search"><div class="search-results" id="gsearch-res" hidden></div></div>
        <div class="top-actions">
          <a class="icon-btn" href="#notifications" title="الإشعارات">${icon('bell')}<span class="dot" id="bell-dot" hidden></span></a>
          <a class="user-chip" href="#profile" style="text-decoration:none;color:inherit">${av(S.uid)}<div class="who"><b>${nm(S.uid)}</b><span>${roleName(me())} · ${deptName(myDept())}</span></div></a>
        </div>
      </header>
      <main class="content" id="page"></main>
    </div>
  </div>`;
}
function closeMenus() { document.getElementById('sidebar')?.classList.remove('open'); const r = document.getElementById('gsearch-res'); if (r) r.hidden = true; }

const PAGE_PERMS = { projects: ['projects.view'], project: ['projects.view'], requests: ['requests.view', 'requests.view_all'], logistics: ['logistics.view'], finance: ['finance.view'], media: ['media.view'], secretariat: ['secretariat.view'], chat: ['chat.use'], tasks: ['tasks.use'], directory: ['directory.view'], errors: ['errors.view'], reports: ['reports.view'] };
function routeContent(name, param) {
  if (PAGE_PERMS[name] && !canAny(...PAGE_PERMS[name])) return denied();
  if (['staff', 'matrix', 'departments'].includes(name) && !S.isOwner) return denied();
  const P = { home: pHome, notifications: pNotifs, projects: pProjects, project: pProject, requests: pRequests, request: pRequest, logistics: pLogistics, finance: pFinance, media: pMedia, secretariat: pSecretariat, chat: pChat, announcements: pAnn, tasks: pTasks, directory: pDirectory, errors: pErrors, reports: pReports, guide: pGuide, staff: pStaff, matrix: pMatrix, departments: pDepts, profile: pProfile };
  return (P[name] || pHome)(param);
}
const denied = () => html`<div class="card card-pad empty" style="padding:60px">${icon('lock')}<h3 style="color:var(--ink)">لا تملك صلاحية دخول هذه الصفحة</h3><p>هذه المساحة خاصة بإدارة أخرى. إذا كنت تحتاج الوصول، اطلب من المضيف الرئيسي منحك الصلاحية.</p><a class="btn" href="#home">العودة للوحة التحكم</a></div>`;

// ------------------------------------------------------------ workflow core
const DEFS = { project: PROJECT_STAGES, request: REQUEST_STAGES };
const COLL = { project: 'projects', request: 'requests' };
const LBL = { project: 'المشروع', request: 'الطلب' };
function actorMatch(a, e) {
  if (a === '@sector') return !!e.sector && e.sector === myDept();
  if (a === '@assignee') return !!e.assignee && e.assignee === S.uid;
  return myDept() === a;
}
function canAct(stage, e) {
  if (!stage || e.status !== 'active') return false;
  if (can('workflow.override')) return true;
  return can('workflow.act') && stage.actors.some((a) => actorMatch(a, e));
}
function canTick(ch, e) {
  if (e.status !== 'active') return false;
  if (can('workflow.override')) return true;
  return can('workflow.act') && ch.dept.some((a) => actorMatch(a, e));
}
function canSeeRequest(r) {
  if (can('requests.view_all')) return true;
  if (!can('requests.view')) return false;
  if (r.createdBy === S.uid || r.assignee === S.uid || (r.sector && r.sector === myDept())) return true;
  return myDept() === 'projects' && (r.stage >= 5 || r.status === 'closed');
}
const checksOf = (e) => Object.fromEntries(Object.entries(e.checks || {}).filter(([, v]) => v));
function gateProblem(type, e, g) {
  if (!g) return null;
  const q = vals(e.quotes); const cl = vals(e.claims);
  switch (g) {
    case 'approval_date': return e.approvalDate ? null : 'وثّق تاريخ ورود الاعتماد في «بيانات المشروع»';
    case 'has_quotes': return q.length ? null : 'أضف عرض سعر واحدًا على الأقل في تبويب اللوجستيات (يوصى بثلاثة عروض)';
    case 'admin_fee': return e.feePct != null ? null : 'على الإدارة المالية تحديد نسبة المخصص الإداري (تبويب المالية)';
    case 'selected_quote': return q.some((x) => x.selected) ? null : 'اختر العرض المعتمد (أقل سعر) من عروض الأسعار';
    case 'plan': return e.execDate && e.planBudget != null ? null : 'أكمل خطة التنفيذ: موعد التنفيذ وميزانية التنفيذ والأجور التشغيلية';
    case 'media_link': return e.mediaLink ? null : 'أدخل الرابط المعتمد للتوثيقات (تبويب الإعلام)';
    case 'claims': return cl.some((c) => c.status !== 'rejected') ? null : 'أضف مطالبات الموردين في تبويب اللوجستيات';
    case 'claims_paid': { const open = cl.filter((c) => c.status === 'approved').length; if (open) return `يوجد ${open} مطالبة معتمدة لم تُصرف بعد`; return cl.some((c) => c.status === 'paid') ? null : 'لا توجد مطالبات مصروفة'; }
    case 'large_contracts': return e.size !== 'large' || vals(e.contracts).some((c) => c.status === 'signed') ? null : 'مشروع كبير: يجب وجود عقد موقّع من المدير العام مع المورد (العملية الاستثنائية ب)';
    case 'sector': return e.sector && e.sectorDeadline ? null : 'حدد القطاع المختص ومدة الإنجاز';
    case 'assignee': if (!e.assignee || !e.assigneeDeadline) return 'حدد الموظف المكلف ومهلته'; return e.sectorDeadline && e.assigneeDeadline > e.sectorDeadline ? 'مهلة الموظف يجب أن تكون أقصر من مهلة القطاع' : null;
    case 'deliverable': return e.deliverable || vals(e.files).length ? null : 'أرفق مخرجات الطلب (ملف أو وصف للإنجاز)';
    default: return null;
  }
}
function advanceData(type, e, extraEvt = {}) {
  const defs = DEFS[type]; const cur = defs[e.stage - 1];
  if (e.stage >= defs.length) return { status: 'closed', stageStatus: 'done', closedAt: now(), events: { ...extraEvt, ...evt(cur.n, 'closed', `أُغلق ${LBL[type]} نهائيًا`) } };
  return { stage: e.stage + 1, stageStatus: 'active', stageAt: now(), events: extraEvt };
}
function nextCode(type) {
  const y = new Date().getFullYear(); const pre = (type === 'project' ? 'PRJ' : 'REQ') + '-' + y + '-';
  const used = new Set(Object.values(S[COLL[type]]).filter(Boolean).map((x) => x.code));
  let n = [...used].filter((c) => c && c.startsWith(pre)).length + 1;
  while (used.has(pre + String(n).padStart(3, '0'))) n++;
  return pre + String(n).padStart(3, '0');
}
const entity = (type, id) => { const e = S[COLL[type]][id]; return e ? { id, ...e } : null; };

// ------------------------------------------------------------ notifications (computed)
function myQueue() {
  const out = [];
  if (can('projects.view')) for (const p of vals(S.projects)) {
    if (p.status !== 'active') continue;
    const s = PROJECT_STAGES[p.stage - 1]; const ap = p.stageStatus === 'approval';
    if ((ap && can('workflow.approve')) || (!ap && canAct(s, p))) out.push({ type: 'project', ...p, stageTitle: s.title, approval: ap });
  }
  for (const r of vals(S.requests)) {
    if (r.status !== 'active' || !canSeeRequest(r)) continue;
    const s = REQUEST_STAGES[r.stage - 1];
    if (canAct(s, r)) { const dl = r.stage >= 4 ? r.assigneeDeadline : r.stage === 3 ? r.sectorDeadline : r.donorDeadline; out.push({ type: 'request', ...r, stageTitle: s.title, deadline: dl, overdue: dl && dl < todayStr() }); }
  }
  if (can('workflow.approve')) for (const p of vals(S.projects)) for (const c of vals(p.contracts)) if (c.status === 'pending') out.push({ type: 'project', ...p, id: p.id, stageTitle: 'عقد بانتظار توقيعك: ' + c.title, approval: true });
  return out;
}
function notifs() {
  const seen = (S.mine && S.mine.notifSeen) || '';
  const out = [];
  for (const q of myQueue()) out.push({ kind: q.approval ? 'approval' : 'action', title: (q.approval ? 'بانتظار اعتمادك: ' : 'بانتظار إجرائك: ') + q.stageTitle, body: `${q.code} — ${q.title}`, link: `#${q.type}-${q.id}`, at: q.stageAt || q.createdAt, isNew: (q.stageAt || q.createdAt || '') > seen });
  for (const a of vals(S.ann)) if (annVisible(a) && !(a.reads || {})[S.uid]) out.push({ kind: 'announcement', title: '📢 تعميم: ' + a.title, body: (a.body || '').slice(0, 120), link: '#announcements', at: a.at, isNew: a.at > seen });
  for (const t of vals(S.tasks)) if (t.assignee === S.uid && t.by !== S.uid && t.status !== 'done') out.push({ kind: 'action', title: `مهمة من ${nm(t.by)}: ${t.title}`, body: t.due ? 'الاستحقاق ' + fmtDate(t.due) : '', link: '#tasks', at: t.at, isNew: t.at > seen });
  for (const e of vals(S.errors)) if ((e.resp === S.uid) && e.status !== 'resolved') out.push({ kind: 'error', title: '⚠️ قُيِّد عليك خطأ: ' + e.name, body: e.etitle || '', link: e.etype === 'project' || e.etype === 'request' ? `#${e.etype}-${e.eid}` : '#errors', at: e.at, isNew: e.at > seen });
  for (const d of vals(S.chat)) for (const m of vals(d.msgs)) if (!m.del && (m.mentions || []).includes(S.uid) && m.by !== S.uid && chAccess(d.ch)) out.push({ kind: 'mention', title: `${nm(m.by)} أشار إليك في ${chName(d.ch)}`, body: (m.body || '').slice(0, 120), link: '#chat-' + d.ch, at: m.at, isNew: m.at > seen });
  return out.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
}
async function saveMine(patch) {
  const next = { ...(S.mine || {}), ...patch };
  S.mine = next;
  try { await S.db.doc(`data/users/${S.uid}/state`).set(next); } catch { /* private state is a convenience */ }
}

// ------------------------------------------------------------ PAGES
const ACTION_LABEL = { created: 'أنشأ', completed: 'أنجز المرحلة', approved: 'اعتمد', submitted: 'رفع للاعتماد', returned: 'أرجع لتصحيح خطأ', check: 'أكّد', uncheck: 'ألغى تأكيدًا', comment: 'علّق', file: 'أرفق ملفًا', closed: 'أغلق', quote: 'أضاف عرض سعر', quote_selected: 'اختار عرضًا', claim: 'أضاف مطالبة', payment: 'صرف دفعة', edit: 'حدّث بيانات', contract: 'أعدّ عقدًا', contract_signed: 'وقّع عقدًا', contract_rejected: 'رفض عقدًا' };

function pHome() {
  const q = myQueue(); const s = me();
  const myTasks = vals(S.tasks).filter((t) => t.assignee === S.uid && t.status !== 'done').sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const anns = vals(S.ann).filter(annVisible).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  const P = vals(S.projects); const active = P.filter((p) => p.status === 'active');
  const hour = new Date().getHours();
  const kpis = [];
  if (can('projects.view')) kpis.push(['layers', 'green', active.length, 'مشروع قيد التنفيذ'], ['checkCircle', 'blue', P.length - active.length, 'مشروع مغلق نهائيًا'], ['heart', 'orange', fmtNum(P.reduce((a, p) => a + (Number(p.ben) || 0), 0)), 'إجمالي المستفيدين']);
  if (canAny('requests.view', 'requests.view_all')) { const R = vals(S.requests).filter((r) => r.status === 'active' && canSeeRequest(r)); const od = R.filter((r) => r.donorDeadline && r.donorDeadline < todayStr()).length; kpis.push(['inbox', od ? 'red' : 'purple', R.length, `طلب مفتوح${od ? ` (${od} متجاوز المهلة)` : ''}`]); }
  if (!kpis.length) kpis.push(['tasks', 'green', myTasks.length, 'مهمة مفتوحة'], ['target', 'orange', q.length, 'عمل بانتظارك']);
  const events = can('projects.view') ? P.flatMap((p) => vals(p.events).map((e) => ({ ...e, link: '#project-' + p.id, code: p.code }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10) : [];
  const stalled = active.map((p) => ({ ...p, days: daysSince(p.stageAt) })).filter((p) => p.days >= 5).sort((a, b) => b.days - a.days).slice(0, 6);
  const first = S.isOwner && activeStaff().length <= 1;
  return html`
  ${first ? html`<div class="card card-pad" style="margin-bottom:16px;border-color:var(--orange)"><div class="row between"><div><b>${icon('sparkles', 'width="18" style="vertical-align:-4px;color:var(--orange)"')} الخطوة التالية: ادعُ فريق العمل</b><div class="muted">اضغط زر «مشاركة» (Share) أعلى هذه الصفحة في Claude، وأضف بريد كل موظف بصلاحية «محرر». عند فتحه للرابط يرسل طلب انضمام، فتوافق عليه وتحدد إدارته.</div></div><a class="btn accent" href="#staff">${icon('users')} الموظفون والصلاحيات</a></div></div>` : ''}
  <div class="hero"><h2>${hour < 12 ? 'صباح الخير' : 'مساء الخير'}، ${nm(S.uid)} 🌿</h2>
    <p>${roleName(s)} — ${deptName(s.dept)} · ${new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</p>
    <div class="hero-meta"><div><b>${q.length}</b>عمل بانتظار إجرائك</div><div><b>${myTasks.length}</b>مهمة مفتوحة</div>${can('workflow.approve') ? html`<div><b>${q.filter((x) => x.approval).length}</b>بانتظار اعتمادك</div>` : ''}</div></div>
  <div class="grid g4" style="margin-bottom:16px">${kpis.slice(0, 4).map(([ic, c, v, l]) => html`<div class="card stat"><div class="ic ${c}">${icon(ic)}</div><div><div class="v num">${v}</div><div class="l">${l}</div></div></div>`)}</div>
  <div class="grid g3">
    <div class="card span2"><div class="card-head"><h3>${icon('target')} بانتظار إجرائك الآن</h3><span class="badge orange">${q.length}</span></div>
      ${q.length ? q.map((x) => html`<a class="list-item" href="#${x.type}-${x.id}"><div class="ic ${x.approval ? 'orange' : x.overdue ? 'red' : 'green'}" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none">${icon(x.approval ? 'shield' : x.type === 'project' ? 'layers' : 'inbox')}</div>
        <div class="body"><b>${x.code} — ${x.title}</b><div class="meta">${x.approval ? '' : `المرحلة ${x.stage}: `}${x.stageTitle}</div></div>
        <div style="text-align:left">${prioBadge(x.priority)} ${x.deadline ? html`<span class="badge ${x.overdue ? 'red' : 'amber'}">${x.overdue ? 'متجاوز المهلة' : 'المهلة ' + fmtDate(x.deadline)}</span>` : ''}<div class="muted small">منذ ${daysSince(x.stageAt || x.createdAt)} يوم</div></div></a>`) : empty('لا يوجد عمل معلّق عليك ✨', 'checkCircle')}</div>
    <div class="card"><div class="card-head"><h3>${icon('tasks')} مهامي</h3><a href="#tasks" class="small">الكل</a></div>
      ${myTasks.length ? myTasks.slice(0, 8).map((t) => { const du = daysUntil(t.due); return html`<a class="list-item" href="#tasks"><div class="body"><b>${t.title}</b><div class="meta">${t.due ? html`<span style="${du < 0 ? 'color:var(--red)' : ''}">${du < 0 ? `متأخرة ${-du} يوم` : du === 0 ? 'اليوم' : 'خلال ' + du + ' يوم'}</span>` : ''}</div></div>${prioBadge(t.prio)}</a>`; }) : empty('لا توجد مهام مفتوحة', 'tasks')}</div>
    ${anns.length ? html`<div class="card"><div class="card-head"><h3>${icon('megaphone')} آخر التعميمات</h3><a href="#announcements" class="small">الكل</a></div>
      ${anns.map((a) => html`<a class="list-item" href="#announcements"><div class="body"><b>${a.title}</b><div class="meta">${ago(a.at)}</div></div>${!(a.reads || {})[S.uid] && a.ack ? html`<span class="badge red">يتطلب تأكيدك</span>` : ''}</a>`)}</div>` : ''}
    ${can('projects.view') ? html`<div class="card ${anns.length ? '' : 'span2'}"><div class="card-head"><h3>${icon('chart')} المشاريع النشطة حسب المرحلة</h3><a href="#projects" class="small">المشاريع</a></div>
      <div class="card-body">${bars(PROJECT_STAGES.map((st) => ({ label: `${st.n}. ${st.title}`, value: active.filter((p) => p.stage === st.n).length })).filter((x) => x.value))}</div></div>` : ''}
    ${stalled.length ? html`<div class="card"><div class="card-head"><h3>${icon('clock')} مشاريع متوقفة في مرحلتها</h3></div>${stalled.map((p) => html`<a class="list-item" href="#project-${p.id}"><div class="body"><b>${p.code} — ${p.title}</b><div class="meta">م${p.stage}: ${PROJECT_STAGES[p.stage - 1].title}</div></div><span class="badge red">${p.days} يوم</span></a>`)}</div>` : ''}
    ${events.length ? html`<div class="card span2"><div class="card-head"><h3>${icon('history')} آخر الحركات على المشاريع</h3></div>
      ${events.map((e) => html`<a class="list-item" href="${e.link}"><div class="body"><b>${nm(e.by)} <span class="muted" style="font-weight:400">${ACTION_LABEL[e.action] || e.action}</span> · ${e.code}</b><div class="meta">${e.note || ''}</div></div><span class="muted small nowrap">${ago(e.at)}</span></a>`)}</div>` : ''}
  </div>`;
}

function pNotifs() {
  const list = notifs();
  const KI = { action: ['target', 'orange'], approval: ['shield', 'orange'], error: ['alert', 'red'], mention: ['chat', 'purple'], announcement: ['megaphone', 'green'] };
  return html`${pageHead('الإشعارات', 'بديل الإيميلات: كل ما يخصك يظهر هنا لحظيًا', html`<button class="btn" data-act="notifSeen">${icon('check')} تعليم الكل كمقروء</button>`, 'bell')}
    <div class="card">${list.length ? list.map((n) => { const [ic, c] = KI[n.kind] || ['bell', 'blue']; return html`<a class="list-item" href="${n.link}" style="${n.isNew ? 'background:var(--green-50)' : ''}"><div class="ic ${c}" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none">${icon(ic)}</div><div class="body"><b>${n.title}</b>${n.body ? html`<div class="meta">${n.body}</div>` : ''}</div><span class="muted small nowrap">${ago(n.at)}</span></a>`; }) : empty('لا توجد إشعارات', 'bell')}</div>`;
}

// ---------- projects
function pipeline(cur, total, closed) { return html`<div class="pipeline">${Array.from({ length: total }, (_, i) => html`<i class="${closed || i + 1 < cur ? 'done' : i + 1 === cur ? 'cur' : ''}"></i>`)}</div>`; }
function pProjects() {
  const f = UI.prj; const rows = vals(S.projects).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const mine = (p) => { const s = PROJECT_STAGES[p.stage - 1]; return p.status === 'active' && ((p.stageStatus === 'approval' && can('workflow.approve')) || (p.stageStatus !== 'approval' && canAct(s, p))); };
  const list = rows.filter((p) => (f.f === 'all' || (f.f === 'mine' ? mine(p) : p.status === f.f)) && (!f.q || `${p.title} ${p.code} ${p.donor || ''} ${p.location || ''}`.includes(f.q)));
  const errCount = (p) => vals(S.errors).filter((e) => e.etype === 'project' && e.eid === p.id).length;
  const cols = [[1, 3, 'الاعتماد والتسعير'], [4, 6, 'الاعتماد والتخطيط'], [7, 10, 'التنفيذ والتوثيق'], [11, 13, 'المستحقات والإخلاءات'], [14, 15, 'الإقفال والإغلاق']];
  return html`${pageHead('المشاريع', 'دورة حياة المشروع الكاملة في 15 مرحلة — من وصول اعتماد المانح حتى الإغلاق النهائي', can('projects.create') ? html`<button class="btn primary" data-act="newProject">${icon('plus')} تسجيل مشروع معتمد</button>` : '', 'layers')}
    <div class="card"><div class="card-head" style="flex-wrap:wrap"><div class="seg">
      ${[['active', `النشطة (${rows.filter((p) => p.status === 'active').length})`], ['mine', `بانتظاري (${rows.filter(mine).length})`], ['closed', 'المغلقة'], ['all', 'الكل']].map(([k, l]) => html`<button data-act="prjFilter" data-v="${k}" class="${f.f === k ? 'active' : ''}">${l}</button>`)}</div>
      <div class="row"><input class="input" style="width:220px" id="prj-q" placeholder="بحث في المشاريع…" data-input="prjQ" value="${f.q}">
      <div class="seg"><button data-act="prjView" data-v="list" class="${f.view === 'list' ? 'active' : ''}">قائمة</button><button data-act="prjView" data-v="board" class="${f.view === 'board' ? 'active' : ''}">لوحة المراحل</button></div></div></div>
    ${!list.length ? empty(rows.length ? 'لا توجد مشاريع مطابقة' : 'لا توجد مشاريع بعد. ' + (can('projects.create') ? 'ابدأ بتسجيل أول مشروع معتمد من الجهة المانحة.' : ''), 'layers')
    : f.view === 'list' ? html`<div class="table-wrap"><table class="t"><thead><tr><th>المشروع</th><th>الجهة المانحة</th><th>المرحلة الحالية</th><th>المنحة</th><th>المستفيدون</th><th>في المرحلة منذ</th></tr></thead><tbody>
      ${list.map((p) => html`<tr class="clickable" data-act="go" data-href="#project-${p.id}"><td class="title-cell"><b>${p.title} ${prioBadge(p.priority)} ${p.size === 'large' ? html`<span class="badge blue">كبير</span>` : ''}</b><span class="num">${p.code}</span> · ${p.location || ''}</td><td>${p.donor || '—'}</td>
        <td style="min-width:230px">${p.status === 'closed' ? html`<span class="badge green">${icon('check')} مغلق نهائيًا</span>` : html`<div class="row" style="gap:6px"><b class="small">م${p.stage}/15</b>${p.stageStatus === 'approval' ? html`<span class="badge orange">بانتظار الاعتماد</span>` : ''}${mine(p) ? html`<span class="badge solid">دورك</span>` : ''}${errCount(p) ? html`<span class="badge red">${errCount(p)} خطأ</span>` : ''}</div><div class="small muted">${PROJECT_STAGES[p.stage - 1].title}</div>${pipeline(p.stage, 15)}`}</td>
        <td>${money(p.grant, p.currency)}</td><td class="num">${fmtNum(p.ben)}</td><td class="nowrap">${p.status === 'closed' ? '—' : html`<span class="${daysSince(p.stageAt) > 5 ? 'badge red' : 'muted'}">${daysSince(p.stageAt)} يوم</span>`}</td></tr>`)}
      </tbody></table></div>`
    : html`<div class="card-body"><div class="kanban" style="grid-template-columns:repeat(5,minmax(210px,1fr))">${cols.map(([a, b, t]) => { const it = list.filter((p) => p.status === 'active' && p.stage >= a && p.stage <= b); return html`<div class="kcol"><h4><span>${t} <span class="muted">(م${a}–${b})</span></span><span class="badge">${it.length}</span></h4>${it.map((p) => html`<div class="kcard prio-${p.priority}" data-act="go" data-href="#project-${p.id}" style="cursor:pointer"><b>${p.title}</b><div class="muted small">${p.code} · م${p.stage}</div><div class="small">${PROJECT_STAGES[p.stage - 1].title}</div>${mine(p) ? html`<span class="badge solid">دورك</span>` : ''}</div>`)}</div>`; })}</div></div>`}
    </div>`;
}

function stagesHtml(type, e) {
  const defs = DEFS[type]; const ck = checksOf(e); const isClosed = e.status === 'closed';
  return html`<div class="stages">${defs.map((s) => {
    const st = isClosed || s.n < e.stage ? 'done' : s.n === e.stage ? (e.stageStatus === 'approval' ? 'approval' : 'current') : 'future';
    const open = UI.open[type + e.id + s.n] ?? (s.n === e.stage);
    const gp = st === 'current' ? gateProblem(type, e, s.gate) : null;
    return html`<div class="stage ${st}"><div class="n">${st === 'done' ? icon('check', 'width="20"') : s.n}</div><div class="box">
      <div class="box-head" data-act="toggleStage" data-k="${type + e.id + s.n}" data-open="${open ? 1 : 0}"><h4>${s.title}</h4>${st === 'done' ? html`<span class="badge green">منجزة</span>` : st === 'approval' ? html`<span class="badge orange">بانتظار اعتماد المدير العام</span>` : st === 'current' ? html`<span class="badge orange">المرحلة الحالية</span>` : html`<span class="badge">لاحقة</span>`}</div>
      ${open ? html`<div class="box-body"><div class="kv"><div>الجهة المنفذة</div><div>${s.from}</div><div>الجهة المستلمة</div><div>${s.to}</div><div>الوسيلة</div><div>${s.via}</div><div>الإجراء</div><div>${s.action}</div><div>المخرج / التأكيد المطلوب</div><div><b>${s.output}</b></div></div>
        ${s.checks.length ? html`<div class="checklist">${s.checks.map((c) => { const d = ck[s.n + ':' + c.id]; const tick = st === 'current' && canTick(c, e); return html`<label class="check ${d ? 'done' : ''} ${tick ? '' : 'locked'}"><input type="checkbox" data-change="check" data-type="${type}" data-id="${e.id}" data-c="${s.n + ':' + c.id}" ${d ? raw('checked') : ''} ${tick ? '' : raw('disabled')}>
          <span>${c.label}${d ? html`<br><span class="muted small">✔ ${nm(d.by)} · ${fmtDateTime(d.at)}</span>` : !tick && st === 'current' ? html`<br><span class="muted small">يؤكده المختص في الإدارة المعنية</span>` : ''}</span></label>`; })}</div>` : ''}
        ${gp ? html`<div class="gate" style="margin-top:10px">${icon('alert')}<span><b>متطلب قبل الإنجاز:</b> ${gp}</span></div>` : ''}
        ${st === 'current' && canAct(s, e) ? html`<div class="row" style="margin-top:12px"><button class="btn primary" data-act="complete" data-type="${type}" data-id="${e.id}">${icon('checkCircle')} ${s.approval ? 'رفع للمدير العام للاعتماد' : s.n === defs.length ? 'إنجاز وإغلاق نهائي' : 'إنجاز المرحلة والانتقال للتالية'}</button></div>` : ''}
        ${st === 'approval' && can('workflow.approve') ? html`<div class="row" style="margin-top:12px"><button class="btn primary" data-act="approve" data-type="${type}" data-id="${e.id}">${icon('shield')} اعتماد</button><button class="btn danger" data-act="return" data-type="${type}" data-id="${e.id}">${icon('undo')} رفض وإرجاع</button></div>` : ''}
      </div>` : ''}</div></div>`;
  })}</div>`;
}
function timelineHtml(e, limit) {
  const evs = vals(e.events).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit || 1e9);
  if (!evs.length) return empty('لا توجد حركات بعد', 'history');
  return html`<div class="timeline">${evs.map((x) => html`<div class="tl ${x.action}"><div class="row between"><b>${nm(x.by)} <span class="badge ${x.action === 'returned' ? 'red' : ['approved', 'closed'].includes(x.action) ? 'green' : x.action === 'comment' ? 'blue' : ''}">${ACTION_LABEL[x.action] || x.action}${x.stage ? ' · م' + x.stage : ''}</span></b><span class="when" title="${fmtDateTime(x.at)}">${ago(x.at)}</span></div>${x.note ? html`<div class="${x.action === 'comment' ? '' : 'muted'}" style="white-space:pre-wrap">${x.note}</div>` : ''}<div class="muted small">${deptName((S.staff[x.by] || {}).dept)}</div></div>`)}</div>`;
}
function errorsTable(list) {
  if (!list.length) return empty('لا توجد أخطاء مقيدة 👍', 'checkCircle');
  return html`<div class="table-wrap"><table class="t"><thead><tr><th>التاريخ</th><th>اسم الخطأ</th><th>المرحلة</th><th>الإدارة</th><th>المسؤول</th><th>قيّده</th><th>الحالة</th></tr></thead><tbody>
    ${list.map((x) => html`<tr><td class="nowrap">${fmtDate(x.at)}</td><td><b>${x.name}</b>${x.desc ? html`<div class="muted small">${x.desc}</div>` : ''}</td><td>${x.stage ? 'م' + x.stage : '—'}</td><td>${deptName(x.dept)}</td><td>${x.resp ? nm(x.resp) : '—'}</td><td>${nm(x.by)}</td><td>${x.status === 'resolved' ? html`<span class="badge green">مُعالج</span>` : html`<span class="badge red">مفتوح</span>`}</td></tr>`)}</tbody></table></div>`;
}
function filesHtml(type, e) {
  const files = vals(e.files).sort((a, b) => b.at.localeCompare(a.at));
  return html`${S.assets && e.status === 'active' ? html`<div class="card-body row" style="border-bottom:1px solid var(--line-2)"><select class="input" style="width:200px" id="file-cat">${(type === 'project' ? ['الاعتماد الرسمي', 'عروض الأسعار', 'العقود', 'خطة التنفيذ', 'كشوف المستفيدين', 'سندات الدفع', 'الفواتير', 'سندات الاستلام', 'التوثيقات', 'الإخلاءات', 'أخرى'] : ['مخرجات الطلب', 'نص الطلب', 'أخرى']).map((c) => html`<option>${c}</option>`)}</select>
    <label class="btn sm primary" style="cursor:pointer">${icon('upload')} رفع ملف<input type="file" hidden data-change="upload" data-type="${type}" data-id="${e.id}"></label><span class="muted small">حتى 20 ميجابايت</span></div>` : !S.assets ? html`<div class="card-body muted small">رفع الملفات غير متاح لصلاحيتك الحالية على الصفحة.</div>` : ''}
    ${files.length ? files.map((f) => html`<div class="list-item"><div class="ic green" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;flex:none">${icon('file')}</div><div class="body"><b>${f.name}</b><div class="meta">${f.cat} · ${fmtSize(f.size || 0)} · ${nm(f.by)} · ${ago(f.at)}</div></div><a class="btn sm" href="${f.url}" target="_blank" rel="noopener noreferrer">${icon('eye')} فتح</a></div>`) : empty('لا توجد مرفقات', 'paperclip')}`;
}

const CLAIM = { submitted: ['مقدمة – بانتظار الإفادات والاعتماد', 'amber'], approved: ['معتمدة – بانتظار الصرف', 'blue'], paid: ['مصروفة', 'green'], rejected: ['مرفوضة', 'red'] };
const CONTRACT = { pending: ['بانتظار توقيع المدير العام', 'amber'], signed: ['موقّع', 'green'], rejected: ['مرفوض', 'red'] };
const MEDIA = { planned: 'مخطط', covered: 'تمت التغطية', uploaded: 'تم الرفع', reviewed: 'تم الرفع والمراجعة', published: 'منشور' };

function pProject(id) {
  const p = entity('project', id);
  if (!p) return html`<div class="card card-pad empty">${icon('alert')}المشروع غير موجود أو حُذف. <a href="#projects">العودة للمشاريع</a></div>`;
  const tab = UI.tabs['p' + id] || 'workflow'; const closed = p.status === 'closed'; const cur = PROJECT_STAGES[p.stage - 1];
  const errs = vals(S.errors).filter((x) => x.etype === 'project' && x.eid === id).sort((a, b) => b.at.localeCompare(a.at));
  const showL = canAny('logistics.view', 'finance.view'); const showF = can('finance.view'); const showM = can('media.view');
  const claimsOpen = vals(p.claims).filter((c) => c.status === 'submitted').length;
  return html`<div class="page-head"><div><a href="#projects" class="small">المشاريع</a><h1 style="margin-top:4px">${p.title} ${prioBadge(p.priority)}</h1><p><span class="num">${p.code}</span> · ${p.donor || 'جهة مانحة غير محددة'} · ${p.location || ''} · ${p.size === 'large' ? 'مشروع كبير' : 'مشروع صغير'}</p></div>
    <div class="actions">${!closed && canAny('workflow.return', 'workflow.approve', 'workflow.override') ? html`<button class="btn danger" data-act="return" data-type="project" data-id="${id}">${icon('undo')} إرجاع لتصحيح خطأ</button>` : ''}${can('projects.delete') ? html`<button class="btn ghost" data-act="delEntity" data-type="project" data-id="${id}" title="حذف">${icon('trash')}</button>` : ''}</div></div>
    <div class="card card-pad" style="margin-bottom:16px"><div class="row between"><div>${closed ? html`<span class="badge green" style="font-size:14px">${icon('checkCircle')} أُغلق المشروع نهائيًا ${fmtDate(p.closedAt)}</span>` : html`<b>المرحلة ${p.stage} من 15:</b> ${cur.title} ${p.stageStatus === 'approval' ? html`<span class="badge orange">بانتظار اعتماد المدير العام</span>` : ''}`}</div>
      ${!closed && p.stageStatus === 'active' && canAct(cur, p) ? html`<span class="badge solid">هذه المرحلة من مسؤوليتك</span>` : ''}</div>
      ${pipeline(p.stage, 15, closed)}
      <div class="grid g4" style="margin-top:12px"><div><div class="muted small">مبلغ المنحة</div><b>${money(p.grant, p.currency)}</b></div>
        ${showF ? html`<div><div class="muted small">المعتمد للتنفيذ (بعد المخصص)</div><b>${money(p.net, p.currency)}</b></div>` : html`<div><div class="muted small">المستفيدون</div><b class="num">${fmtNum(p.ben)}</b></div>`}
        <div><div class="muted small">موعد التنفيذ</div><b>${fmtDate(p.execDate)}</b></div><div><div class="muted small">تاريخ ورود الاعتماد</div><b>${fmtDate(p.approvalDate)}</b></div></div></div>
    ${tabs([{ id: 'workflow', label: 'سير العمل', icon: 'layers' }, { id: 'info', label: 'بيانات المشروع والخطة', icon: 'file' }, { id: 'logistics', label: 'اللوجستيات', icon: 'truck', show: showL, count: claimsOpen }, { id: 'finance', label: 'المالية', icon: 'wallet', show: showF }, { id: 'media', label: 'الإعلام والتوثيق', icon: 'camera', show: showM }, { id: 'files', label: `المرفقات (${vals(p.files).length})`, icon: 'paperclip' }, { id: 'errors', label: 'الأخطاء', icon: 'flag', count: errs.filter((x) => x.status !== 'resolved').length }, { id: 'log', label: 'السجل الكامل', icon: 'history' }], tab, 'data-ptab')}
    ${tab === 'workflow' ? html`<div class="grid g3"><div class="span2">${stagesHtml('project', p)}</div><div class="card"><div class="card-head"><h3>${icon('history')} آخر الحركات</h3><button class="btn sm" data-act="comment" data-type="project" data-id="${id}">${icon('plus')} ملاحظة</button></div><div class="card-body">${timelineHtml(p, 12)}</div></div></div>` : ''}
    ${tab === 'info' ? projectInfo(p) : ''}
    ${tab === 'logistics' && showL ? projectLogistics(p) : ''}
    ${tab === 'finance' && showF ? projectFinance(p) : ''}
    ${tab === 'media' && showM ? projectMedia(p) : ''}
    ${tab === 'files' ? html`<div class="card"><div class="card-head"><h3>${icon('paperclip')} مرفقات المشروع</h3></div>${filesHtml('project', p)}</div>` : ''}
    ${tab === 'errors' ? html`<div class="card">${errorsTable(errs)}</div>` : ''}
    ${tab === 'log' ? html`<div class="card"><div class="card-head"><h3>${icon('history')} السجل الكامل</h3><button class="btn sm" data-act="comment" data-type="project" data-id="${id}">${icon('plus')} ملاحظة</button></div><div class="card-body">${timelineHtml(p)}</div></div>` : ''}`;
}
function projectInfo(p) {
  const ed = can('projects.edit') && p.status === 'active';
  return html`<div class="grid g2"><div class="card"><div class="card-head"><h3>${icon('file')} البيانات الأساسية</h3>${ed ? html`<button class="btn sm" data-act="editProject" data-id="${p.id}">${icon('edit')} تعديل</button>` : ''}</div><div class="card-body"><div class="kv">
    <div>الرمز</div><div class="num">${p.code}</div><div>الجهة المانحة</div><div>${p.donor || '—'}</div><div>القطاع</div><div>${p.sector || '—'}</div><div>الموقع</div><div>${p.location || '—'}</div>
    <div>الحجم</div><div>${p.size === 'large' ? 'كبير (عقود موردين)' : 'صغير (توريد مباشر)'}</div><div>المنحة</div><div>${money(p.grant, p.currency)}</div><div>المستفيدون</div><div class="num">${fmtNum(p.ben)}</div>
    <div>ورود الاعتماد</div><div>${fmtDate(p.approvalDate)}</div><div>الانتهاء المتوقع</div><div>${fmtDate(p.endDate)}</div><div>الوصف</div><div style="white-space:pre-wrap">${p.desc || '—'}</div></div></div></div>
    <div class="card"><div class="card-head"><h3>${icon('target')} خطة التنفيذ (العملية 6)</h3>${ed ? html`<button class="btn sm" data-act="editPlan" data-id="${p.id}">${icon('edit')} ${p.execDate ? 'تعديل' : 'إعداد'} الخطة</button>` : ''}</div><div class="card-body"><div class="kv">
      <div>موعد التنفيذ</div><div>${fmtDate(p.execDate)}</div><div>ميزانية ومصاريف التنفيذ</div><div>${money(p.planBudget, p.currency)}</div><div>الأجور التشغيلية</div><div>${money(p.planWages, p.currency)}</div><div>تفاصيل الخطة</div><div style="white-space:pre-wrap">${p.planNotes || '—'}</div></div></div></div></div>`;
}
function claimsTable(p) {
  const cl = vals(p.claims).sort((a, b) => b.at.localeCompare(a.at));
  if (!cl.length) return empty('لا توجد مطالبات بعد', 'wallet');
  const L = can('logistics.manage'); const F = can('finance.manage');
  return html`<div class="table-wrap"><table class="t"><thead><tr><th>المورد</th><th>المبلغ</th><th>إفادة اللوجستيات</th><th>إفادة المالية</th><th>الحالة</th><th>الصرف</th></tr></thead><tbody>
    ${cl.map((c) => html`<tr><td><b>${(S.suppliers[c.supplier] || {}).name || '—'}</b><div class="muted small">${c.desc || ''}</div></td><td>${money(c.amount, p.currency)}</td>
      <td>${c.status === 'submitted' && L ? html`<label class="check"><input type="checkbox" data-change="claimOk" data-id="${p.id}" data-c="${c.id}" data-f="lOk" ${c.lOk ? raw('checked') : ''}> مطابقة</label>` : c.lOk ? html`<span class="yes">✔</span>` : '—'}</td>
      <td>${c.status === 'submitted' && F ? html`<label class="check"><input type="checkbox" data-change="claimOk" data-id="${p.id}" data-c="${c.id}" data-f="fOk" ${c.fOk ? raw('checked') : ''}> مراجعة</label>` : c.fOk ? html`<span class="yes">✔</span>` : '—'}</td>
      <td><span class="badge ${CLAIM[c.status][1]}">${CLAIM[c.status][0]}</span></td>
      <td class="nowrap">${c.status === 'approved' && F ? html`<button class="btn sm primary" data-act="pay" data-id="${p.id}" data-c="${c.id}">${icon('wallet')} صرف بشيك</button>` : c.status === 'paid' ? html`<span class="small">شيك ${c.cheque} — ${c.bank}<br>${fmtDate(c.paidAt)}</span>` : ''}</td></tr>`)}</tbody></table></div>`;
}
function projectLogistics(p) {
  const q = vals(p.quotes).sort((a, b) => a.amount - b.amount); const low = q.length ? q[0].amount : null; const L = can('logistics.manage') && p.status === 'active';
  const ct = vals(p.contracts);
  return html`<div class="stack">
    <div class="card"><div class="card-head"><h3>${icon('truck')} عروض الأسعار (العمليتان 2 و 4)</h3>${L ? html`<button class="btn sm primary" data-act="addQuote" data-id="${p.id}">${icon('plus')} إضافة عرض سعر</button>` : ''}</div>
      ${q.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>المورد</th><th>المبلغ</th><th>مدة التوريد</th><th>التفاصيل</th><th></th></tr></thead><tbody>${q.map((x) => html`<tr><td><b>${(S.suppliers[x.supplier] || {}).name || '—'}</b> ${x.amount === low ? html`<span class="badge green">الأقل سعرًا</span>` : ''}</td><td>${money(x.amount, p.currency)}</td><td>${x.days ? x.days + ' يوم' : '—'}</td><td class="small">${x.details || ''}${x.reason ? html`<div class="muted">مبرر: ${x.reason}</div>` : ''}</td>
        <td class="nowrap">${x.selected ? html`<span class="badge solid">العرض المعتمد</span>` : L && p.stage <= 4 ? html`<button class="btn sm" data-act="selectQuote" data-id="${p.id}" data-c="${x.id}">اعتماد هذا العرض</button> <button class="btn sm ghost" data-act="delQuote" data-id="${p.id}" data-c="${x.id}">${icon('trash')}</button>` : ''}</td></tr>`)}</tbody></table></div>` : empty('لم تُضف عروض أسعار بعد. يوصى بثلاثة عروض على الأقل.', 'truck')}</div>
    ${p.size === 'large' || ct.length ? html`<div class="card"><div class="card-head"><h3>${icon('file')} عقود الموردين — العملية الاستثنائية (ب)</h3>${L ? html`<button class="btn sm" data-act="addContract" data-id="${p.id}">${icon('plus')} إعداد عقد</button>` : ''}</div>
      ${ct.length ? ct.map((c) => html`<div class="list-item"><div class="body"><b>${c.title}</b><div class="meta">${(S.suppliers[c.supplier] || {}).name || ''} · ${money(c.amount, p.currency)} ${c.signedBy ? '· ' + nm(c.signedBy) : ''}</div></div><span class="badge ${CONTRACT[c.status][1]}">${CONTRACT[c.status][0]}</span>
        ${c.status === 'pending' && can('workflow.approve') ? html`<button class="btn sm primary" data-act="signContract" data-id="${p.id}" data-c="${c.id}" data-v="signed">توقيع</button><button class="btn sm danger" data-act="signContract" data-id="${p.id}" data-c="${c.id}" data-v="rejected">رفض</button>` : ''}</div>`) : empty('تتفق اللوجستيات مع الموردين على الكميات والأسعار ومواعيد التوريد، ويُعد العقد ويُرفع للمدير العام لتوقيعه.', 'file')}</div>` : ''}
    <div class="card"><div class="card-head"><h3>${icon('wallet')} مطالبات الموردين (العمليتان 11 و 12)</h3>${L ? html`<button class="btn sm" data-act="addClaim" data-id="${p.id}">${icon('plus')} تقديم مطالبة</button>` : ''}</div>${claimsTable(p)}</div></div>`;
}
function projectFinance(p) {
  const F = can('finance.manage') && p.status === 'active'; const tx = vals(p.txs).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const spent = tx.filter((x) => x.type === 'expense').reduce((a, x) => a + Number(x.amount || 0), 0); const pct = p.net ? Math.min(100, Math.round((spent / p.net) * 100)) : 0;
  return html`<div class="grid g3"><div class="card"><div class="card-head"><h3>${icon('wallet')} المخصص الإداري (العملية 3)</h3>${F ? html`<button class="btn sm" data-act="setFee" data-id="${p.id}">${icon('edit')} تحديد</button>` : ''}</div><div class="card-body stack">
    <div class="row between"><span class="muted">مبلغ المنحة</span><b>${money(p.grant, p.currency)}</b></div><div class="row between"><span class="muted">نسبة المخصص الإداري</span><b class="num">${p.feePct != null ? p.feePct + '%' : '—'}</b></div>
    <div class="row between"><span class="muted">قيمة المخصص</span><b>${money(p.fee, p.currency)}</b></div><div class="row between" style="border-top:1px solid var(--line);padding-top:10px"><span>المعتمد للتنفيذ</span><b style="color:var(--green-700);font-size:17px">${money(p.net, p.currency)}</b></div>
    ${p.net ? html`<div><div class="row between small"><span>المصروف من المعتمد</span><span class="num">${pct}%</span></div><div class="progress"><div style="width:${raw(String(pct))}%"></div></div></div>` : ''}</div></div>
    <div class="card span2"><div class="card-head"><h3>${icon('database')} الحركات المالية للمشروع</h3>${F ? html`<button class="btn sm primary" data-act="addTx" data-id="${p.id}">${icon('plus')} حركة مالية</button>` : ''}</div>
      ${tx.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>المرجع</th><th>المبلغ</th></tr></thead><tbody>${tx.map((x) => html`<tr><td class="nowrap">${fmtDate(x.date)}</td><td>${x.type === 'income' ? html`<span class="badge green">وارد</span>` : html`<span class="badge orange">منصرف</span>`}</td><td>${x.desc || ''}</td><td class="small">${x.ref || ''}</td><td>${money(x.amount, p.currency)}</td></tr>`)}</tbody></table></div>` : empty('لا توجد حركات مالية', 'database')}</div>
    <div class="card" style="grid-column:1/-1"><div class="card-head"><h3>${icon('wallet')} المطالبات والصرف بالشيكات</h3></div>${claimsTable(p)}</div></div>`;
}
function projectMedia(p) {
  const M = can('media.manage') && p.status === 'active'; const items = vals(p.media);
  return html`<div class="grid g3"><div class="card"><div class="card-head"><h3>${icon('link')} الرابط المعتمد للتوثيقات</h3>${M ? html`<button class="btn sm" data-act="mediaLink" data-id="${p.id}">${icon('edit')} ${p.mediaLink ? 'تعديل' : 'إضافة'}</button>` : ''}</div>
    <div class="card-body">${p.mediaLink ? html`<a href="${p.mediaLink}" target="_blank" rel="noopener noreferrer" class="ltr" style="word-break:break-all">${p.mediaLink}</a>` : html`<p class="muted">ترفع إدارة الإعلام التوثيقات عبر الرابط ثم تؤكد «تم الرفع والمراجعة» في المرحلة 8.</p>`}</div></div>
    <div class="card span2"><div class="card-head"><h3>${icon('camera')} خطة التغطية الإعلامية</h3>${M ? html`<button class="btn sm primary" data-act="addMedia" data-id="${p.id}">${icon('plus')} تغطية</button>` : ''}</div>
      ${items.length ? items.map((m) => html`<div class="list-item"><div class="body"><b>${m.title}</b><div class="meta">${fmtDate(m.date)} · ${m.reporter ? nm(m.reporter) : 'لم يُحدد الإعلامي'}</div></div>${M ? html`<select class="input" style="width:175px;padding:4px 8px" data-change="mediaStatus" data-id="${p.id}" data-c="${m.id}">${Object.entries(MEDIA).map(([k, l]) => html`<option value="${k}" ${k === m.status ? raw('selected') : ''}>${l}</option>`)}</select>` : html`<span class="badge ${['reviewed', 'published'].includes(m.status) ? 'green' : 'amber'}">${MEDIA[m.status]}</span>`}</div>`) : empty('لا توجد تغطيات مخططة', 'camera')}</div></div>`;
}

// ---------- requests
function pRequests() {
  const f = UI.req.f;
  const rows = vals(S.requests).filter(canSeeRequest).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const mine = (r) => r.status === 'active' && canAct(REQUEST_STAGES[r.stage - 1], r);
  const list = rows.filter((r) => f === 'all' || (f === 'mine' ? mine(r) : f === 'overdue' ? r.status === 'active' && r.donorDeadline && r.donorDeadline < todayStr() : r.status === f));
  const dl = (r) => { if (r.status === 'closed') return html`<span class="badge green">منجز</span>`; if (!r.donorDeadline) return '—'; const n = daysUntil(r.donorDeadline); return html`<span class="badge ${n < 0 ? 'red' : n <= 2 ? 'amber' : 'green'}">${n < 0 ? `متأخر ${-n} يوم` : n === 0 ? 'اليوم' : `باقي ${n} يوم`}</span><div class="muted small">${fmtDate(r.donorDeadline)}</div>`; };
  return html`${pageHead('الطلبات', 'طلبات الجهة المانحة: الاستلام ← القطاع المختص ← الموظف المكلف ← مراجعة المشاريع ← المراجعة النهائية والرفع', can('requests.create') ? html`<button class="btn primary" data-act="newRequest">${icon('plus')} تسجيل طلب وارد</button>` : '', 'inbox')}
    <div class="card"><div class="card-head"><div class="seg">${[['active', 'المفتوحة'], ['mine', `بانتظاري (${rows.filter(mine).length})`], ['overdue', 'المتأخرة'], ['closed', 'المنجزة'], ['all', 'الكل']].map(([k, l]) => html`<button data-act="reqFilter" data-v="${k}" class="${f === k ? 'active' : ''}">${l}</button>`)}</div></div>
    ${list.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>الطلب</th><th>المرحلة</th><th>القطاع المختص</th><th>المكلف</th><th>مهلة المانح</th></tr></thead><tbody>
      ${list.map((r) => html`<tr class="clickable" data-act="go" data-href="#request-${r.id}"><td class="title-cell"><b>${r.title} ${prioBadge(r.priority)}</b><span class="num">${r.code}</span> · ${r.donor || ''}</td>
        <td style="min-width:210px">${r.status === 'closed' ? html`<span class="badge green">مُسلّم للمانح</span>` : html`<b class="small">م${r.stage}/6</b> ${mine(r) ? html`<span class="badge solid">دورك</span>` : ''}<div class="small muted">${REQUEST_STAGES[r.stage - 1].title}</div>${pipeline(r.stage, 6)}`}</td>
        <td>${r.sector ? deptName(r.sector) : html`<span class="muted">لم يُحدد</span>`}${r.sectorDeadline ? html`<div class="muted small">حتى ${fmtDate(r.sectorDeadline)}</div>` : ''}</td>
        <td>${r.assignee ? nm(r.assignee) : html`<span class="muted">—</span>`}${r.assigneeDeadline ? html`<div class="muted small">حتى ${fmtDate(r.assigneeDeadline)}</div>` : ''}</td><td>${dl(r)}</td></tr>`)}</tbody></table></div>` : empty(rows.length ? 'لا توجد طلبات هنا' : 'لا توجد طلبات بعد', 'inbox')}</div>`;
}
function pRequest(id) {
  const r = entity('request', id);
  if (!r || !canSeeRequest(r)) return html`<div class="card card-pad empty">${icon('alert')}الطلب غير موجود أو لا تملك صلاحية عرضه. <a href="#requests">الطلبات</a></div>`;
  const closed = r.status === 'closed'; const cur = REQUEST_STAGES[r.stage - 1]; const act = canAct(cur, r); const tab = UI.tabs['r' + id] || 'workflow';
  const errs = vals(S.errors).filter((x) => x.etype === 'request' && x.eid === id);
  const dl = (label, d) => { if (!d) return html`<div><div class="muted small">${label}</div><b>—</b></div>`; const n = daysUntil(d); return html`<div><div class="muted small">${label}</div><b>${fmtDate(d)}</b> ${!closed ? html`<span class="badge ${n < 0 ? 'red' : n <= 1 ? 'amber' : 'green'}">${n < 0 ? `متأخر ${-n}` : `باقي ${n}`} يوم</span>` : ''}</div>`; };
  const pr = r.projectId && S.projects[r.projectId];
  return html`<div class="page-head"><div><a href="#requests" class="small">الطلبات</a><h1 style="margin-top:4px">${r.title} ${prioBadge(r.priority)}</h1><p><span class="num">${r.code}</span> · ${r.donor || ''} ${pr ? html`· مشروع: <a href="#project-${r.projectId}">${pr.code} — ${pr.title}</a>` : ''}</p></div>
    <div class="actions">${!closed && canAny('workflow.return', 'workflow.approve', 'workflow.override') ? html`<button class="btn danger" data-act="return" data-type="request" data-id="${id}">${icon('undo')} إرجاع لتصحيح خطأ</button>` : ''}${S.isOwner ? html`<button class="btn ghost" data-act="delEntity" data-type="request" data-id="${id}">${icon('trash')}</button>` : ''}</div></div>
    <div class="card card-pad" style="margin-bottom:16px"><div class="row between"><div>${closed ? html`<span class="badge green" style="font-size:14px">${icon('checkCircle')} أُنجز الطلب وسُلّم للجهة المانحة</span>` : html`<b>المرحلة ${r.stage} من 6:</b> ${cur.title}`}</div>${act && !closed ? html`<span class="badge solid">هذه المرحلة من مسؤوليتك</span>` : ''}</div>
      ${pipeline(r.stage, 6, closed)}
      <div class="grid g4" style="margin-top:12px">${dl('مهلة الجهة المانحة', r.donorDeadline)}<div><div class="muted small">القطاع المختص</div><b>${r.sector ? deptName(r.sector) : '—'}</b>${r.sectorDeadline ? html`<div class="small">حتى ${fmtDate(r.sectorDeadline)}</div>` : ''}</div><div><div class="muted small">الموظف المكلف</div><b>${r.assignee ? nm(r.assignee) : '—'}</b>${r.assigneeDeadline ? html`<div class="small">حتى ${fmtDate(r.assigneeDeadline)}</div>` : ''}</div><div><div class="muted small">تاريخ الورود</div><b>${fmtDate(r.receivedAt)}</b></div></div></div>
    ${act && !closed && [2, 3, 4].includes(r.stage) ? html`<div class="card card-pad" style="margin-bottom:16px;border-color:var(--orange)"><div class="row between"><div><b>المطلوب منك في هذه المرحلة</b><div class="muted">${r.stage === 2 ? 'حدد القطاع المختص ومدة الإنجاز (يجب ألا تتجاوز مهلة المانح).' : r.stage === 3 ? 'كلّف أحد أفراد القطاع رسميًا بمدة أقصر من مدة القطاع احتياطًا.' : 'نفّذ الطلب، أرفق المخرجات أو صفها، وراجعها قبل الرفع لمسؤول المشاريع.'}</div></div>
      ${r.stage === 2 ? html`<button class="btn accent" data-act="reqSector" data-id="${id}">${icon('grid')} تحديد القطاع والمدة</button>` : r.stage === 3 ? html`<button class="btn accent" data-act="reqAssign" data-id="${id}">${icon('user')} التكليف الرسمي</button>` : html`<button class="btn accent" data-act="reqDeliver" data-id="${id}">${icon('edit')} وصف الإنجاز</button>`}</div></div>` : ''}
    ${tabs([{ id: 'workflow', label: 'سير العمل', icon: 'layers' }, { id: 'details', label: 'التفاصيل والمخرجات', icon: 'file' }, { id: 'files', label: `المرفقات (${vals(r.files).length})`, icon: 'paperclip' }, { id: 'errors', label: 'الأخطاء', icon: 'flag', count: errs.length }, { id: 'log', label: 'السجل', icon: 'history' }], tab, 'data-rtab')}
    ${tab === 'workflow' ? html`<div class="grid g3"><div class="span2">${stagesHtml('request', r)}</div><div class="card"><div class="card-head"><h3>${icon('history')} الحركات</h3><button class="btn sm" data-act="comment" data-type="request" data-id="${id}">${icon('plus')} ملاحظة</button></div><div class="card-body">${timelineHtml(r, 12)}</div></div></div>` : ''}
    ${tab === 'details' ? html`<div class="grid g2"><div class="card"><div class="card-head"><h3>نص الطلب</h3></div><div class="card-body" style="white-space:pre-wrap">${r.desc || '—'}</div></div><div class="card"><div class="card-head"><h3>مخرجات التنفيذ</h3></div><div class="card-body" style="white-space:pre-wrap">${r.deliverable || 'لم تُرفع المخرجات بعد'}</div></div></div>` : ''}
    ${tab === 'files' ? html`<div class="card">${filesHtml('request', r)}</div>` : ''}
    ${tab === 'errors' ? html`<div class="card">${errorsTable(errs)}</div>` : ''}
    ${tab === 'log' ? html`<div class="card card-pad">${timelineHtml(r)}</div>` : ''}`;
}

// ---------- departments
function pLogistics() {
  const tab = UI.tabs.log || 'board'; const M = can('logistics.manage');
  const act = vals(S.projects).filter((p) => p.status === 'active'); const sup = vals(S.suppliers).sort((a, b) => a.name.localeCompare(b.name));
  const allContracts = vals(S.projects).flatMap((p) => vals(p.contracts).map((c) => ({ ...c, p })));
  const allClaims = vals(S.projects).flatMap((p) => vals(p.claims).map((c) => ({ ...c, p })));
  const supStats = (id) => { const q = vals(S.projects).flatMap((p) => vals(p.quotes)).filter((x) => x.supplier === id); const c = allClaims.filter((x) => x.supplier === id); return { q: q.length, w: q.filter((x) => x.selected).length, paid: c.filter((x) => x.status === 'paid').reduce((a, x) => a + Number(x.amount || 0), 0), due: c.filter((x) => x.status === 'approved').reduce((a, x) => a + Number(x.amount || 0), 0) }; };
  const groups = [['عروض الأسعار واعتماد الأقل (م2، م4)', act.filter((p) => [2, 4].includes(p.stage))], ['توفير المواد في موعد التنفيذ (م7)', act.filter((p) => p.stage === 7)], ['المطالبات والإخلاءات (م11، م13)', act.filter((p) => [11, 13].includes(p.stage))]];
  return html`${pageHead('إدارة اللوجستيات', 'عروض الأسعار، الموردون، العقود، توفير المواد، ومطالبات الموردين', M ? html`<button class="btn primary" data-act="supplier">${icon('plus')} مورد جديد</button>` : '', 'truck')}
    <div class="grid g4" style="margin-bottom:16px"><div class="card stat"><div class="ic orange">${icon('truck')}</div><div><div class="v">${groups[0][1].length}</div><div class="l">بانتظار عروض الأسعار</div></div></div><div class="card stat"><div class="ic green">${icon('layers')}</div><div><div class="v">${groups[1][1].length}</div><div class="l">بانتظار توفير المواد</div></div></div>
      <div class="card stat"><div class="ic blue">${icon('file')}</div><div><div class="v">${allContracts.filter((c) => c.status === 'pending').length}</div><div class="l">عقود بانتظار التوقيع</div></div></div><div class="card stat"><div class="ic purple">${icon('users')}</div><div><div class="v">${sup.filter((s) => s.active !== false).length}</div><div class="l">مورد نشط</div></div></div></div>
    ${tabs([{ id: 'board', label: 'لوحة العمل', icon: 'target' }, { id: 'suppliers', label: 'سجل الموردين', icon: 'users' }, { id: 'contracts', label: 'العقود', icon: 'file' }, { id: 'claims', label: 'المطالبات', icon: 'wallet', count: allClaims.filter((c) => c.status === 'submitted').length }], tab, 'data-ltab')}
    ${tab === 'board' ? html`<div class="grid g3">${groups.map(([t, list]) => html`<div class="card"><div class="card-head"><h3>${t}</h3><span class="badge">${list.length}</span></div>${list.length ? list.map((p) => html`<a class="list-item" href="#project-${p.id}"><div class="body"><b>${p.title}</b><div class="meta">${p.code} · م${p.stage} ${p.execDate ? '· التنفيذ ' + fmtDate(p.execDate) : ''}</div></div></a>`) : empty('لا شيء معلق', 'checkCircle')}</div>`)}</div>` : ''}
    ${tab === 'suppliers' ? html`<div class="card">${sup.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>المورد</th><th>التصنيف</th><th>التواصل</th><th>التقييم</th><th>العروض / الفوز</th><th>مستحق</th><th>مصروف</th><th></th></tr></thead><tbody>
      ${sup.map((s) => { const st = supStats(s.id); return html`<tr style="${s.active === false ? 'opacity:.5' : ''}"><td><b>${s.name}</b>${s.notes ? html`<div class="muted small">${s.notes}</div>` : ''}</td><td>${s.cat || '—'}</td><td class="small">${s.contact || ''}<div class="ltr" style="text-align:right">${s.phone || ''}</div></td><td style="color:var(--orange)">${'★'.repeat(s.rating || 0)}${'☆'.repeat(5 - (s.rating || 0))}</td><td class="num">${st.q} / ${st.w}</td><td>${money(st.due)}</td><td>${money(st.paid)}</td><td>${M ? html`<button class="btn sm ghost" data-act="supplier" data-id="${s.id}">${icon('edit')}</button>` : ''}</td></tr>`; })}
      </tbody></table></div>` : empty('لا يوجد موردون بعد. أضف أول مورد ليظهر في عروض الأسعار.', 'users')}</div>` : ''}
    ${tab === 'contracts' ? html`<div class="card">${allContracts.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>العقد</th><th>المشروع</th><th>المورد</th><th>القيمة</th><th>الحالة</th></tr></thead><tbody>${allContracts.map((c) => html`<tr class="clickable" data-act="go" data-href="#project-${c.p.id}"><td><b>${c.title}</b></td><td>${c.p.code}</td><td>${(S.suppliers[c.supplier] || {}).name || ''}</td><td>${money(c.amount)}</td><td><span class="badge ${CONTRACT[c.status][1]}">${CONTRACT[c.status][0]}</span></td></tr>`)}</tbody></table></div>` : empty('لا توجد عقود. تُعد العقود من تبويب اللوجستيات داخل المشروع.', 'file')}</div>` : ''}
    ${tab === 'claims' ? html`<div class="card">${allClaims.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>المورد</th><th>المشروع</th><th>المبلغ</th><th>اللوجستيات</th><th>المالية</th><th>الحالة</th></tr></thead><tbody>${allClaims.map((c) => html`<tr class="clickable" data-act="go" data-href="#project-${c.p.id}"><td><b>${(S.suppliers[c.supplier] || {}).name || ''}</b></td><td>${c.p.code}</td><td>${money(c.amount)}</td><td>${c.lOk ? '✔' : '—'}</td><td>${c.fOk ? '✔' : '—'}</td><td><span class="badge ${CLAIM[c.status][1]}">${CLAIM[c.status][0]}</span></td></tr>`)}</tbody></table></div>` : empty('لا توجد مطالبات', 'wallet')}</div>` : ''}`;
}
function pFinance() {
  const P = vals(S.projects); const tab = UI.tabs.fin || 'overview';
  const sum = (f) => P.reduce((a, p) => a + (Number(f(p)) || 0), 0);
  const tx = P.flatMap((p) => vals(p.txs).map((x) => ({ ...x, p }))).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const claims = P.flatMap((p) => vals(p.claims).map((c) => ({ ...c, p })));
  const spentOf = (p) => vals(p.txs).filter((x) => x.type === 'expense').reduce((a, x) => a + Number(x.amount || 0), 0);
  const months = []; for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
  return html`${pageHead('الإدارة المالية', 'المخصص الإداري، صرف المستحقات بالشيكات، مراجعة الإخلاءات والإقفال المالي', '', 'wallet')}
    <div class="grid g4" style="margin-bottom:16px"><div class="card stat"><div class="ic green">${icon('wallet')}</div><div><div class="v">${money(sum((p) => p.grant))}</div><div class="l">إجمالي المنح (${P.length} مشروع)</div></div></div><div class="card stat"><div class="ic blue">${icon('briefcase')}</div><div><div class="v">${money(sum((p) => p.fee))}</div><div class="l">إجمالي المخصص الإداري</div></div></div>
      <div class="card stat"><div class="ic orange">${icon('truck')}</div><div><div class="v">${money(claims.filter((c) => c.status === 'approved').reduce((a, c) => a + Number(c.amount || 0), 0))}</div><div class="l">مستحقات معتمدة غير مصروفة</div></div></div><div class="card stat"><div class="ic purple">${icon('database')}</div><div><div class="v">${money(tx.filter((x) => x.type === 'expense').reduce((a, x) => a + Number(x.amount || 0), 0))}</div><div class="l">إجمالي المنصرف</div></div></div></div>
    ${tabs([{ id: 'overview', label: 'الموقف المالي للمشاريع', icon: 'chart' }, { id: 'payables', label: 'مستحقات للصرف', icon: 'truck', count: claims.filter((c) => c.status === 'approved').length }, { id: 'ledger', label: 'دفتر الحركات', icon: 'database' }], tab, 'data-ftab')}
    ${tab === 'overview' ? html`<div class="grid g3"><div class="card span2">${P.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>المشروع</th><th>المنحة</th><th>المخصص</th><th>المعتمد</th><th>المصروف</th><th>نسبة الصرف</th></tr></thead><tbody>${P.map((p) => { const pct = p.net ? Math.min(100, Math.round((spentOf(p) / p.net) * 100)) : 0; return html`<tr class="clickable" data-act="go" data-href="#project-${p.id}"><td class="title-cell"><b>${p.title}</b><span>${p.code}</span></td><td>${money(p.grant, p.currency)}</td><td>${p.fee != null ? money(p.fee, p.currency) : html`<span class="badge amber">لم يُحدد</span>`}</td><td>${money(p.net, p.currency)}</td><td>${money(spentOf(p), p.currency)}</td><td style="min-width:100px"><div class="progress"><div style="width:${raw(String(pct))}%"></div></div><span class="small num">${pct}%</span></td></tr>`; })}</tbody></table></div>` : empty('لا توجد مشاريع بعد', 'wallet')}</div>
      <div class="card"><div class="card-head"><h3>المنصرف الشهري</h3></div><div class="card-body">${vbars(months.map((m) => ({ label: m.slice(5), value: tx.filter((x) => x.type === 'expense' && (x.date || '').startsWith(m)).reduce((a, x) => a + Number(x.amount || 0), 0) })))}<p class="muted small">آخر 12 شهرًا</p></div></div></div>` : ''}
    ${tab === 'payables' ? html`<div class="card"><div class="card-head"><h3>مطالبات معتمدة بانتظار الصرف</h3></div>${claims.filter((c) => c.status === 'approved').map((c) => html`<div class="list-item"><div class="body"><b>${(S.suppliers[c.supplier] || {}).name || ''} — ${money(c.amount)}</b><div class="meta">${c.p.code} · ${c.p.title}</div></div>${can('finance.manage') ? html`<button class="btn sm primary" data-act="pay" data-id="${c.p.id}" data-c="${c.id}">${icon('wallet')} صرف بشيك</button>` : ''}</div>`)}${claims.some((c) => c.status === 'approved') ? '' : empty('لا توجد مستحقات معلقة', 'checkCircle')}
      <div class="card-head" style="border-top:1px solid var(--line-2)"><h3>بانتظار إفادة المالية</h3></div>${claims.filter((c) => c.status === 'submitted' && !c.fOk).map((c) => html`<a class="list-item" href="#project-${c.p.id}"><div class="body"><b>${(S.suppliers[c.supplier] || {}).name || ''} — ${money(c.amount)}</b><div class="meta">${c.p.code}</div></div><span class="badge amber">بانتظار المراجعة</span></a>`)}</div>` : ''}
    ${tab === 'ledger' ? html`<div class="card">${tx.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>التاريخ</th><th>المشروع</th><th>النوع</th><th>البيان</th><th>المرجع</th><th>المبلغ</th><th>بواسطة</th></tr></thead><tbody>${tx.map((x) => html`<tr><td class="nowrap">${fmtDate(x.date)}</td><td>${x.p.code}</td><td>${x.type === 'income' ? html`<span class="badge green">وارد</span>` : html`<span class="badge orange">منصرف</span>`}</td><td>${x.desc || ''}</td><td class="small">${x.ref || ''}</td><td>${money(x.amount, x.p.currency)}</td><td class="small">${nm(x.by)}</td></tr>`)}</tbody></table></div>` : empty('لا توجد حركات', 'database')}</div>` : ''}`;
}
function pMedia() {
  const act = vals(S.projects).filter((p) => p.status === 'active');
  const up = act.filter((p) => p.execDate && daysUntil(p.execDate) >= 0 && daysUntil(p.execDate) <= 21);
  const items = act.concat(vals(S.projects).filter((p) => p.status !== 'active')).flatMap((p) => vals(p.media).map((m) => ({ ...m, p }))).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return html`${pageHead('إدارة الإعلام', 'التغطية في موعد التنفيذ، رفع التوثيقات عبر الرابط المعتمد ومراجعتها، وقصص النجاح', '', 'camera')}
    <div class="grid g3" style="margin-bottom:16px"><div class="card"><div class="card-head"><h3>${icon('calendar')} مواعيد تنفيذ خلال 3 أسابيع</h3></div>${up.length ? up.map((p) => html`<a class="list-item" href="#project-${p.id}"><div class="body"><b>${p.title}</b><div class="meta">${p.location || ''}</div></div><span class="badge green">${fmtDate(p.execDate)}</span></a>`) : empty('لا توجد مواعيد قريبة', 'calendar')}</div>
      <div class="card"><div class="card-head"><h3>${icon('upload')} بانتظار التوثيقات (م8)</h3></div>${act.filter((p) => p.stage === 8).map((p) => html`<a class="list-item" href="#project-${p.id}"><div class="body"><b>${p.title}</b><div class="meta">${p.code}</div></div><span class="badge solid">دورنا</span></a>`)}${act.some((p) => p.stage === 8) ? '' : empty('لا شيء معلق', 'checkCircle')}</div>
      <div class="card card-pad"><h3 style="font-size:15px;margin-bottom:8px">قاعدة ذهبية</h3><p class="muted" style="margin:0">في مراحل التوثيق يجب التأكيد على <b>«المراجعة والرفع»</b> معًا، ولا يُكتفى بالرفع فقط. النظام لا يسمح بإنجاز المرحلة 8 دون التأكيدين.</p></div></div>
    <div class="card"><div class="card-head"><h3>${icon('camera')} سجل التغطيات</h3><span class="muted small">تُضاف التغطيات من تبويب «الإعلام والتوثيق» داخل كل مشروع</span></div>
      ${items.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>التغطية</th><th>المشروع</th><th>الموعد</th><th>الإعلامي</th><th>الحالة</th></tr></thead><tbody>${items.map((m) => html`<tr class="clickable" data-act="go" data-href="#project-${m.p.id}"><td><b>${m.title}</b></td><td>${m.p.code}</td><td>${fmtDate(m.date)}</td><td>${m.reporter ? nm(m.reporter) : '—'}</td><td><span class="badge ${['reviewed', 'published'].includes(m.status) ? 'green' : 'amber'}">${MEDIA[m.status]}</span></td></tr>`)}</tbody></table></div>` : empty('لا توجد تغطيات', 'camera')}</div>`;
}
function pSecretariat() {
  const M = can('secretariat.manage'); const dir = UI.tabs.sec || 'all';
  const rows = vals(S.corr).filter((c) => dir === 'all' || c.dir === dir).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const openReq = vals(S.requests).filter((r) => r.status === 'active' && canSeeRequest(r)).sort((a, b) => (a.donorDeadline || '9').localeCompare(b.donorDeadline || '9'));
  const sub = vals(S.projects).filter((p) => p.status === 'active' && [10, 15].includes(p.stage));
  return html`${pageHead('سكرتارية الإدارة العامة', 'مسؤول المتابعة والرفع: سجل الوارد والصادر، متابعة المهل، والرفع للجهة المانحة', M ? html`<button class="btn" data-act="corr" data-v="out">${icon('send')} تسجيل صادر</button><button class="btn primary" data-act="corr" data-v="in">${icon('inbox')} تسجيل وارد</button>` : '', 'book')}
    <div class="grid g2" style="margin-bottom:16px"><div class="card"><div class="card-head"><h3>${icon('clock')} مهل الطلبات المفتوحة</h3></div>${openReq.length ? openReq.slice(0, 8).map((r) => { const n = daysUntil(r.donorDeadline); return html`<a class="list-item" href="#request-${r.id}"><div class="body"><b>${r.code} — ${r.title}</b><div class="meta">م${r.stage}: ${REQUEST_STAGES[r.stage - 1].title}</div></div>${r.donorDeadline ? html`<span class="badge ${n < 0 ? 'red' : n <= 2 ? 'amber' : 'green'}">${n < 0 ? 'متأخر ' + -n : 'باقي ' + n} يوم</span>` : ''}</a>`; }) : empty('لا توجد طلبات مفتوحة', 'checkCircle')}</div>
      <div class="card"><div class="card-head"><h3>${icon('send')} بانتظار الرفع للجهة المانحة</h3></div>${sub.length ? sub.map((p) => html`<a class="list-item" href="#project-${p.id}"><div class="body"><b>${p.title}</b><div class="meta">${p.code} · ${p.stage === 10 ? 'الإخلاءات الإعلامية' : 'الإخلاءات المالية والإغلاق'}</div></div><span class="badge solid">م${p.stage}</span></a>`) : empty('لا شيء بانتظار الرفع', 'checkCircle')}</div></div>
    <div class="card"><div class="card-head"><h3>${icon('book')} سجل الوارد والصادر</h3><div class="seg">${[['all', 'الكل'], ['in', 'الوارد'], ['out', 'الصادر']].map(([k, l]) => html`<button data-act="tab" data-k="sec" data-v="${k}" class="${dir === k ? 'active' : ''}">${l}</button>`)}</div></div>
      ${rows.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>الرقم</th><th>النوع</th><th>الموضوع</th><th>الجهة</th><th>التاريخ</th><th>الوسيلة</th><th></th></tr></thead><tbody>${rows.map((r) => html`<tr><td class="num nowrap"><b>${r.ref}</b></td><td>${r.dir === 'in' ? html`<span class="badge blue">وارد</span>` : html`<span class="badge orange">صادر</span>`}</td><td><b>${r.subject}</b>${r.notes ? html`<div class="muted small">${r.notes}</div>` : ''}</td><td>${r.party || ''}</td><td class="nowrap">${fmtDate(r.date)}</td><td class="small">${r.channel || ''}</td><td>${M ? html`<button class="btn sm ghost" data-act="delDoc" data-path="corr/${r.id}">${icon('trash')}</button>` : ''}</td></tr>`)}</tbody></table></div>` : empty('السجل فارغ', 'book')}</div>`;
}

// ---------- chat
const PUBLIC_CH = [['general', 'الساحة العامة', 'النقاش العام لجميع طاقم المنتدى'], ['ideas', 'أفكار ومقترحات التطوير', 'شاركنا فكرتك لتحسين العمل'], ['support', 'استفسارات النظام', 'أسئلة حول استخدام النظام']];
function channels() {
  const out = PUBLIC_CH.map(([k, n, d]) => ({ key: k, name: n, desc: d, kind: 'public' }));
  for (const [k, d] of Object.entries(cfg().depts)) out.push({ key: 'd-' + k, name: d.name, desc: 'قناة داخلية لأفراد الإدارة', kind: 'dept', dept: k, color: d.color });
  return out.filter((c) => chAccess(c.key));
}
function chAccess(key) {
  if (!can('chat.use')) return false;
  if (!key.startsWith('d-')) return true;
  return key === 'd-' + myDept() || can('chat.all');
}
const chName = (key) => { const p = PUBLIC_CH.find((x) => x[0] === key); return p ? p[1] : deptName(key.slice(2)); };
const chMsgs = (key) => vals(S.chat).filter((d) => d.ch === key).flatMap((d) => vals(d.msgs).map((m) => ({ ...m, docId: d.id }))).sort((a, b) => a.at.localeCompare(b.at));
function chUnread(key) { const seen = ((S.mine || {}).chat || {})[key] || ''; return chMsgs(key).filter((m) => m.at > seen && m.by !== S.uid && !m.del).length; }
const chatUnreadTotal = () => (can('chat.use') ? channels().reduce((a, c) => a + chUnread(c.key), 0) : 0);
let chatSeenTimer = null;
function markChatSeen() {
  const key = parseRoute().param || UI.chatCh; const msgs = chMsgs(key); if (!msgs.length) return;
  const last = msgs[msgs.length - 1].at; const seen = ((S.mine || {}).chat || {})[key] || '';
  if (last <= seen) return;
  clearTimeout(chatSeenTimer);
  chatSeenTimer = setTimeout(() => saveMine({ chat: { ...((S.mine || {}).chat || {}), [key]: last } }), 1200);
}
function richText(body) {
  let s = esc(body || '');
  s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  for (const st of activeStaff()) if (st.name) s = s.split(esc('@' + st.name)).join(`<span class="mention">@${esc(st.name)}</span>`);
  return raw(s);
}
function pChat(param) {
  const chs = channels(); const key = param && chAccess(param) ? param : (chs[0] || {}).key; UI.chatCh = key;
  const ch = chs.find((c) => c.key === key);
  if (!ch) return empty('لا توجد قنوات متاحة لك', 'chat');
  const msgs = chMsgs(key); const pinned = msgs.filter((m) => m.pin && !m.del);
  const members = ch.kind === 'dept' ? activeStaff().filter((s) => s.dept === ch.dept) : null;
  const q = UI.mention; const sugg = q != null ? activeStaff().filter((s) => s.id !== S.uid && s.name && s.name.includes(q)).slice(0, 6) : [];
  return html`<div class="card chat ${UI.chatSide ? 'show-side' : ''}">
    <aside class="chat-side">${[['public', 'القنوات العامة'], ['dept', 'قنوات الإدارات']].map(([k, l]) => { const list = chs.filter((c) => c.kind === k); return list.length ? html`<div class="sec"><span>${l}</span></div>${list.map((c) => { const u = c.key === key ? 0 : chUnread(c.key); return html`<a class="chan ${c.key === key ? 'active' : ''}" href="#chat-${c.key}"><span class="hash" style="${c.color ? raw('color:' + c.color) : ''}">${k === 'public' ? '#' : '◆'}</span><span class="nm">${c.name}</span>${u ? html`<span class="badge solid">${u}</span>` : ''}</a>`; })}` : ''; })}</aside>
    <section class="chat-main">
      <div class="chat-head"><div class="row"><button class="btn sm ghost only-mobile" data-act="chatSide">${icon('menu')}</button><div><b>${ch.kind === 'public' ? '#' : '◆'} ${ch.name}</b><div class="muted small">${ch.desc}</div></div></div>${members ? html`<span class="badge">${icon('users', 'width="13"')} ${members.length} عضو</span>` : html`<span class="badge">متاحة للجميع</span>`}</div>
      ${pinned.length ? html`<div class="pinned-bar">📌 ${nm(pinned[pinned.length - 1].by)}: ${(pinned[pinned.length - 1].body || '').slice(0, 150)}</div>` : ''}
      <div class="chat-msgs" id="msgs">${msgs.length ? msgs.map((m, i) => msgHtml(m, msgs[i - 1])) : empty('ابدأ النقاش… اكتب أول رسالة 👋', 'chat')}</div>
      <div class="composer">
        ${UI.reply ? html`<div class="replying"><span>↩ ردًا على ${nm(UI.reply.by)}: ${(UI.reply.body || '').slice(0, 80)}</span><button class="btn sm ghost" data-act="cancelReply">${icon('x', 'width="14"')}</button></div>` : ''}
        ${sugg.length ? html`<div class="row" style="margin-bottom:6px;gap:6px"><span class="muted small">إشارة إلى:</span>${sugg.map((s) => html`<button class="btn sm" data-act="mention" data-v="${s.name}">@${s.name}</button>`)}</div>` : ''}
        <form id="composer" data-submit="send"><textarea id="mbody" rows="1" data-input="mention" placeholder="اكتب رسالتك… (Enter للإرسال، Shift+Enter لسطر جديد، @ للإشارة إلى زميل)"></textarea><button class="btn primary" type="submit" aria-label="إرسال">${icon('send')}</button></form>
      </div></section></div>`;
}
function msgHtml(m, prev) {
  const d = new Date(m.at); const pd = prev && new Date(prev.at);
  const newDay = !pd || d.toDateString() !== pd.toDateString();
  const compact = !newDay && prev && prev.by === m.by && d - pd < 5 * 60e3 && !m.reply;
  const mine = m.by === S.uid; const mod = can('announcements.publish') || S.isOwner;
  const rep = m.reply && chMsgs(UI.chatCh).find((x) => x.id === m.reply);
  return html`${newDay ? html`<div class="day-sep"><span>${fmtDate(m.at)}</span></div>` : ''}<div class="msg ${m.pin && !m.del ? 'pinned' : ''}">
    ${compact ? html`<span style="width:36px;flex:none"></span>` : av(m.by)}<div class="mb">
      ${compact ? '' : html`<div class="mh"><b>${nm(m.by)}</b><span>${deptName((S.staff[m.by] || {}).dept)} · ${fmtTime(m.at)}</span></div>`}
      ${rep ? html`<div class="reply">↩ ${nm(rep.by)}: ${(rep.body || '').slice(0, 120)}</div>` : ''}
      ${m.del ? html`<div class="text muted"><i>تم حذف هذه الرسالة</i></div>` : html`<div class="text">${richText(m.body)}</div>`}
      ${vals(m.re).length ? html`<div class="reacts">${Object.entries(m.re || {}).filter(([, us]) => us && Object.values(us).some(Boolean)).map(([em, us]) => { const n = Object.values(us).filter(Boolean).length; return html`<button data-act="react" data-doc="${m.docId}" data-c="${m.id}" data-v="${em}" class="${us[S.uid] ? 'me' : ''}">${em} ${n}</button>`; })}</div>` : ''}
    </div>${m.del ? '' : html`<div class="tools">${['👍', '✅', '❤️', '🙏'].map((e) => html`<button data-act="react" data-doc="${m.docId}" data-c="${m.id}" data-v="${e}">${e}</button>`)}<button data-act="reply" data-c="${m.id}" title="رد">↩</button>${mod ? html`<button data-act="pin" data-doc="${m.docId}" data-c="${m.id}" title="تثبيت">📌</button>` : ''}${mine || mod ? html`<button data-act="delMsg" data-doc="${m.docId}" data-c="${m.id}" title="حذف">🗑</button>` : ''}</div>`}</div>`;
}

// ---------- announcements / tasks / directory
function annVisible(a) { return !a.dept || a.dept === myDept() || can('announcements.publish'); }
function pAnn() {
  const P = can('announcements.publish'); const rows = vals(S.ann).filter(annVisible).sort((a, b) => b.at.localeCompare(a.at));
  const PR = { normal: ['', ''], important: ['مهم', 'orange'], urgent: ['عاجل', 'red'] };
  return html`${pageHead('التعميمات الرسمية', 'قرارات وتعليمات الإدارة العامة، مع تتبع من اطّلع وأكّد', P ? html`<button class="btn primary" data-act="newAnn">${icon('megaphone')} نشر تعميم</button>` : '', 'megaphone')}
    <div class="stack">${rows.length ? rows.map((a) => { const reads = Object.entries(a.reads || {}).filter(([, v]) => v); const aud = activeStaff().filter((s) => !a.dept || s.dept === a.dept); return html`<div class="card" style="${a.prio === 'urgent' ? 'border-color:var(--red)' : a.prio === 'important' ? 'border-color:var(--orange)' : ''}">
      <div class="card-head"><div class="row">${av(a.by)}<div><h3>${a.title}</h3><div class="muted small">${nm(a.by)} · ${ago(a.at)} · ${a.dept ? 'موجّه إلى: ' + deptName(a.dept) : 'لجميع الطاقم'}</div></div></div><div class="row">${a.prio !== 'normal' ? html`<span class="badge ${PR[a.prio][1]}">${PR[a.prio][0]}</span>` : ''}${P ? html`<button class="btn sm ghost" data-act="delDoc" data-path="ann/${a.id}">${icon('trash')}</button>` : ''}</div></div>
      <div class="card-body" style="white-space:pre-wrap">${a.body}</div>
      <div class="card-head" style="border-top:1px solid var(--line-2);border-bottom:0">${(a.reads || {})[S.uid] ? html`<span class="badge green">${icon('check', 'width="13"')} اطّلعت ${fmtDateTime(a.reads[S.uid])}</span>` : html`<button class="btn sm ${a.ack ? 'accent' : ''}" data-act="ack" data-id="${a.id}">${icon('check')} ${a.ack ? 'أؤكد اطلاعي والتزامي' : 'تمت القراءة'}</button>`}
        ${P ? html`<details><summary class="small" style="cursor:pointer">اطّلع ${reads.length} من ${aud.length}</summary><div class="small muted">${reads.map(([u]) => nm(u)).join('، ') || '—'}</div><div class="small" style="color:var(--red)">لم يطّلع: ${aud.filter((s) => !(a.reads || {})[s.id]).map((s) => s.name).join('، ') || '—'}</div></details>` : ''}</div></div>`; }) : html`<div class="card">${empty('لا توجد تعميمات', 'megaphone')}</div>`}</div>`;
}
function pTasks() {
  const sc = UI.taskScope; const A = can('tasks.assign'); const all = S.isOwner || can('workflow.approve');
  const rows = vals(S.tasks).filter((t) => (sc === 'mine' ? t.assignee === S.uid : sc === 'created' ? t.by === S.uid : sc === 'dept' ? (S.staff[t.assignee] || {}).dept === myDept() : all));
  const COLS = [['todo', 'للتنفيذ'], ['doing', 'قيد العمل'], ['review', 'للمراجعة'], ['done', 'منجزة']];
  const card = (t) => { const du = daysUntil(t.due); return html`<div class="kcard prio-${t.prio}" draggable="true" data-task="${t.id}"><div class="row between"><b>${t.title}</b>${prioBadge(t.prio)}</div>${t.desc ? html`<div class="muted small" style="white-space:pre-wrap">${t.desc.slice(0, 140)}</div>` : ''}
    <div class="row small" style="margin-top:6px;gap:6px">${sc !== 'mine' ? html`<span class="badge">${nm(t.assignee)}</span>` : t.by !== S.uid ? html`<span class="muted">من ${nm(t.by)}</span>` : ''}${t.projectId && S.projects[t.projectId] ? html`<a class="badge green" href="#project-${t.projectId}">${S.projects[t.projectId].code}</a>` : ''}${t.due ? html`<span class="badge ${t.status !== 'done' && du < 0 ? 'red' : ''}">${fmtDate(t.due)}</span>` : ''}</div>
    <div class="row" style="margin-top:6px;gap:4px">${COLS.filter(([k]) => k !== t.status).map(([k, l]) => html`<button class="btn sm ghost" data-act="moveTask" data-id="${t.id}" data-v="${k}" style="padding:2px 7px;font-size:11.5px">← ${l}</button>`)}${t.by === S.uid || S.isOwner ? html`<button class="btn sm ghost" data-act="delDoc" data-path="tasks/${t.id}" style="padding:2px 6px">${icon('trash', 'width="13"')}</button>` : ''}</div></div>`; };
  return html`${pageHead('المهام', 'لوحة كانبان شخصية وللفريق، اسحب البطاقة بين الأعمدة لتحديث حالتها', html`<button class="btn primary" data-act="newTask">${icon('plus')} مهمة جديدة</button>`, 'tasks')}
    <div class="row" style="margin-bottom:14px"><div class="seg"><button data-act="taskScope" data-v="mine" class="${sc === 'mine' ? 'active' : ''}">مهامي</button><button data-act="taskScope" data-v="created" class="${sc === 'created' ? 'active' : ''}">أسندتها</button>${A ? html`<button data-act="taskScope" data-v="dept" class="${sc === 'dept' ? 'active' : ''}">مهام إدارتي</button>` : ''}${all ? html`<button data-act="taskScope" data-v="all" class="${sc === 'all' ? 'active' : ''}">كل المنتدى</button>` : ''}</div></div>
    <div class="kanban">${COLS.map(([k, l]) => { const list = rows.filter((t) => t.status === k); return html`<div class="kcol" data-col="${k}"><h4><span>${l}</span><span class="badge">${list.length}</span></h4>${list.map(card)}</div>`; })}</div>`;
}
function pDirectory() {
  const groups = {}; for (const s of activeStaff()) (groups[s.dept || '-'] = groups[s.dept || '-'] || []).push(s);
  return html`${pageHead('دليل الموظفين', `${activeStaff().length} عضو في طاقم المنتدى`, '', 'users')}
    ${Object.entries(groups).map(([d, list]) => html`<h3 style="margin:18px 0 10px;display:flex;align-items:center;gap:8px"><span class="dot-c" style="background:${raw(deptColor(d))}"></span>${deptName(d)} <span class="badge">${list.length}</span></h3>
      <div class="grid g4">${list.map((s) => html`<div class="card card-pad"><div class="row">${av(s.id, 'lg')}<div style="min-width:0"><b>${s.name}</b><div class="muted small">${s.title || ''}</div><span class="badge">${roleName(s)}</span></div></div>${s.phone ? html`<div class="small ltr" style="text-align:right;margin-top:8px">☎ ${s.phone}</div>` : ''}</div>`)}</div>`)}`;
}

// ---------- errors & reports
function pErrors() {
  const M = can('errors.manage'); const m = UI.month;
  const rows = vals(S.errors).filter((e) => !m || (e.at || '').startsWith(m)).sort((a, b) => b.at.localeCompare(a.at));
  const by = (f) => { const o = {}; for (const r of rows) { const k = f(r); if (k) o[k] = (o[k] || 0) + 1; } return Object.entries(o).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8); };
  const label = m ? new Intl.DateTimeFormat('ar-u-nu-latn', { month: 'long', year: 'numeric' }).format(new Date(m + '-01T00:00')) : 'كل الفترات';
  return html`${pageHead('سجل الأخطاء الشهري', 'يُقيَّد كل خطأ على المسؤول عنه في المرحلة التي وقع فيها، لمتابعته والتركيز عليه في التقييم', html`<input type="month" class="input" style="width:170px" id="err-month" data-change="month" value="${m}"><button class="btn" data-act="allMonths">كل الفترات</button>${M ? html`<button class="btn primary" data-act="newError">${icon('plus')} قيد خطأ يدوي</button>` : ''}`, 'flag')}
    <div class="grid g3" style="margin-bottom:16px"><div class="card"><div class="card-head"><h3>حسب الإدارة</h3><span class="badge red">${rows.length} خطأ</span></div><div class="card-body">${bars(by((r) => deptName(r.dept)), { color: 'var(--orange)' })}</div></div>
      <div class="card"><div class="card-head"><h3>حسب الموظف</h3></div><div class="card-body">${bars(by((r) => r.resp && nm(r.resp)), { color: 'var(--orange)' })}</div></div>
      <div class="card"><div class="card-head"><h3>حسب المرحلة</h3></div><div class="card-body">${bars(by((r) => r.stage && `${r.etype === 'request' ? 'طلب' : 'مشروع'} – م${r.stage}`), { color: 'var(--orange)' })}</div></div></div>
    <div class="card"><div class="card-head"><h3>نموذج سجل الأخطاء — ${label}</h3></div>
      ${rows.length ? html`<div class="table-wrap"><table class="t"><thead><tr><th>م</th><th>التاريخ</th><th>المشروع / الطلب</th><th>القطاع</th><th>اسم الموظف</th><th>المرحلة</th><th>اسم الخطأ</th><th>الدرجة</th><th>قيّده</th><th>الحالة</th></tr></thead><tbody>
        ${rows.map((e, i) => html`<tr><td>${i + 1}</td><td class="nowrap">${fmtDate(e.at)}</td><td>${e.etype === 'project' || e.etype === 'request' ? html`<a href="#${e.etype}-${e.eid}">${e.etitle}</a>` : e.etitle || '—'}</td><td>${deptName(e.dept)}</td><td>${e.resp ? nm(e.resp) : '—'}</td><td class="small">${e.stage ? 'م' + e.stage : ''} ${e.stageTitle || ''}</td>
          <td><b>${e.name}</b>${e.desc ? html`<div class="muted small">${e.desc}</div>` : ''}</td><td><span class="badge ${e.sev === 'high' ? 'red' : e.sev === 'low' ? '' : 'amber'}">${{ low: 'بسيط', medium: 'متوسط', high: 'جسيم' }[e.sev || 'medium']}</span></td><td class="small">${nm(e.by)}</td>
          <td>${M ? html`<button class="btn sm ${e.status === 'resolved' ? '' : 'primary'}" data-act="errStatus" data-id="${e.id}" data-v="${e.status === 'resolved' ? 'open' : 'resolved'}">${e.status === 'resolved' ? '✔ مُعالج' : 'تعليم كمُعالج'}</button>` : e.status === 'resolved' ? html`<span class="badge green">مُعالج</span>` : html`<span class="badge red">مفتوح</span>`}</td></tr>`)}</tbody></table></div>` : empty('لا أخطاء مقيدة في هذه الفترة 🎉', 'checkCircle')}</div>`;
}
function pReports() {
  const P = vals(S.projects); const R = vals(S.requests); const E = vals(S.errors);
  const dur = PROJECT_STAGES.map((s) => ({ n: s.n, title: s.title, sum: 0, k: 0 }));
  for (const p of P) {
    const evs = vals(p.events).sort((a, b) => a.at.localeCompare(b.at)); let start = p.createdAt;
    for (const e of evs) {
      if (e.action === 'created' || e.action === 'returned') { start = e.at; continue; }
      if (e.action === 'submitted') continue;
      if ((e.action === 'completed' || e.action === 'approved') && e.stage) { const d = dur[e.stage - 1]; d.sum += (new Date(e.at) - new Date(start)) / 864e5; d.k++; start = e.at; }
    }
  }
  const closedR = R.filter((r) => r.status === 'closed'); const onTime = closedR.filter((r) => !r.donorDeadline || (r.closedAt || '').slice(0, 10) <= r.donorDeadline).length;
  const months = []; for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
  const grp = (f) => { const o = {}; for (const p of P) { const k = f(p) || 'غير محدد'; o[k] = o[k] || { n: 0, ben: 0, grant: 0 }; o[k].n++; o[k].ben += Number(p.ben) || 0; o[k].grant += Number(p.grant) || 0; } return Object.entries(o).sort((a, b) => b[1].n - a[1].n); };
  const T = vals(S.tasks);
  return html`${pageHead('التقارير ومؤشرات الأداء', 'الالتزام بالمهل، زمن الدورة، جودة العمل، وتوزيع العبء', '', 'chart')}
    <div class="grid g4" style="margin-bottom:16px"><div class="card stat"><div class="ic green">${icon('layers')}</div><div><div class="v">${P.length}</div><div class="l">إجمالي المشاريع (${P.filter((p) => p.status === 'closed').length} مغلق)</div></div></div><div class="card stat"><div class="ic orange">${icon('heart')}</div><div><div class="v">${fmtNum(P.reduce((a, p) => a + (Number(p.ben) || 0), 0))}</div><div class="l">إجمالي المستفيدين</div></div></div>
      <div class="card stat"><div class="ic blue">${icon('clock')}</div><div><div class="v">${closedR.length ? Math.round((onTime / closedR.length) * 100) + '%' : '—'}</div><div class="l">إنجاز الطلبات ضمن مهلة المانح (${onTime}/${closedR.length})</div></div></div><div class="card stat"><div class="ic red">${icon('flag')}</div><div><div class="v">${E.length}</div><div class="l">إجمالي الأخطاء المقيدة</div></div></div></div>
    <div class="grid g2"><div class="card"><div class="card-head"><h3>${icon('clock')} متوسط زمن كل مرحلة (أيام)</h3></div><div class="card-body">${bars(dur.filter((d) => d.k).map((d) => ({ label: `${d.n}. ${d.title}`, value: Math.round((d.sum / d.k) * 10) / 10 })))}<p class="muted small">المراحل الأطول هي «عنق الزجاجة» التي تحتاج تدخلًا إداريًا.</p></div></div>
      <div class="card"><div class="card-head"><h3>${icon('flag')} الأخطاء الشهرية</h3></div><div class="card-body">${vbars(months.map((m) => ({ label: m.slice(5), value: E.filter((e) => (e.at || '').startsWith(m)).length, alt: true })))}<p class="muted small">الهدف: اتجاه تنازلي شهرًا بعد شهر.</p></div></div>
      <div class="card"><div class="card-head"><h3>${icon('grid')} العبء والجودة حسب الإدارة</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>الإدارة</th><th>مهام مفتوحة</th><th>منجزة</th><th>الأخطاء</th></tr></thead><tbody>${Object.entries(cfg().depts).map(([k, d]) => { const t = T.filter((x) => (S.staff[x.assignee] || {}).dept === k); return html`<tr><td><span class="dot-c" style="background:${raw(d.color)}"></span> ${d.name}</td><td class="num">${t.filter((x) => x.status !== 'done').length}</td><td class="num">${t.filter((x) => x.status === 'done').length}</td><td class="num">${E.filter((e) => e.dept === k).length}</td></tr>`; })}</tbody></table></div></div>
      <div class="card"><div class="card-head"><h3>${icon('heart')} حسب الجهة المانحة</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>المانح</th><th>المشاريع</th><th>المستفيدون</th>${can('finance.view') ? html`<th>المنح</th>` : ''}</tr></thead><tbody>${grp((p) => p.donor).map(([k, v]) => html`<tr><td>${k}</td><td class="num">${v.n}</td><td class="num">${fmtNum(v.ben)}</td>${can('finance.view') ? html`<td>${money(v.grant)}</td>` : ''}</tr>`)}</tbody></table></div></div>
      <div class="card"><div class="card-head"><h3>${icon('target')} حسب القطاع</h3></div><div class="card-body">${bars(grp((p) => p.sector).map(([k, v]) => ({ label: k, value: v.n })))}</div></div></div>`;
}

// ---------- guide
function pGuide() {
  const tab = UI.tabs.guide || 'start';
  const who = (a) => ({ gm: 'الإدارة العامة', secretariat: 'السكرتارية', projects: 'المشاريع', logistics: 'اللوجستيات', finance: 'المالية', media: 'الإعلام', '@sector': 'القطاع المختص', '@assignee': 'الموظف المكلف' }[a]);
  const table = (list) => html`<div class="table-wrap"><table class="t"><thead><tr><th>الرقم</th><th>العملية</th><th>من</th><th>إلى</th><th>من ينفّذها في النظام</th></tr></thead><tbody>${list.map((s) => html`<tr><td><span class="step-n">${s.n}</span></td><td><b>${s.title}</b>${s.approval ? html` <span class="badge orange">اعتماد المدير العام</span>` : ''}</td><td class="small">${s.from}</td><td class="small">${s.to}</td><td class="small">${s.actors.map(who).join(' / ')}</td></tr>`)}</tbody></table></div>`;
  return html`${pageHead('دليل العمليات والاستخدام', 'دليل العمليات الإدارية (الإصدار الأول – نوفمبر 2026) مدمجًا في النظام', '', 'book')}
    ${tabs([{ id: 'start', label: 'ابدأ هنا', icon: 'sparkles' }, { id: 'manual', label: 'دليل العمليات الإدارية', icon: 'book' }, { id: 'owner', label: 'دليل المضيف الرئيسي', icon: 'crown', show: S.isOwner }], tab, 'data-gtab')}
    <div class="card card-pad guide">${tab === 'start' ? html`<h2>هذه بيئة عملك الجديدة</h2><p>كل مشروع وطلب يمر بمراحل محددة كما في دليل العمليات، ولكل مرحلة مسؤول واضح، ولا تنتقل إلى التالية إلا بتأكيد مكتوب.</p>
      <ol><li><b>لوحة التحكم</b>: تعرض «بانتظار إجرائك الآن». ابدأ يومك منها.</li><li><b>الإشعارات</b>: كل مرحلة تصلك، أو خطأ يُقيَّد عليك، أو مهمة تُسند إليك، أو إشارة باسمك.</li><li><b>إنجاز المرحلة</b>: افتح المشروع، وأشّر على التأكيدات المطلوبة، ثم اضغط «إنجاز المرحلة».</li><li><b>ساحة النقاش</b>: قنوات عامة وقناة لإدارتك. اكتب @ ثم اسم زميلك للإشارة إليه.</li><li><b>المهام</b>: لوحة كانبان لمهامك اليومية.</li><li><b>الأخطاء</b>: إذا أُرجع إليك عمل فاقرأ وصف الخطأ وصحّحه ثم أنجز المرحلة مجددًا.</li></ol>`
    : tab === 'manual' ? html`<div class="section-title">القواعد العامة</div><ul>${GENERAL_RULES.map((r) => html`<li>${r}</li>`)}</ul>
      <div class="section-title">أولًا: العمليات الإدارية للمشاريع</div>${table(PROJECT_STAGES)}<div class="section-title">ثانيًا: العمليات الإدارية للطلبات</div>${table(REQUEST_STAGES)}
      <div class="section-title">ثالثًا: العمليات الاستثنائية</div><h3>(أ) إرجاع الأخطاء وتقييدها</h3><p>زر «إرجاع لتصحيح خطأ» يعيد العمل إلى المرحلة التي وقع فيها الخطأ، ويقيّد اسم الخطأ والقطاع والشخص المسؤول والمرحلة في سجل الأخطاء الشهري تلقائيًا.</p>
      <h3>(ب) عمليات الموردين</h3><p><b>المشاريع الكبيرة:</b> عقود موقّعة من المدير العام قبل الإخلاءات (المرحلة 13). <b>المشاريع الصغيرة:</b> توريد مباشر دون عقود، ومحاسبة الموردين عبر المطالبات والصرف (العمليتان 11 و 12).</p>`
    : html`<h2>أنت المضيف الرئيسي</h2><h3>١. دعوة الموظفين</h3><ol><li>اضغط زر <b>مشاركة (Share)</b> أعلى هذه الصفحة في Claude.</li><li>أضف بريد الموظف واختر صلاحية <b>محرر (Editor)</b> حتى يستطيع إدخال البيانات. (في حسابات Team يكفي «مساهم Contributor»).</li><li>يحتاج الموظف حساب Claude مجانيًا بنفس البريد.</li><li>عند فتحه الرابط يرسل «طلب انضمام»، فيظهر لك في صفحة <a href="#staff">الموظفون والصلاحيات</a>.</li><li>اقبل الطلب وحدد إدارته ودوره، فتُفتح له مساحته مباشرة.</li></ol>
      <h3>٢. الصلاحيات</h3><p>الصلاحية = <b>الإدارة</b> (أين يدخل) + <b>الدور</b> (ماذا يفعل) + استثناءات فردية. عدّلها من <a href="#matrix">مصفوفة الصلاحيات</a>.</p>
      <h3>٣. ملاحظة أمان مهمة</h3><p>في هذه النسخة، كل من شاركته الصفحة يستطيع تقنيًا قراءة جميع بياناتها، وإخفاء التبويبات تنظيمي. أما من يُشارَك بصلاحية «محرر» فيستطيع أيضًا تعديل الصفحة نفسها. لذلك لا تشارك الرابط إلا مع موظفين موثوقين، وأوقف حساب من يغادر <b>وأزله من قائمة المشاركة</b> في Claude أيضًا. إذا احتجتم لاحقًا حماية صارمة بين الإدارات فالنسخة الكاملة (الخادم) جاهزة في المستودع.</p>`}</div>`;
}

// ---------- admin (owner)
function pStaff() {
  const pend = Object.entries(S.join).filter(([k, v]) => v && !S.staff[k]).map(([id, v]) => ({ id, ...v }));
  const list = vals(S.staff).sort((a, b) => (a.active === false) - (b.active === false) || (a.dept || '').localeCompare(b.dept || ''));
  return html`${pageHead('الموظفون والصلاحيات', 'اقبل طلبات الانضمام، ووزّع الإدارات والأدوار، وأوقف من يغادر', html`<button class="btn" data-act="addBySearch">${icon('plus')} إضافة زميل من مؤسستك</button>`, 'users')}
    <div class="card card-pad" style="margin-bottom:16px"><b>${icon('send', 'width="18" style="vertical-align:-4px;color:var(--orange)"')} كيف تضيف موظفًا؟</b><ol class="small" style="margin:6px 0 0;line-height:2"><li>اضغط زر <b>مشاركة (Share)</b> أعلى هذه الصفحة في Claude، وأضف بريد الموظف بصلاحية <b>محرر (Editor)</b>.</li><li>يفتح الموظف الرابط بحساب Claude (مجاني) ويرسل طلب الانضمام.</li><li>يظهر طلبه هنا، فتقبله وتحدد إدارته ودوره.</li></ol></div>
    ${pend.length ? html`<div class="card" style="margin-bottom:16px;border-color:var(--orange)"><div class="card-head"><h3>${icon('bell')} طلبات انضمام بانتظار موافقتك</h3><span class="badge solid">${pend.length}</span></div>
      ${pend.map((j) => html`<div class="list-item"><div class="body"><b>${j.name}</b><div class="meta">${j.title || ''} · طلب إدارة: ${deptName(j.dept)} · ${j.phone || ''} · ${ago(j.at)}</div></div><button class="btn sm primary" data-act="approveJoin" data-id="${j.id}">${icon('check')} قبول وتحديد الصلاحيات</button><button class="btn sm danger" data-act="delDoc" data-path="join/${j.id}">رفض</button></div>`)}</div>` : ''}
    <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>الموظف</th><th>الإدارة</th><th>الدور</th><th>استثناءات</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${list.map((s) => html`<tr style="${s.active === false ? 'opacity:.55' : ''}"><td><div class="row" style="flex-wrap:nowrap">${av(s.id, 'sm')}<div><b>${s.name}</b><div class="muted small">${s.title || ''}</div></div></div></td><td>${deptName(s.dept)}</td><td><span class="badge ${s.role === 'owner' ? 'solid' : s.role === 'gm' ? 'green' : ''}">${roleName(s)}</span></td>
        <td>${(s.extra || []).length ? html`<span class="badge green">+${s.extra.length}</span>` : ''} ${(s.denied || []).length ? html`<span class="badge red">−${s.denied.length}</span>` : ''}</td><td>${s.active === false ? html`<span class="badge red">موقوف</span>` : html`<span class="badge green">نشط</span>`}</td>
        <td class="nowrap">${s.role !== 'owner' ? html`<button class="btn sm" data-act="editStaff" data-id="${s.id}">${icon('edit')} تعديل</button> <button class="btn sm ${s.active === false ? '' : 'danger'}" data-act="toggleStaff" data-id="${s.id}">${s.active === false ? 'تفعيل' : 'إيقاف'}</button>` : html`<button class="btn sm" data-act="editStaff" data-id="${s.id}">${icon('edit')} بياناتي</button>`}</td></tr>`)}</tbody></table></div></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>${icon('eye')} خريطة الوصول: من يدخل ماذا</h3></div>${accessMap()}</div>`;
}
function accessMap() {
  const MODS = [['projects.view', 'المشاريع'], ['requests.view_all', 'كل الطلبات'], ['logistics.view', 'اللوجستيات'], ['finance.view', 'المالية'], ['media.view', 'الإعلام'], ['secretariat.view', 'السكرتارية'], ['workflow.approve', 'الاعتماد'], ['workflow.return', 'الإرجاع'], ['errors.view', 'سجل الأخطاء'], ['reports.view', 'التقارير'], ['announcements.publish', 'التعميمات']];
  return html`<div class="table-wrap"><table class="t matrix"><thead><tr><th>الموظف</th>${MODS.map(([, l]) => html`<th class="vert">${l}</th>`)}</tr></thead><tbody>${activeStaff().map((s) => { const p = permsOf(s.id); return html`<tr><td><b>${s.name}</b><div class="muted small">${deptName(s.dept)} · ${roleName(s)}</div></td>${MODS.map(([k]) => html`<td>${p.has(k) ? html`<span class="yes">●</span>` : html`<span class="no">○</span>`}</td>`)}</tr>`; })}</tbody></table></div>`;
}
function pMatrix() {
  const view = UI.tabs.matrix || 'roles'; const c = cfg();
  const cols = view === 'roles' ? Object.entries(c.roles).map(([k, v]) => ({ k, ...v })) : Object.entries(c.depts).map(([k, v]) => ({ k, ...v }));
  const groups = {}; for (const p of PERMS) (groups[p[0]] = groups[p[0]] || []).push(p);
  return html`${pageHead('مصفوفة الصلاحيات', 'تحكّم كامل بمن يدخل أين ومن يفعل ماذا. كل تغيير يُحفظ فورًا ويسري على الجميع.', '', 'shield')}
    <div class="card card-pad" style="margin-bottom:16px"><div class="grid g3"><div><b style="color:var(--green-700)">① الإدارة = المجال</b><p class="muted small" style="margin:4px 0 0">موظف المالية يرى تبويب المالية فقط، وموظف اللوجستيات يرى اللوجستيات فقط.</p></div><div><b style="color:var(--green-700)">② الدور = المستوى</b><p class="muted small" style="margin:4px 0 0">موظف ينفّذ، مدير إدارة يُسند ويُرجع، المدير العام يعتمد، مدقق يطّلع فقط.</p></div><div><b style="color:var(--green-700)">③ الاستثناء الفردي</b><p class="muted small" style="margin:4px 0 0">من صفحة الموظفين: امنح شخصًا صلاحية إضافية أو امنعه منها.</p></div></div></div>
    ${tabs([{ id: 'roles', label: 'صلاحيات الأدوار (المستوى)', icon: 'shield' }, { id: 'depts', label: 'صلاحيات الإدارات (المجال)', icon: 'grid' }], view, 'data-mtab')}
    <div class="card"><div class="table-wrap" style="max-height:72vh"><table class="t matrix"><thead><tr><th style="min-width:240px">الصلاحية</th>${cols.map((x) => html`<th class="vert">${x.name}</th>`)}</tr></thead><tbody>
      ${Object.entries(groups).map(([g, list]) => html`<tr class="grp"><td colspan="${cols.length + 1}">${g}</td></tr>${list.map((p) => html`<tr><td class="small">${p[2]}</td>${cols.map((x) => html`<td><input type="checkbox" data-change="matrix" data-kind="${view}" data-k="${x.k}" data-p="${p[1]}" ${(x.perms || []).includes(p[1]) ? raw('checked') : ''}></td>`)}</tr>`)}`)}
    </tbody></table></div></div>`;
}
function pDepts() {
  const c = cfg();
  return html`${pageHead('الإدارات والأقسام', 'الهيكل التنظيمي. الإدارات الست الأساسية مرتبطة بسير العمل في دليل العمليات.', html`<button class="btn primary" data-act="dept">${icon('plus')} إدارة / قسم جديد</button>`, 'grid')}
    <div class="grid g3">${Object.entries(c.depts).map(([k, d]) => { const ppl = activeStaff().filter((s) => s.dept === k); return html`<div class="card" style="border-top:4px solid ${raw(d.color || '#999')}"><div class="card-head"><h3><span class="dot-c" style="background:${raw(d.color || '#999')}"></span> ${d.name}</h3><span class="badge">${ppl.length} موظف</span></div>
      <div class="card-body"><div class="small muted">${ppl.map((s) => s.name).join('، ') || 'لا يوجد موظفون'}</div><div class="row" style="margin-top:10px"><button class="btn sm" data-act="dept" data-id="${k}">${icon('edit')} تعديل</button>${CORE_DEPTS.includes(k) ? html`<span class="badge green">أساسية</span>` : ''}</div></div></div>`; })}</div>`;
}
function pProfile() {
  const s = me(); const groups = {}; const p = permsOf(S.uid);
  for (const x of PERMS) if (S.isOwner || p.has(x[1])) (groups[x[0]] = groups[x[0]] || []).push(x[2]);
  return html`${pageHead('ملفي', 'بياناتك وصلاحياتك الحالية', '', 'user')}
    <div class="grid g2"><div class="card card-pad"><div class="row">${av(S.uid, 'lg')}<div><h3>${s.name}</h3><div class="muted">${s.title || ''}</div><span class="badge green">${roleName(s)}</span> <span class="badge">${deptName(s.dept)}</span></div></div>
      <form class="stack" style="margin-top:16px" data-submit="profile"><div class="field"><label for="pf-phone">الهاتف</label><input id="pf-phone" name="phone" dir="ltr" value="${s.phone || ''}"></div><button class="btn"${S.isOwner ? '' : raw(' disabled title="يعدّلها المضيف الرئيسي"')}>حفظ</button>${S.isOwner ? '' : html`<p class="muted small">بياناتك يعدّلها المضيف الرئيسي.</p>`}</form></div>
      <div class="card card-pad"><h3 style="margin-bottom:10px">صلاحياتي ${S.isOwner ? html`<span class="badge solid">كل الصلاحيات</span>` : ''}</h3><div class="grid g2">${Object.entries(groups).map(([g, l]) => html`<div><b class="small" style="color:var(--green-700)">${g}</b><ul class="small" style="margin:4px 0;padding-inline-start:18px">${l.map((x) => html`<li>${x}</li>`)}</ul></div>`)}</div></div></div>`;
}

// ------------------------------------------------------------ ACTIONS
const staffOptions = (filter) => activeStaff().filter(filter || (() => true)).map((s) => [s.id, `${s.name} — ${deptName(s.dept)}`]);
const deptOptions = () => Object.entries(cfg().depts).map(([k, d]) => [k, d.name]);
const supOptions = () => vals(S.suppliers).filter((s) => s.active !== false).map((s) => [s.id, s.name]);
const PRIO = [['normal', 'عادية'], ['high', 'مرتفعة'], ['urgent', 'عاجلة']];

function permOverrides(s) {
  const groups = {}; for (const p of PERMS) (groups[p[0]] = groups[p[0]] || []).push(p);
  return html`<div class="field full"><label>استثناءات الصلاحيات لهذا الموظف (تتجاوز الدور والإدارة)</label><div style="max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:10px"><table class="t"><tbody>
    ${Object.entries(groups).map(([g, list]) => html`<tr><td colspan="2" style="background:var(--green-50);font-weight:700;color:var(--green-700)">${g}</td></tr>${list.map((p) => { const v = (s.extra || []).includes(p[1]) ? 'grant' : (s.denied || []).includes(p[1]) ? 'deny' : ''; return html`<tr><td class="small">${p[2]}</td><td style="width:165px"><select class="input" style="padding:3px 6px;font-size:12.5px" data-ov="${p[1]}"><option value="" ${v === '' ? raw('selected') : ''}>حسب الدور والإدارة</option><option value="grant" ${v === 'grant' ? raw('selected') : ''}>✚ منح إضافي</option><option value="deny" ${v === 'deny' ? raw('selected') : ''}>⛔ منع</option></select></td></tr>`; })}`)}
  </tbody></table></div></div>`;
}
function staffForm(uid, base, isJoin) {
  const s = base || {}; const owner = s.role === 'owner';
  formModal({ title: isJoin ? `قبول: ${s.name}` : `تعديل: ${s.name}`, wide: !owner, submit: isJoin ? 'قبول وتفعيل الحساب' : 'حفظ', fields: [
    { name: 'name', label: 'الاسم الكامل', required: true, value: s.name }, { name: 'title', label: 'المسمى الوظيفي', value: s.title },
    ...(owner ? [] : [{ name: 'dept', label: 'الإدارة (أين يدخل)', type: 'select', required: true, value: s.dept, options: deptOptions() }, { name: 'role', label: 'الدور (ماذا يفعل)', type: 'select', required: true, empty: false, value: s.role || 'officer', options: Object.entries(cfg().roles).map(([k, r]) => [k, r.name]) }]),
    { name: 'phone', label: 'الهاتف', dir: 'ltr', value: s.phone },
    ...(owner ? [] : [{ name: 'ov', type: 'html', full: true, html: permOverrides(s) }]),
  ], onSubmit: async (v, m) => {
    const extra = []; const denied = [];
    m.el.querySelectorAll('[data-ov]').forEach((x) => { if (x.value === 'grant') extra.push(x.dataset.ov); if (x.value === 'deny') denied.push(x.dataset.ov); });
    const doc = { name: v.name, title: v.title || '', phone: v.phone || '', dept: owner ? 'gm' : v.dept, role: owner ? 'owner' : v.role, extra, denied, active: s.active !== false, at: s.at || now() };
    await W('staff/' + uid, doc, 'set');
    if (isJoin) await W('join/' + uid, null, 'delete').catch(() => {});
    toast(isJoin ? 'تم قبول الموظف وفتح مساحته ✔' : 'تم الحفظ', 'ok');
  } });
}

function returnForm(type, e) {
  const defs = DEFS[type];
  formModal({ title: 'إرجاع لتصحيح خطأ — العملية الاستثنائية (أ)', submit: 'إرجاع وقيد الخطأ',
    intro: html`<div class="note-box" style="margin-bottom:12px">يعود العمل إلى المرحلة التي وقع فيها الخطأ، ويُقيَّد الخطأ تلقائيًا في <b>سجل الأخطاء الشهري</b> باسم الخطأ والقطاع والشخص المسؤول والمرحلة.</div>`,
    fields: [
      { name: 'to', label: 'المرحلة التي وقع فيها الخطأ', type: 'select', required: true, empty: false, value: e.stage, options: defs.filter((s) => s.n <= e.stage).map((s) => [s.n, `${s.n}. ${s.title}`]) },
      { name: 'name', label: 'اسم الخطأ', required: true, placeholder: 'مثال: نقص صور التوزيع' }, { name: 'desc', label: 'وصف الخطأ والتصحيح المطلوب', type: 'textarea' },
      { name: 'dept', label: 'القطاع المسؤول', type: 'select', empty: 'تلقائي حسب المرحلة', options: deptOptions() }, { name: 'resp', label: 'الشخص المسؤول', type: 'select', empty: 'غير محدد', options: staffOptions() },
      { name: 'sev', label: 'درجة الخطأ', type: 'select', empty: false, value: 'medium', options: [['low', 'بسيط'], ['medium', 'متوسط'], ['high', 'جسيم']] },
    ], onSubmit: async (v) => {
      const to = Number(v.to); const target = defs[to - 1]; const a0 = target.actors[0];
      const dept = v.dept || (a0 === '@sector' ? e.sector : a0 === '@assignee' ? (S.staff[e.assignee] || {}).dept : a0);
      const resp = v.resp || (a0 === '@assignee' ? e.assignee : null);
      await W('errors/' + nid(), { etype: type, eid: e.id, etitle: `${e.code} — ${e.title}`, stage: to, stageTitle: target.title, name: v.name, desc: v.desc || '', dept: dept || null, resp: resp || null, by: S.uid, sev: v.sev, status: 'open', at: now() }, 'set');
      const clear = {}; for (const k of Object.keys(checksOf(e))) if (Number(k.split(':')[0]) >= to) clear[k] = null;
      await W(`${COLL[type]}/${e.id}`, { stage: to, stageStatus: 'active', stageAt: now(), checks: clear, events: evt(to, 'returned', `إرجاع إلى المرحلة ${to} لتصحيح خطأ: ${v.name}${v.desc ? ' — ' + v.desc : ''}`) });
      toast('تم الإرجاع وقيد الخطأ', 'ok');
    } });
}

function projectForm(p) {
  formModal({ title: p ? 'تعديل بيانات المشروع' : 'تسجيل مشروع معتمد من الجهة المانحة', wide: true, submit: p ? 'حفظ' : 'تسجيل المشروع',
    intro: p ? '' : html`<div class="note-box" style="margin-bottom:14px">هذه <b>العملية رقم 1</b>: وصول اعتماد المشروع من الجهة المانحة إلى المدير العام.</div>`,
    fields: [
      { name: 'title', label: 'اسم المشروع', required: true, full: true, value: p?.title }, { name: 'donor', label: 'الجهة المانحة', value: p?.donor, placeholder: 'مثال: هيئة الإغاثة التركية' },
      { name: 'sector', label: 'القطاع', type: 'select', value: p?.sector, options: ['الأمن الغذائي', 'الإيواء', 'المياه والإصحاح', 'التعليم', 'الصحة', 'رعاية الأيتام', 'سبل العيش', 'البناء والتعمير', 'الموسمية (رمضان/أضاحي)', 'أخرى'].map((x) => [x, x]) },
      { name: 'location', label: 'موقع التنفيذ', value: p?.location, placeholder: 'المحافظة – المديرية' }, { name: 'approvalDate', label: 'تاريخ ورود الاعتماد', type: 'date', value: p ? p.approvalDate : todayStr() },
      { name: 'grant', label: 'مبلغ المنحة', type: 'number', step: '0.01', min: 0, value: p?.grant }, { name: 'currency', label: 'العملة', type: 'select', empty: false, value: p?.currency || 'USD', options: [['USD', 'دولار أمريكي'], ['TRY', 'ليرة تركية'], ['SAR', 'ريال سعودي'], ['YER', 'ريال يمني'], ['EUR', 'يورو']] },
      { name: 'ben', label: 'عدد المستفيدين', type: 'number', min: 0, value: p?.ben }, { name: 'size', label: 'حجم المشروع', type: 'select', empty: false, value: p?.size || 'small', options: [['small', 'صغير (توريد مباشر)'], ['large', 'كبير (عقود موردين – العملية ب)']] },
      { name: 'priority', label: 'الأولوية', type: 'select', empty: false, value: p?.priority || 'normal', options: PRIO }, ...(p ? [{ name: 'endDate', label: 'تاريخ الانتهاء المتوقع', type: 'date', value: p.endDate }] : []),
      { name: 'desc', label: 'وصف المشروع ومخرجاته', type: 'textarea', value: p?.desc },
    ], onSubmit: async (v) => {
      if (p) {
        const upd = { ...v, events: evt(p.stage, 'edit', 'تحديث بيانات المشروع') };
        if (p.feePct != null && v.grant != null) { upd.fee = Math.round(v.grant * p.feePct) / 100; upd.net = Math.round((v.grant - upd.fee) * 100) / 100; }
        await W('projects/' + p.id, upd); toast('تم الحفظ', 'ok'); return;
      }
      const id = 'p' + nid(); const code = nextCode('project');
      await W('projects/' + id, { ...v, code, stage: 1, stageStatus: 'active', stageAt: now(), status: 'active', createdBy: S.uid, createdAt: now(), feePct: null, checks: {}, quotes: {}, contracts: {}, claims: {}, txs: {}, media: {}, files: {}, events: evt(1, 'created', 'تسجيل اعتماد المشروع في النظام') }, 'set');
      toast('تم تسجيل المشروع ' + code, 'ok'); location.hash = '#project-' + id;
    } });
}

function bindGlobal() {
  const root = document.getElementById('root');
  const A = {
    menu: () => document.getElementById('sidebar').classList.toggle('open'),
    go: (el) => { location.hash = el.dataset.href; },
    prjFilter: (el) => { UI.prj.f = el.dataset.v; schedule(); }, prjView: (el) => { UI.prj.view = el.dataset.v; schedule(); }, reqFilter: (el) => { UI.req.f = el.dataset.v; schedule(); },
    tab: (el) => { UI.tabs[el.dataset.k] = el.dataset.v; schedule(); },
    toggleStage: (el) => { UI.open[el.dataset.k] = el.dataset.open !== '1'; schedule(); },
    notifSeen: () => saveMine({ notifSeen: now() }),
    newProject: () => projectForm(null), editProject: (el) => projectForm(entity('project', el.dataset.id)),
    editPlan: (el) => { const p = entity('project', el.dataset.id); formModal({ title: 'خطة التنفيذ', fields: [{ name: 'execDate', label: 'موعد التنفيذ', type: 'date', required: true, value: p.execDate }, { name: 'planBudget', label: 'ميزانية ومصاريف التنفيذ', type: 'number', step: '0.01', required: true, value: p.planBudget }, { name: 'planWages', label: 'الأجور التشغيلية', type: 'number', step: '0.01', value: p.planWages }, { name: 'planNotes', label: 'تفاصيل الخطة (الأنشطة، الفريق، آلية التوزيع، معايير الاستهداف)', type: 'textarea', rows: 6, value: p.planNotes }], onSubmit: async (v) => { await W('projects/' + p.id, { ...v, events: evt(p.stage, 'edit', 'تحديث خطة التنفيذ') }); toast('تم حفظ الخطة', 'ok'); } }); },
    setFee: (el) => { const p = entity('project', el.dataset.id); formModal({ title: 'خصم المخصص الإداري', intro: html`<p class="muted" style="margin-top:0">المعتمد للتنفيذ = المنحة − (المنحة × النسبة)، يُحسب تلقائيًا.</p>`, fields: [{ name: 'feePct', label: 'نسبة المخصص الإداري %', type: 'number', step: '0.1', min: 0, max: 100, required: true, value: p.feePct ?? 7 }], onSubmit: async (v) => { const g = Number(p.grant) || 0; const fee = Math.round(g * v.feePct) / 100; await W('projects/' + p.id, { feePct: v.feePct, fee, net: Math.round((g - fee) * 100) / 100, events: evt(p.stage, 'edit', `تحديد المخصص الإداري ${v.feePct}%`) }); toast('تم تحديد المبلغ المعتمد للتنفيذ', 'ok'); } }); },
    mediaLink: (el) => { const p = entity('project', el.dataset.id); formModal({ title: 'الرابط المعتمد للتوثيقات', fields: [{ name: 'mediaLink', label: 'الرابط', dir: 'ltr', value: p.mediaLink, placeholder: 'https://' }], onSubmit: async (v) => { if (v.mediaLink && !/^https?:\/\//i.test(v.mediaLink)) throw new Error('الرابط يجب أن يبدأ بـ https://'); await W('projects/' + p.id, { mediaLink: v.mediaLink || null, events: evt(p.stage, 'edit', 'تحديث رابط التوثيقات') }); } }); },
    addQuote: (el) => { if (!supOptions().length) return toast('أضف الموردين أولًا من صفحة اللوجستيات ← سجل الموردين', 'err'); const p = entity('project', el.dataset.id); formModal({ title: 'إضافة عرض سعر', fields: [{ name: 'supplier', label: 'المورد', type: 'select', required: true, options: supOptions() }, { name: 'amount', label: 'إجمالي العرض', type: 'number', step: '0.01', required: true }, { name: 'days', label: 'مدة التوريد (أيام)', type: 'number' }, { name: 'details', label: 'تفاصيل وبنود العرض', type: 'textarea' }], onSubmit: async (v) => { await W('projects/' + p.id, { quotes: { [nid()]: { ...v, selected: false, by: S.uid, at: now() } }, events: evt(p.stage, 'quote', `إضافة عرض سعر بمبلغ ${fmtNum(v.amount)}`) }); } }); },
    selectQuote: async (el) => { const p = entity('project', el.dataset.id); const qs = vals(p.quotes); const q = qs.find((x) => x.id === el.dataset.c); const low = Math.min(...qs.map((x) => x.amount)); const doSel = async (reason) => { const upd = {}; for (const x of qs) upd[x.id] = { selected: x.id === q.id, ...(x.id === q.id && reason ? { reason } : {}) }; await W('projects/' + p.id, { quotes: upd, events: evt(p.stage, 'quote_selected', `اعتماد عرض بمبلغ ${fmtNum(q.amount)}${reason ? ' — مبرر: ' + reason : ' (أقل عرض)'}`) }); }; if (q.amount <= low) return doSel(null); formModal({ title: 'اعتماد عرض ليس الأقل سعرًا', intro: html`<div class="gate" style="margin-bottom:12px">القاعدة اعتماد أقل عرض سعر. الاستثناء يتطلب مبررًا مكتوبًا يُحفظ في السجل.</div>`, fields: [{ name: 'reason', label: 'مبرر الاستثناء', type: 'textarea', required: true }], onSubmit: (v) => doSel(v.reason) }); },
    delQuote: async (el) => { if (await confirmBox('حذف العرض؟', { danger: true })) await W('projects/' + el.dataset.id, { quotes: { [el.dataset.c]: null } }); },
    addContract: (el) => { const p = entity('project', el.dataset.id); formModal({ title: 'إعداد عقد مورد', fields: [{ name: 'title', label: 'عنوان العقد', required: true, full: true, value: 'عقد توريد – ' + p.title }, { name: 'supplier', label: 'المورد', type: 'select', required: true, options: supOptions() }, { name: 'amount', label: 'قيمة العقد', type: 'number', step: '0.01' }, { name: 'quantities', label: 'الكميات والأسعار ومواعيد التوريد', type: 'textarea' }], onSubmit: async (v) => { await W('projects/' + p.id, { contracts: { [nid()]: { ...v, status: 'pending', by: S.uid, at: now() } }, events: evt(p.stage, 'contract', `إعداد عقد: ${v.title} — رُفع للمدير العام لتوقيعه`) }); toast('رُفع العقد للمدير العام', 'ok'); } }); },
    signContract: async (el) => { const v = el.dataset.v; await W('projects/' + el.dataset.id, { contracts: { [el.dataset.c]: { status: v, signedBy: S.uid, signedAt: now() } }, events: evt(null, v === 'signed' ? 'contract_signed' : 'contract_rejected', '') }); },
    addClaim: (el) => { const p = entity('project', el.dataset.id); const sel = vals(p.quotes).find((x) => x.selected); formModal({ title: 'تقديم مطالبة مورد', fields: [{ name: 'supplier', label: 'المورد', type: 'select', required: true, value: sel && sel.supplier, options: supOptions() }, { name: 'amount', label: 'المبلغ المستحق', type: 'number', step: '0.01', required: true }, { name: 'desc', label: 'مقابل (المواد التي تم توريدها)', type: 'textarea' }], onSubmit: async (v) => { await W('projects/' + p.id, { claims: { [nid()]: { ...v, status: 'submitted', lOk: false, fOk: false, by: S.uid, at: now() } }, events: evt(p.stage, 'claim', `مطالبة مورد بمبلغ ${fmtNum(v.amount)}`) }); } }); },
    pay: (el) => { const p = entity('project', el.dataset.id); const c = p.claims[el.dataset.c]; formModal({ title: 'صرف مستحقات المورد (العملية 12)', submit: 'تسجيل الصرف', fields: [{ name: 'cheque', label: 'رقم الشيك', required: true, dir: 'ltr' }, { name: 'bank', label: 'البنك', required: true }, { name: 'h', type: 'html', full: true, html: html`<div class="note-box">خذ سندات الاستلام والفواتير من المورد وأرفقها في تبويب المرفقات.</div>` }], onSubmit: async (v) => { const sn = (S.suppliers[c.supplier] || {}).name || ''; await W('projects/' + p.id, { claims: { [el.dataset.c]: { status: 'paid', cheque: v.cheque, bank: v.bank, paidAt: now(), paidBy: S.uid } }, txs: { [nid()]: { type: 'expense', cat: 'supplier', amount: c.amount, desc: 'صرف مستحقات المورد ' + sn, ref: `شيك ${v.cheque} — ${v.bank}`, date: todayStr(), by: S.uid } }, events: evt(null, 'payment', `صرف ${fmtNum(c.amount)} للمورد ${sn} بشيك ${v.cheque}`) }); toast('تم تسجيل الصرف', 'ok'); } }); },
    addTx: (el) => { const p = entity('project', el.dataset.id); formModal({ title: 'حركة مالية على المشروع', fields: [{ name: 'type', label: 'النوع', type: 'select', required: true, empty: false, options: [['income', 'وارد (دفعة منحة)'], ['expense', 'منصرف']] }, { name: 'amount', label: 'المبلغ', type: 'number', step: '0.01', required: true }, { name: 'date', label: 'التاريخ', type: 'date', value: todayStr() }, { name: 'ref', label: 'المرجع (رقم سند/شيك)' }, { name: 'desc', label: 'البيان', type: 'textarea' }], onSubmit: async (v) => { await W('projects/' + p.id, { txs: { [nid()]: { ...v, by: S.uid } } }); } }); },
    addMedia: (el) => { const p = entity('project', el.dataset.id); formModal({ title: 'تغطية إعلامية', fields: [{ name: 'title', label: 'العنوان', required: true, value: 'تغطية يوم التنفيذ' }, { name: 'date', label: 'الموعد', type: 'date', value: p.execDate }, { name: 'reporter', label: 'الإعلامي المكلف', type: 'select', options: staffOptions((s) => s.dept === 'media') }], onSubmit: async (v) => { await W('projects/' + p.id, { media: { [nid()]: { ...v, status: 'planned', by: S.uid, at: now() } } }); } }); },
    complete: (el) => {
      const type = el.dataset.type; const e = entity(type, el.dataset.id); const s = DEFS[type][e.stage - 1]; const ck = checksOf(e);
      const miss = s.checks.filter((c) => !ck[s.n + ':' + c.id]);
      if (miss.length) return toast('لا يُعتمد الانتقال إلا بتأكيد مكتوب. الناقص: ' + miss.map((m) => m.label).join(' | '), 'err');
      const g = gateProblem(type, e, s.gate); if (g) return toast(g, 'err');
      formModal({ title: `إنجاز المرحلة ${s.n}`, submit: s.approval ? 'رفع للاعتماد' : 'تأكيد الإنجاز', intro: html`<div class="note-box" style="margin-bottom:12px"><b>المخرج المطلوب:</b> ${s.output}<br>تظهر للجهة المستلمة (${s.to}) وللمدير العام فورًا.</div>`, fields: [{ name: 'note', label: 'ملاحظة الإنجاز (اختياري)', type: 'textarea', placeholder: s.output }],
        onSubmit: async (v) => {
          if (s.approval) await W(`${COLL[type]}/${e.id}`, { stageStatus: 'approval', events: evt(s.n, 'submitted', v.note || 'رُفعت المرحلة للاعتماد') });
          else await W(`${COLL[type]}/${e.id}`, advanceData(type, e, evt(s.n, 'completed', v.note || s.output)));
          toast(s.approval ? 'رُفعت المرحلة للاعتماد' : 'تم إنجاز المرحلة ✔', 'ok');
        } });
    },
    approve: (el) => {
      const type = el.dataset.type; const e = entity(type, el.dataset.id); const s = DEFS[type][e.stage - 1];
      formModal({ title: 'اعتماد المرحلة', submit: 'اعتماد', fields: [{ name: 'note', label: 'ملاحظة الاعتماد (اختياري)', type: 'textarea' }], onSubmit: async (v) => {
        const data = advanceData(type, e, evt(s.n, 'approved', v.note || 'اعتماد: ' + s.output));
        if (type === 'project' && s.n === 11) { data.claims = {}; for (const c of vals(e.claims)) if (c.status === 'submitted') data.claims[c.id] = { status: 'approved', approvedBy: S.uid, approvedAt: now() }; }
        await W(`${COLL[type]}/${e.id}`, data); toast('تم الاعتماد ✔', 'ok');
      } });
    },
    return: (el) => returnForm(el.dataset.type, entity(el.dataset.type, el.dataset.id)),
    comment: (el) => { const type = el.dataset.type; const e = entity(type, el.dataset.id); formModal({ title: 'إضافة ملاحظة على السجل', submit: 'إضافة', fields: [{ name: 'note', label: 'الملاحظة', type: 'textarea', required: true }], onSubmit: async (v) => { await W(`${COLL[type]}/${e.id}`, { events: evt(e.stage, 'comment', v.note) }); } }); },
    delEntity: async (el) => { if (await confirmBox('حذف هذا الملف وكل بياناته نهائيًا؟ لا يمكن التراجع.', { danger: true, ok: 'حذف نهائي' })) { await W(`${COLL[el.dataset.type]}/${el.dataset.id}`, null, 'delete'); location.hash = '#' + COLL[el.dataset.type]; } },
    delDoc: async (el) => { if (await confirmBox('تأكيد الحذف؟', { danger: true, ok: 'حذف' })) await W(el.dataset.path, null, 'delete'); },
    newRequest: () => formModal({ title: 'تسجيل طلب وارد من الجهة المانحة', submit: 'تسجيل', intro: html`<div class="note-box" style="margin-bottom:12px">العملية رقم 1: سجّل تاريخ الورود والمهلة بدقة، ويتابع النظام المهلة تلقائيًا.</div>`,
      fields: [{ name: 'title', label: 'عنوان الطلب', required: true, full: true }, { name: 'donor', label: 'الجهة المانحة' }, { name: 'projectId', label: 'مرتبط بمشروع (اختياري)', type: 'select', options: vals(S.projects).filter((p) => p.status === 'active').map((p) => [p.id, `${p.code} — ${p.title}`]) }, { name: 'receivedAt', label: 'تاريخ الورود', type: 'date', value: todayStr() }, { name: 'donorDeadline', label: 'مهلة المانح', type: 'date', required: true }, { name: 'priority', label: 'الأولوية', type: 'select', empty: false, options: PRIO }, { name: 'desc', label: 'نص الطلب وتفاصيله', type: 'textarea' }],
      onSubmit: async (v) => { const id = 'r' + nid(); const code = nextCode('request'); await W('requests/' + id, { ...v, code, stage: 1, stageStatus: 'active', stageAt: now(), status: 'active', createdBy: S.uid, createdAt: now(), checks: {}, files: {}, events: evt(1, 'created', 'تسجيل الطلب الوارد من الجهة المانحة') }, 'set'); toast('تم تسجيل الطلب ' + code, 'ok'); location.hash = '#request-' + id; } }),
    reqSector: (el) => { const r = entity('request', el.dataset.id); formModal({ title: 'عكس الطلب إلى القطاع المختص', fields: [{ name: 'sector', label: 'القطاع المختص', type: 'select', required: true, value: r.sector, options: deptOptions() }, { name: 'sectorDeadline', label: 'مدة الإنجاز (حتى تاريخ)', type: 'date', required: true, max: r.donorDeadline || undefined, value: r.sectorDeadline, hint: r.donorDeadline ? 'مهلة المانح: ' + fmtDate(r.donorDeadline) : '' }], onSubmit: async (v) => { if (r.donorDeadline && v.sectorDeadline > r.donorDeadline) throw new Error('مهلة القطاع يجب ألا تتجاوز مهلة المانح'); await W('requests/' + r.id, { ...v, events: evt(2, 'edit', `تحديد القطاع: ${deptName(v.sector)} حتى ${v.sectorDeadline}`) }); toast('تم التحديد. أنجز المرحلة الآن لإبلاغ القطاع.', 'ok'); } }); },
    reqAssign: (el) => { const r = entity('request', el.dataset.id); formModal({ title: 'التكليف الرسمي بتنفيذ الطلب', fields: [{ name: 'assignee', label: 'الموظف المكلف', type: 'select', required: true, value: r.assignee, options: staffOptions((s) => s.dept === r.sector || can('workflow.override')) }, { name: 'assigneeDeadline', label: 'مهلة الموظف', type: 'date', required: true, max: r.sectorDeadline || undefined, value: r.assigneeDeadline, hint: 'يجب أن تكون أقصر من مهلة القطاع (' + fmtDate(r.sectorDeadline) + ') احتياطًا' }], onSubmit: async (v) => { if (r.sectorDeadline && v.assigneeDeadline > r.sectorDeadline) throw new Error('مهلة الموظف يجب أن تكون أقصر من مهلة القطاع'); await W('requests/' + r.id, { ...v, events: evt(3, 'edit', `تكليف ${nm(v.assignee)} حتى ${v.assigneeDeadline}`) }); toast('تم التكليف', 'ok'); } }); },
    reqDeliver: (el) => { const r = entity('request', el.dataset.id); formModal({ title: 'مخرجات تنفيذ الطلب', fields: [{ name: 'deliverable', label: 'وصف ما تم إنجازه وروابط المخرجات', type: 'textarea', rows: 7, required: true, value: r.deliverable }], onSubmit: async (v) => { await W('requests/' + r.id, { deliverable: v.deliverable, events: evt(4, 'edit', 'رفع مخرجات الطلب') }); } }); },
    supplier: (el) => { const s = el.dataset.id ? { id: el.dataset.id, ...S.suppliers[el.dataset.id] } : {}; formModal({ title: s.id ? 'تعديل مورد' : 'مورد جديد', fields: [{ name: 'name', label: 'اسم المورد', required: true, value: s.name, full: true }, { name: 'cat', label: 'التصنيف', value: s.cat, placeholder: 'مواد غذائية، مواد بناء…' }, { name: 'contact', label: 'الشخص المسؤول', value: s.contact }, { name: 'phone', label: 'الهاتف', dir: 'ltr', value: s.phone }, { name: 'rating', label: 'التقييم (0-5)', type: 'number', min: 0, max: 5, value: s.rating ?? 3 }, { name: 'notes', label: 'ملاحظات (الجودة، الالتزام بالمواعيد…)', type: 'textarea', value: s.notes }, ...(s.id ? [{ name: 'active', label: 'مورد نشط', type: 'checkbox', value: s.active !== false }] : [])], onSubmit: async (v) => { v.rating = Math.max(0, Math.min(5, Number(v.rating) || 0)); if (s.id) await W('suppliers/' + s.id, v); else await W('suppliers/' + nid(), { ...v, active: true, at: now() }, 'set'); toast('تم الحفظ', 'ok'); } }); },
    corr: (el) => { const d = el.dataset.v; formModal({ title: d === 'in' ? 'تسجيل وارد' : 'تسجيل صادر', fields: [{ name: 'subject', label: 'الموضوع', required: true, full: true }, { name: 'party', label: d === 'in' ? 'الجهة المرسِلة' : 'الجهة المرسَل إليها' }, { name: 'date', label: 'التاريخ', type: 'date', value: todayStr() }, { name: 'ref', label: 'الرقم المرجعي', hint: 'اتركه فارغًا ليُولّد تلقائيًا' }, { name: 'channel', label: 'الوسيلة', type: 'select', empty: false, options: ['البريد الإلكتروني', 'وسيلة الرفع المعتمدة لدى المانح', 'تسليم ورقي', 'خطاب رسمي', 'أخرى'].map((x) => [x, x]) }, { name: 'notes', label: 'ملاحظات', type: 'textarea' }], onSubmit: async (v) => { const y = new Date().getFullYear(); const n = vals(S.corr).filter((c) => c.dir === d && (c.ref || '').endsWith('/' + y)).length + 1; const ref = v.ref || `${d === 'in' ? 'و' : 'ص'}-${String(n).padStart(4, '0')}/${y}`; await W('corr/' + nid(), { ...v, ref, dir: d, by: S.uid, at: now() }, 'set'); toast('تم القيد برقم ' + ref, 'ok'); } }); },
    chatSide: () => { UI.chatSide = !UI.chatSide; schedule(); },
    cancelReply: () => { UI.reply = null; schedule(); },
    reply: (el) => { UI.reply = chMsgs(UI.chatCh).find((m) => m.id === el.dataset.c); schedule(); setTimeout(() => document.getElementById('mbody')?.focus(), 50); },
    mention: (el) => { const ta = document.getElementById('mbody'); ta.value = ta.value.replace(/@([^\s@]*)$/, '@' + el.dataset.v + ' '); UI.mention = null; schedule(); setTimeout(() => ta.focus(), 30); },
    react: async (el) => { const d = S.chat[el.dataset.doc]; const m = d.msgs[el.dataset.c]; const has = ((m.re || {})[el.dataset.v] || {})[S.uid]; await W('chat/' + el.dataset.doc, { msgs: { [el.dataset.c]: { re: { [el.dataset.v]: { [S.uid]: has ? null : true } } } } }); },
    pin: async (el) => { const m = S.chat[el.dataset.doc].msgs[el.dataset.c]; await W('chat/' + el.dataset.doc, { msgs: { [el.dataset.c]: { pin: !m.pin } } }); },
    delMsg: async (el) => { if (await confirmBox('حذف الرسالة؟', { danger: true })) await W('chat/' + el.dataset.doc, { msgs: { [el.dataset.c]: { del: true, body: '' } } }); },
    newAnn: () => formModal({ title: 'نشر تعميم رسمي', submit: 'نشر', wide: true, fields: [{ name: 'title', label: 'العنوان', required: true, full: true }, { name: 'body', label: 'نص التعميم', type: 'textarea', rows: 8, required: true }, { name: 'dept', label: 'الجمهور', type: 'select', empty: 'جميع الطاقم', options: deptOptions() }, { name: 'prio', label: 'الأهمية', type: 'select', empty: false, options: [['normal', 'عادي'], ['important', 'مهم'], ['urgent', 'عاجل']] }, { name: 'ack', label: 'يتطلب تأكيد اطلاع من كل موظف (ترى من أكّد ومن لم يؤكد)', type: 'checkbox', full: true }], onSubmit: async (v) => { await W('ann/' + nid(), { ...v, dept: v.dept || null, by: S.uid, at: now(), reads: {} }, 'set'); toast('تم النشر', 'ok'); } }),
    ack: async (el) => { await W('ann/' + el.dataset.id, { reads: { [S.uid]: now() } }); },
    taskScope: (el) => { UI.taskScope = el.dataset.v; schedule(); },
    moveTask: async (el) => { await W('tasks/' + el.dataset.id, { status: el.dataset.v, doneAt: el.dataset.v === 'done' ? now() : null }); },
    newTask: () => formModal({ title: 'مهمة جديدة', fields: [{ name: 'title', label: 'عنوان المهمة', required: true, full: true }, ...(can('tasks.assign') ? [{ name: 'assignee', label: 'المكلف', type: 'select', empty: 'أنا', options: staffOptions() }] : []), { name: 'due', label: 'تاريخ الاستحقاق', type: 'date' }, { name: 'prio', label: 'الأولوية', type: 'select', empty: false, value: 'normal', options: [['low', 'منخفضة'], ...PRIO] }, { name: 'projectId', label: 'مرتبطة بمشروع', type: 'select', options: vals(S.projects).filter((p) => p.status === 'active').map((p) => [p.id, `${p.code} — ${p.title}`]) }, { name: 'desc', label: 'التفاصيل', type: 'textarea' }], onSubmit: async (v) => { await W('tasks/' + nid(), { ...v, assignee: v.assignee || S.uid, by: S.uid, status: 'todo', at: now() }, 'set'); toast('تمت الإضافة', 'ok'); } }),
    allMonths: () => { UI.month = ''; schedule(); },
    errStatus: async (el) => { await W('errors/' + el.dataset.id, { status: el.dataset.v, resolvedAt: el.dataset.v === 'resolved' ? now() : null }); },
    newError: () => formModal({ title: 'قيد خطأ يدوي', fields: [{ name: 'name', label: 'اسم الخطأ', required: true }, { name: 'etitle', label: 'المشروع / الطلب / النشاط' }, { name: 'dept', label: 'القطاع', type: 'select', options: deptOptions() }, { name: 'resp', label: 'الموظف المسؤول', type: 'select', options: staffOptions() }, { name: 'stageTitle', label: 'المرحلة' }, { name: 'sev', label: 'الدرجة', type: 'select', empty: false, value: 'medium', options: [['low', 'بسيط'], ['medium', 'متوسط'], ['high', 'جسيم']] }, { name: 'desc', label: 'الوصف', type: 'textarea' }], onSubmit: async (v) => { await W('errors/' + nid(), { ...v, etype: 'manual', by: S.uid, status: 'open', at: now() }, 'set'); toast('تم القيد', 'ok'); } }),
    approveJoin: (el) => staffForm(el.dataset.id, { ...S.join[el.dataset.id], role: 'officer' }, true),
    editStaff: (el) => staffForm(el.dataset.id, S.staff[el.dataset.id], false),
    toggleStaff: async (el) => { const s = S.staff[el.dataset.id]; if (s.active !== false && !(await confirmBox(`إيقاف حساب ${s.name}؟ يُمنع من الدخول فورًا (تبقى سجلاته محفوظة). أزله أيضًا من قائمة المشاركة في Claude.`, { danger: true, ok: 'إيقاف' }))) return; await W('staff/' + el.dataset.id, { active: s.active === false }); },
    addBySearch: () => {
      const m = modal({ title: 'إضافة زميل من مؤسستك', body: html`<p class="muted" style="margin-top:0">ابحث بالاسم أو البريد (يعمل مع زملاء مؤسستك في Claude). للأشخاص من خارجها: شاركهم الرابط وسيرسلون طلب انضمام.</p><input class="input" id="u-search" placeholder="اكتب اسمًا…"><div id="u-res" class="stack" style="margin-top:10px"></div>` });
      const inp = m.el.querySelector('#u-search'); const box = m.el.querySelector('#u-res');
      const run = async () => { const hits = await S.user.search(inp.value.trim()); mount(box, hits.filter((h) => !S.staff[h.id]).map((h) => html`<div class="row between"><span>${h.name}</span><button class="btn sm primary" data-pick="${h.id}" data-name="${h.name}">إضافة</button></div>`)); if (!hits.length) mount(box, html`<div class="muted small">لا نتائج</div>`); };
      inp.addEventListener('input', run); inp.addEventListener('focus', run);
      box.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; m.close(); staffForm(b.dataset.pick, { name: b.dataset.name, role: 'officer' }, false); });
    },
    dept: (el) => { const k = el.dataset.id; const d = k ? cfg().depts[k] : {}; formModal({ title: k ? 'تعديل الإدارة' : 'إدارة جديدة', fields: [{ name: 'name', label: 'الاسم', required: true, value: d.name }, { name: 'color', label: 'اللون', type: 'color', value: d.color || '#01a453' }], onSubmit: async (v) => { const key = k || 'x' + nid().slice(0, 6); await saveConfig('depts', key, { name: v.name, color: v.color, perms: d.perms || ['projects.view'] }); toast('تم الحفظ', 'ok'); } }); },
  };
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]'); if (t && root.contains(t)) { e.preventDefault(); const f = A[t.dataset.act]; if (f) Promise.resolve(f(t, e)).catch((er) => { if (er && er.message && !er.code) toast(er.message, 'err'); }); return; }
    for (const attr of ['ptab', 'rtab', 'ltab', 'ftab', 'gtab', 'mtab']) { const b = e.target.closest(`[data-${attr}]`); if (b) { const pr = parseRoute(); const key = { ptab: 'p' + pr.param, rtab: 'r' + pr.param, ltab: 'log', ftab: 'fin', gtab: 'guide', mtab: 'matrix' }[attr]; UI.tabs[key] = b.dataset[attr]; schedule(); return; } }
    const sr = e.target.closest('.search-results a'); if (sr) closeMenus();
    if (e.target.closest('#sidebar a')) document.getElementById('sidebar').classList.remove('open');
  });
  root.addEventListener('change', async (e) => {
    const t = e.target.closest('[data-change]'); if (!t) return; const k = t.dataset.change;
    try {
      if (k === 'check') { const type = t.dataset.type; const ent = entity(type, t.dataset.id); const label = (DEFS[type][ent.stage - 1].checks.find((c) => ent.stage + ':' + c.id === t.dataset.c) || {}).label || ''; await W(`${COLL[type]}/${t.dataset.id}`, { checks: { [t.dataset.c]: t.checked ? { by: S.uid, at: now() } : null }, events: evt(ent.stage, t.checked ? 'check' : 'uncheck', (t.checked ? 'تأكيد: ' : 'إلغاء تأكيد: ') + label) }); }
      if (k === 'claimOk') await W('projects/' + t.dataset.id, { claims: { [t.dataset.c]: { [t.dataset.f]: t.checked } } });
      if (k === 'mediaStatus') await W('projects/' + t.dataset.id, { media: { [t.dataset.c]: { status: t.value } } });
      if (k === 'month') { UI.month = t.value; schedule(); }
      if (k === 'matrix') { const kind = t.dataset.kind === 'roles' ? 'roles' : 'depts'; const cur = cfg()[kind][t.dataset.k]; const set = new Set(cur.perms || []); if (t.checked) set.add(t.dataset.p); else set.delete(t.dataset.p); await saveConfig(kind, t.dataset.k, { ...cur, perms: [...set] }); toast(`${t.checked ? 'مُنحت' : 'سُحبت'} الصلاحية — ${cur.name}`, 'ok'); }
      if (k === 'upload') {
        const f = t.files[0]; if (!f) return; if (f.size > 20 * 1048576) return toast('الحد الأقصى 20 ميجابايت', 'err');
        toast('جارٍ الرفع…'); const up = await S.assets.upload(f); const cat = document.getElementById('file-cat')?.value || 'عام'; const type = t.dataset.type; const ent = entity(type, t.dataset.id);
        await W(`${COLL[type]}/${t.dataset.id}`, { files: { [nid()]: { name: f.name, url: up.url, assetId: up.id, size: f.size, cat, by: S.uid, at: now() } }, events: evt(ent.stage, 'file', 'إرفاق ملف: ' + f.name) }); toast('تم رفع الملف', 'ok');
      }
    } catch (er) { if (t.type === 'checkbox') t.checked = !t.checked; if (k === 'upload') toast('تعذّر رفع الملف', 'err'); }
  });
  root.addEventListener('input', (e) => {
    const t = e.target.closest('[data-input]'); if (!t) return;
    if (t.dataset.input === 'prjQ') { UI.prj.q = t.value.trim(); schedule(); }
    if (t.dataset.input === 'mention') { const m = /@([^\s@]*)$/.exec(t.value); const nv = m ? m[1] : null; if (nv !== UI.mention) { UI.mention = nv; schedule(); } t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight) + 'px'; }
    if (t.dataset.input === 'search') searchBox(t.value.trim());
  });
  root.addEventListener('keydown', (e) => { if (e.target.id === 'mbody' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  root.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-submit]'); if (!f) return; e.preventDefault(); const k = f.dataset.submit; const fd = Object.fromEntries(new FormData(f).entries());
    const btn = f.querySelector('button[type=submit],button:not([type])'); if (btn) btn.disabled = true;
    try {
      if (k === 'ownerSetup') { if (!fd.name.trim()) throw new Error('اكتب اسمك'); await W('staff/' + S.uid, { name: fd.name.trim(), title: fd.title || 'المدير العام', dept: 'gm', role: 'owner', active: true, extra: [], denied: [], at: now() }, 'set'); toast('تم تفعيل النظام ✔', 'ok'); }
      if (k === 'join') { if (!fd.name.trim()) throw new Error('اكتب اسمك الكامل'); await W('join/' + S.uid, { name: fd.name.trim(), title: fd.title || '', dept: fd.dept || '', phone: fd.phone || '', at: now() }, 'set'); }
      if (k === 'send') await sendMsg();
      if (k === 'profile') await W('staff/' + S.uid, { phone: fd.phone || '' }).then(() => toast('تم الحفظ', 'ok'));
    } catch (er) { if (er && er.message && !er.code) toast(er.message, 'err'); } finally { if (btn) btn.disabled = false; }
  });
  root.addEventListener('dragstart', (e) => { const t = e.target.closest('[data-task]'); if (t) e.dataTransfer.setData('text/plain', t.dataset.task); });
  root.addEventListener('dragover', (e) => { const c = e.target.closest('[data-col]'); if (c) { e.preventDefault(); c.classList.add('drag-over'); } });
  root.addEventListener('dragleave', (e) => { const c = e.target.closest('[data-col]'); if (c) c.classList.remove('drag-over'); });
  root.addEventListener('drop', (e) => { const c = e.target.closest('[data-col]'); if (!c) return; e.preventDefault(); c.classList.remove('drag-over'); const id = e.dataTransfer.getData('text/plain'); if (id) W('tasks/' + id, { status: c.dataset.col, doneAt: c.dataset.col === 'done' ? now() : null }).catch(() => {}); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) { const r = document.getElementById('gsearch-res'); if (r) r.hidden = true; } });
}
async function saveConfig(kind, key, val) {
  const c = S.config || {};
  const next = { roles: { ...(c.roles || {}) }, depts: { ...(c.depts || {}) } };
  next[kind][key] = val;
  await W('config/perms', next, 'set');
}
let sending = false;
async function sendMsg() {
  const ta = document.getElementById('mbody'); if (!ta || sending) return;
  const body = ta.value.trim(); if (!body) return;
  sending = true; ta.value = '';
  const ch = UI.chatCh; const day = todayStr(); const docId = `${ch}_${day}`;
  const mentions = activeStaff().filter((s) => s.name && body.includes('@' + s.name)).map((s) => s.id);
  const msg = { by: S.uid, body, at: now(), reply: UI.reply ? UI.reply.id : null, mentions };
  const mid = nid();
  try {
    if (S.chat[docId]) await W('chat/' + docId, { msgs: { [mid]: msg } });
    else { try { await S.db.doc('chat/' + docId).update({ msgs: { [mid]: msg } }); } catch { await W('chat/' + docId, { ch, day, msgs: { [mid]: msg } }, 'set'); } }
    UI.reply = null; UI.mention = null; schedule();
  } catch { ta.value = body; } finally { sending = false; }
}
function searchBox(q) {
  const box = document.getElementById('gsearch-res'); if (!box) return;
  if (q.length < 2) { box.hidden = true; return; }
  const out = [];
  if (can('projects.view')) vals(S.projects).filter((p) => `${p.title} ${p.code} ${p.donor || ''}`.includes(q)).slice(0, 8).forEach((p) => out.push(['مشروع', `${p.code} — ${p.title}`, '#project-' + p.id]));
  vals(S.requests).filter((r) => canSeeRequest(r) && `${r.title} ${r.code}`.includes(q)).slice(0, 8).forEach((r) => out.push(['طلب', `${r.code} — ${r.title}`, '#request-' + r.id]));
  if (can('directory.view')) activeStaff().filter((s) => (s.name || '').includes(q)).slice(0, 6).forEach((s) => out.push(['موظف', `${s.name} — ${deptName(s.dept)}`, '#directory']));
  if (can('logistics.view')) vals(S.suppliers).filter((s) => s.name.includes(q)).slice(0, 5).forEach((s) => out.push(['مورد', s.name, '#logistics']));
  mount(box, out.length ? out.map(([t, l, h]) => html`<a href="${h}"><span class="badge">${t}</span><span>${l}</span></a>`) : html`<div class="empty small">لا نتائج</div>`);
  box.hidden = false;
}

boot();
