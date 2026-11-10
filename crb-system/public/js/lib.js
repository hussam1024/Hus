// ================================================================
//  Shared UI library — escaping templates, API, icons, modals, forms
// ================================================================

// ---------- safe HTML templating (everything is escaped unless wrapped in raw()) ----------
export class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
function rend(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(rend).join('');
  return esc(String(v));
}
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += rend(vals[i]) + strings[i + 1];
  return new Raw(out);
}
export const raw = (s) => new Raw(s);
export function mount(el, content) { el.innerHTML = rend(content); return el; }

// ---------- state ----------
export const state = { user: null, org: {}, people: null, departments: null, settings: {} };
export const can = (p) => !!state.user && (state.user.isOwner || state.user.permissions.includes(p));
export const canAny = (...ps) => ps.some(can);

// ---------- API ----------
export async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: { 'X-CRB': '1' }, credentials: 'same-origin' };
  if (opts.body instanceof FormData) init.body = opts.body;
  else if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers['Content-Type'] = 'application/json'; }
  const res = await fetch('/api' + path, init);
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) { location.hash = '#/'; location.reload(); }
    if (data && data.code === 'MUST_CHANGE_PASSWORD') { window.dispatchEvent(new Event('crb:must-change')); }
    const err = new Error((data && data.error) || 'تعذر الاتصال بالخادم');
    err.status = res.status; throw err;
  }
  return data;
}
export const post = (p, body) => api(p, { method: 'POST', body: body || {} });
export const patch = (p, body) => api(p, { method: 'PATCH', body });
export const del = (p) => api(p, { method: 'DELETE' });

export async function people(force) {
  if (!state.people || force) state.people = await api('/people');
  return state.people;
}
export async function departments(force) {
  if (!state.departments || force) state.departments = await api('/admin/departments');
  return state.departments;
}

