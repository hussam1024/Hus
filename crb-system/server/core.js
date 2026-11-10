'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { all, get, run, json, getSetting } = require('./db');
const { effectivePermissions } = require('./permissions');

const SESSION_COOKIE = 'crb_sid';
const SESSION_HOURS = Number(process.env.CRB_SESSION_HOURS || 10);
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

// ---------- passwords ----------
const hashPassword = (pw) => bcrypt.hashSync(pw, 11);
const checkPassword = (pw, hash) => bcrypt.compareSync(pw, hash);
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'كلمة المرور يجب ألا تقل عن 8 أحرف';
  if (!/[A-Za-z؀-ۿ]/.test(pw) || !/\d/.test(pw)) return 'كلمة المرور يجب أن تحتوي على حروف وأرقام';
  if (pw.length > 128) return 'كلمة المرور طويلة جدًا';
  return null;
}
function generatePassword() {
  // readable, strong temporary password e.g. "Crb-7kq4-Mx92"
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n) => Array.from(crypto.randomBytes(n), (b) => a[b % a.length]).join('');
  return `Crb-${pick(4)}-${pick(4)}${crypto.randomInt(10)}`;
}

// ---------- sessions ----------
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function createSession(userId, req) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString();
  run('INSERT INTO sessions(id, user_id, expires_at, ip, user_agent) VALUES(?,?,?,?,?)',
    sha(token), userId, expires, req.ip, String(req.headers['user-agent'] || '').slice(0, 200));
  return token;
}
function destroySession(token) { if (token) run('DELETE FROM sessions WHERE id = ?', sha(token)); }
function destroyUserSessions(userId) { run('DELETE FROM sessions WHERE user_id = ?', userId); }

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function setSessionCookie(res, token, req) {
  const secure = process.env.CRB_SECURE_COOKIE === '1' || req.secure;
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${secure ? '; Secure' : ''}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

// ---------- users ----------
function loadUser(id) {
  const u = get(`SELECT u.*, r.key AS role_key, r.name AS role_name, r.permissions AS role_perms,
      d.key AS dept_key, d.name AS dept_name, d.permissions AS dept_perms, d.color AS dept_color
    FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ?`, id);
  if (!u) return null;
  u.extra_perms = json(u.extra_perms);
  u.denied_perms = json(u.denied_perms);
  u.perms = effectivePermissions(u, json(u.role_perms), json(u.dept_perms));
  u.isOwner = u.role_key === 'owner';
  return u;
}
function publicUser(u) {
  return {
    id: u.id, username: u.username, full_name: u.full_name, email: u.email, phone: u.phone, job_title: u.job_title,
    department_id: u.department_id, dept_key: u.dept_key, dept_name: u.dept_name, dept_color: u.dept_color,
    role_id: u.role_id, role_key: u.role_key, role_name: u.role_name, isOwner: u.isOwner,
    must_change_password: !!u.must_change_password, permissions: [...u.perms].sort(),
  };
}

// ---------- middleware ----------
function authenticate(req, res, next) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) {
    const s = get("SELECT * FROM sessions WHERE id = ? AND expires_at > ?", sha(token), new Date().toISOString());
    if (s) {
      const u = loadUser(s.user_id);
      if (u && u.is_active) {
        req.user = u;
        req.sessionToken = token;
        // sliding expiry (at most once per minute)
        if (Date.now() - new Date(s.last_seen + 'Z').getTime() > 60e3) {
          run("UPDATE sessions SET last_seen = datetime('now'), expires_at = ? WHERE id = ?",
            new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString(), s.id);
        }
      }
    }
  }
  next();
}
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  if (req.user.must_change_password && !req.path.startsWith('/auth/')) {
    return res.status(403).json({ error: 'يجب تغيير كلمة المرور المؤقتة أولًا', code: 'MUST_CHANGE_PASSWORD' });
  }
  next();
}
const can = (user, perm) => !!user && (user.isOwner || user.perms.has(perm));
function requirePerm(...perms) {
  return (req, res, next) => {
    if (perms.some((p) => can(req.user, p))) return next();
    audit(req, 'access.denied', null, null, { path: req.originalUrl, needs: perms });
    return res.status(403).json({ error: 'ليست لديك صلاحية للوصول إلى هذا القسم' });
  };
}

// ---------- audit & notifications ----------
function audit(req, action, entity, entityId, details) {
  run('INSERT INTO audit_log(user_id, username, action, entity, entity_id, details, ip) VALUES(?,?,?,?,?,?,?)',
    req.user ? req.user.id : null, req.user ? req.user.username : (details && details.username) || null,
    action, entity, entityId, details ? JSON.stringify(details) : null, req.ip);
}

function notify(userIds, { title, body, link, kind = 'info' }, exceptUserId) {
  const ids = [...new Set(userIds.filter(Boolean))].filter((id) => id !== exceptUserId);
  for (const id of ids) run('INSERT INTO notifications(user_id, kind, title, body, link) VALUES(?,?,?,?,?)', id, kind, title, body || null, link || null);
}
function usersInDepts(deptKeys) {
  if (!deptKeys.length) return [];
  return all(`SELECT u.id FROM users u JOIN departments d ON d.id = u.department_id
    WHERE u.is_active = 1 AND d.key IN (${deptKeys.map(() => '?').join(',')})`, ...deptKeys).map((r) => r.id);
}
function usersWithPerm(perm) {
  // used for "GM is CC on everything" and approvals
  const rows = all('SELECT id FROM users WHERE is_active = 1');
  return rows.map((r) => loadUser(r.id)).filter((u) => u && (u.isOwner || u.perms.has(perm))).map((u) => u.id);
}
function ccGeneralManager() {
  // Owner + users whose role key is gm or who belong to the gm department
  return all(`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.is_active = 1 AND (r.key IN ('owner','gm') OR d.key = 'gm')`).map((r) => r.id);
}

function nextCode(table, prefix) {
  const year = new Date().getFullYear();
  const r = get(`SELECT COUNT(*) AS c FROM ${table} WHERE code LIKE ?`, `${prefix}-${year}-%`);
  let n = r.c + 1;
  while (get(`SELECT 1 FROM ${table} WHERE code = ?`, `${prefix}-${year}-${String(n).padStart(3, '0')}`)) n++;
  return `${prefix}-${year}-${String(n).padStart(3, '0')}`;
}

const orgName = () => getSetting('org_name', 'منتدى الإغاثة والبناء');

module.exports = {
  SESSION_COOKIE, MAX_FAILED, LOCK_MINUTES,
  hashPassword, checkPassword, passwordProblem, generatePassword,
  createSession, destroySession, destroyUserSessions, parseCookies, setSessionCookie, clearSessionCookie,
  loadUser, publicUser, authenticate, requireAuth, requirePerm, can,
  audit, notify, usersInDepts, usersWithPerm, ccGeneralManager, nextCode, orgName,
};