// ---------- formatting ----------
const dtf = new Intl.DateTimeFormat('ar-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
const dtfl = new Intl.DateTimeFormat('ar-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const tf = new Intl.DateTimeFormat('ar-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
const rtf = new Intl.RelativeTimeFormat('ar-u-nu-latn', { numeric: 'auto' });
export function parseDate(s) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) return new Date(s.replace(' ', 'T') + 'Z'); // SQLite UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  return new Date(s);
}
export const fmtDate = (s) => { const d = parseDate(s); return d && !isNaN(d) ? dtf.format(d) : '—'; };
export const fmtDateTime = (s) => { const d = parseDate(s); return d && !isNaN(d) ? dtfl.format(d) : '—'; };
export const fmtTime = (s) => { const d = parseDate(s); return d && !isNaN(d) ? tf.format(d) : ''; };
export function ago(s) {
  const d = parseDate(s); if (!d) return '';
  const diff = (d - Date.now()) / 1000;
  const a = Math.abs(diff);
  if (a < 60) return 'الآن';
  if (a < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (a < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return fmtDate(s);
}
export const daysUntil = (s) => { const d = parseDate(s); if (!d) return null; const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((d - t) / 864e5); };
export const daysSince = (s) => { const d = parseDate(s); return d ? Math.floor((Date.now() - d) / 864e5) : 0; };
const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const fmtNum = (n) => (n === null || n === undefined || n === '' ? '—' : nf.format(n));
export const money = (n, cur = 'USD') => (n === null || n === undefined ? '—' : html`<span class="num">${nf.format(n)} ${cur === 'USD' ? '$' : cur}</span>`);
export const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
export const today = () => new Date().toISOString().slice(0, 10);
export const initials = (name) => String(name || '؟').trim().split(/\s+/).slice(0, 2).map((w) => (w.length > 3 && w.startsWith('ال') ? w[2] : w[0])).join('');
const AV = ['#01a453', '#ef7023', '#1769aa', '#6c4bb4', '#c2185b', '#0b7a3e', '#d9631a', '#00838f'];
export const avatarColor = (id) => AV[(Number(id) || 0) % AV.length];
export const avatar = (u, cls = '') => html`<span class="avatar ${cls}" style="background:${raw(avatarColor(u.id || u.user_id))}" title="${u.full_name || ''}">${initials(u.full_name)}</span>`;

export const STATUS = {
  priority: { normal: ['عادية', ''], high: ['مرتفعة', 'orange'], urgent: ['عاجلة', 'red'], low: ['منخفضة', 'blue'] },
};
export const prioBadge = (p) => (p && p !== 'normal' ? html`<span class="badge ${(STATUS.priority[p] || [])[1]}">${(STATUS.priority[p] || [p])[0]}</span>` : '');

// ---------- icons (stroke, 24 grid) ----------
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  inbox: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6l2-8Z"/>',
  truck: '<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  wallet: '<path d="M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1V7Z"/><path d="M4 7V6a2 2 0 0 1 2-2h11v3"/><circle cx="16" cy="13" r="1.3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9.5h8M8 12.5h5"/>',
  megaphone: '<path d="M3 10v4h4l7 4V6l-7 4H3Z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.6c1.8.7 3 2.5 3.5 5.4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6.5 8-6.5s7 2.5 8 6.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5.5-6"/>',
  tasks: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16 6.5l2.5 2.5M14 8.5l2 2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  alert: '<path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3M20 16V6"/>',
  folder: '<path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6.5Z"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2"/>',
  send: '<path d="m4 12 16-8-6 16-3-7-7-1Z"/>',
  paperclip: '<path d="m20 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.5-2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  printer: '<path d="M7 9V3h10v6"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  pin: '<path d="M9 4h6l-1 5 3 3H7l3-3-1-5Z"/><path d="M12 15v6"/>',
  hash: '<path d="M5 9h14M4 15h14M10 3 8 21M16 3l-2 18"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>',
  coffee: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
  sparkles: '<path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M19 15v4M17 17h4"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  dots: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4M12 7.5V12l3 2"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
};
export const icon = (name, attrs = '') => raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${attrs}>${P[name] || P.dots}</svg>`);

// ---------- events ----------
export function on(root, type, selector, fn) {
  const h = (e) => { const t = e.target.closest(selector); if (t && root.contains(t)) fn(e, t); };
  root.addEventListener(type, h);
  return () => root.removeEventListener(type, h);
}

// ---------- toasts ----------
export function toast(msg, kind = '') {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, kind === 'err' ? 5200 : 3200);
}
export const fail = (e) => toast(e.message || String(e), 'err');

// ---------- modal ----------
export function modal({ title, body, foot, wide = false, onMount }) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  mount(bg, html`<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close aria-label="إغلاق">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>
    ${foot ? html`<div class="modal-foot">${foot}</div>` : ''}
  </div>`);
  document.body.appendChild(bg);
  const close = () => { bg.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc_);
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  bg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  const m = { el: bg, body: bg.querySelector('.modal-body'), close };
  if (onMount) onMount(m);
  const first = bg.querySelector('input:not([type=checkbox]),select,textarea');
  if (first) setTimeout(() => first.focus(), 30);
  return m;
}
export function confirmBox(message, { ok = 'تأكيد', danger = false } = {}) {
  return new Promise((resolve) => {
    const m = modal({
      title: 'تأكيد', body: html`<p style="margin:0">${message}</p>`,
      foot: html`<button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${ok}</button><button class="btn" data-close>إلغاء</button>`,
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); resolve(true); });
    m.el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => resolve(false)));
  });
}

// ---------- forms ----------
function fieldHtml(f) {
  const id = 'f_' + f.name;
  const req = f.required ? raw(' <span style="color:var(--red)">*</span>') : '';
  const v = f.value ?? '';
  let input;
  switch (f.type) {
    case 'textarea': input = html`<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" placeholder="${f.placeholder || ''}">${v}</textarea>`; break;
    case 'select': input = html`<select id="${id}" name="${f.name}">${f.empty !== false ? html`<option value="">${f.empty || '— اختر —'}</option>` : ''}${(f.options || []).map((o) => {
      const [val, lab] = Array.isArray(o) ? o : [o.value, o.label];
      return html`<option value="${val}" ${String(val) === String(v) ? raw('selected') : ''}>${lab}</option>`;
    })}</select>`; break;
    case 'checkbox': return html`<label class="check ${f.full ? 'full' : ''}"><input type="checkbox" name="${f.name}" ${v ? raw('checked') : ''}><span>${f.label}${f.hint ? html`<br><span class="muted small">${f.hint}</span>` : ''}</span></label>`;
    case 'multi': input = html`<div style="max-height:200px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:8px 12px;display:grid;gap:4px">${(f.options || []).map(([val, lab]) =>
      html`<label class="check"><input type="checkbox" name="${f.name}" value="${val}" ${(v || []).map(String).includes(String(val)) ? raw('checked') : ''}><span>${lab}</span></label>`)}</div>`; break;
    case 'html': return html`<div class="${f.full ? 'full' : ''}">${f.html}</div>`;
    default: input = html`<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${v}" placeholder="${f.placeholder || ''}" ${f.step ? raw(`step="${f.step}"`) : ''} ${f.min !== undefined ? raw(`min="${f.min}"`) : ''} ${f.max !== undefined ? raw(`max="${f.max}"`) : ''} ${f.dir ? raw(`dir="${f.dir}"`) : ''} autocomplete="off">`;
  }
  return html`<div class="field ${f.full || f.type === 'textarea' ? 'full' : ''}"><label for="${id}">${f.label}${req}</label>${input}${f.hint ? html`<span class="hint">${f.hint}</span>` : ''}</div>`;
}
export function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    if (!f.name || f.type === 'html') continue;
    if (f.type === 'checkbox') out[f.name] = form.querySelector(`[name="${f.name}"]`).checked;
    else if (f.type === 'multi') out[f.name] = [...form.querySelectorAll(`[name="${f.name}"]:checked`)].map((i) => (f.numeric === false ? i.value : Number(i.value)));
    else {
      const val = form.querySelector(`[name="${f.name}"]`).value.trim();
      out[f.name] = val === '' ? null : f.type === 'number' ? Number(val) : val;
    }
  }
  return out;
}
/** Opens a form in a modal. onSubmit(data) may throw → error shown, modal stays open. */
export function formModal({ title, fields, submit = 'حفظ', onSubmit, wide, intro }) {
  const m = modal({
    title, wide,
    body: html`${intro || ''}<form class="form-grid" novalidate>${fields.map(fieldHtml)}<button type="submit" hidden></button></form>`,
    foot: html`<button class="btn primary" data-submit>${submit}</button><button class="btn" data-close>إلغاء</button>`,
  });
  const form = m.el.querySelector('form');
  const btn = m.el.querySelector('[data-submit]');
  const go = async (e) => {
    e && e.preventDefault();
    const data = readForm(form, fields);
    for (const f of fields) if (f.required && (data[f.name] === null || data[f.name] === '')) { toast(`الحقل «${f.label}» مطلوب`, 'err'); return; }
    btn.disabled = true;
    try { await onSubmit(data, m); m.close(); } catch (err) { fail(err); } finally { btn.disabled = false; }
  };
  form.addEventListener('submit', go);
  btn.addEventListener('click', go);
  return m;
}

export function showSecret(title, username, password) {
  modal({
    title,
    body: html`<p style="margin-top:0">سلّم هذه البيانات للموظف بشكل شخصي وآمن (لا ترسلها في مجموعات عامة). سيُطلب منه تغيير كلمة المرور فور أول دخول.</p>
      <div class="kv" style="margin-bottom:12px"><div>اسم المستخدم</div><div class="ltr">${username}</div></div>
      <div class="secret">${password}</div>
      <p class="muted small">لن تظهر كلمة المرور مرة أخرى بعد إغلاق هذه النافذة.</p>`,
    foot: html`<button class="btn primary" data-copy>${icon('file')} نسخ البيانات</button><button class="btn" data-close>تم</button>`,
    onMount: (m) => m.el.querySelector('[data-copy]').addEventListener('click', () => {
      navigator.clipboard?.writeText(`اسم المستخدم: ${username}\nكلمة المرور المؤقتة: ${password}\nرابط النظام: ${location.origin}`).then(() => toast('تم النسخ', 'ok'));
    }),
  });
}

// ---------- small render helpers ----------
export const empty = (text, ic = 'inbox') => html`<div class="empty">${icon(ic)}${text}</div>`;
export const pageHead = (title, sub, actions, ic) => html`<div class="page-head"><div><h1>${ic ? icon(ic) : ''}${title}</h1>${sub ? html`<p>${sub}</p>` : ''}</div>${actions ? html`<div class="actions">${actions}</div>` : ''}</div>`;
export function bars(items, { max, fmt = fmtNum, color } = {}) {
  if (!items.length) return empty('لا توجد بيانات بعد', 'chart');
  const m = max || Math.max(1, ...items.map((i) => i.value));
  return html`<div class="bars">${items.map((i) => html`<div class="bar-row" title="${i.label}: ${fmt(i.value)}">
    <span class="lbl">${i.label}</span><div class="bar-track"><div class="bar-fill" style="width:${raw(String((i.value / m) * 100))}%;${color ? raw('background:' + color) : ''}"></div></div><span class="val">${fmt(i.value)}</span></div>`)}</div>`;
}
export function vbars(items, { fmt = fmtNum } = {}) {
  if (!items.length) return empty('لا توجد بيانات بعد', 'chart');
  const m = Math.max(1, ...items.map((i) => i.value));
  return html`<div class="vbars">${items.map((i) => html`<div class="col" title="${i.label}: ${fmt(i.value)}"><span class="vv">${i.value ? fmt(i.value) : ''}</span><div class="b ${i.alt ? 'alt' : ''}" style="height:${raw(String((i.value / m) * 85))}%"></div><span>${i.label}</span></div>`)}</div>`;
}
export function tabs(list, active, attr = 'data-tab') {
  return html`<div class="tabs">${list.filter((t) => t.show !== false).map((t) => html`<button ${raw(attr)}="${t.id}" class="${t.id === active ? 'active' : ''}">${t.icon ? icon(t.icon) : ''}${t.label}${t.count ? html` <span class="badge orange">${t.count}</span>` : ''}</button>`)}</div>`;
}
export function query() {
  const q = location.hash.split('?')[1] || '';
  return Object.fromEntries(new URLSearchParams(q));
}
export function setQuery(params) {
  const [p] = location.hash.split('?');
  const qs = new URLSearchParams({ ...query(), ...params }).toString();
  history.replaceState(null, '', p + (qs ? '?' + qs : ''));
}
export function downloadCSV(name, rows, cols) {
  const escCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [cols.map((c) => escCell(c[1])).join(','), ...rows.map((r) => cols.map((c) => escCell(typeof c[0] === 'function' ? c[0](r) : r[c[0]])).join(','))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name + '.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export async function uploadFile(file, entity_type, entity_id, category) {
  const fd = new FormData();
  fd.append('entity_type', entity_type); fd.append('entity_id', entity_id);
  if (category) fd.append('category', category);
  fd.append('file', file);
  return api('/files', { method: 'POST', body: fd });
}
export function pickFile() {
  return new Promise((resolve) => {
    const i = document.createElement('input'); i.type = 'file';
    i.onchange = () => resolve(i.files[0] || null); i.click();
  });
}
export const printHead = (title) => html`<div class="print-head"><img src="/img/logo-sm.png" alt=""><div><b style="color:var(--green-700);font-size:16px">${state.org.name || 'منتدى الإغاثة والبناء'}</b><div>${title} — ${fmtDate(today())}</div></div></div>`;
