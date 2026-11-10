'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const { all, get, run, tx, json, getSetting, setSetting, db, DATA_DIR } = require('../db');
const { PERMISSIONS, ALL_KEYS, effectivePermissions } = require('../permissions');
const C = require('../core');
const { str, num, bad } = require('../validate');

// ================================================================= AUTH (public)
const auth = express.Router();
const loginHits = new Map(); // ip -> [timestamps]  (simple rate limit)
const DUMMY_HASH = C.hashPassword('timing-equalizer-0'); // keeps response time equal for unknown usernames

auth.post('/login', (req, res) => {
  const now = Date.now();
  const hits = (loginHits.get(req.ip) || []).filter((t) => now - t < 10 * 60e3);
  if (hits.length >= 20) return res.status(429).json({ error: 'محاولات كثيرة. حاول بعد 10 دقائق.' });
  hits.push(now); loginHits.set(req.ip, hits);

  const username = str((req.body || {}).username, 60);
  const password = String((req.body || {}).password || '');
  const fail = () => res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  if (!username || !password) return fail();
  const u = get('SELECT * FROM users WHERE username = ?', username);
  if (!u) { C.checkPassword(password, DUMMY_HASH); return fail(); }
  if (!u.is_active) return res.status(403).json({ error: 'الحساب موقوف. راجع المضيف الرئيسي.' });
  if (u.locked_until && new Date(u.locked_until) > new Date()) {
    return res.status(423).json({ error: `الحساب مقفل مؤقتًا بسبب محاولات خاطئة متكررة. حاول بعد ${Math.ceil((new Date(u.locked_until) - new Date()) / 60e3)} دقيقة.` });
  }
  if (!C.checkPassword(password, u.password_hash)) {
    const n = u.failed_attempts + 1;
    const lock = n >= C.MAX_FAILED ? new Date(Date.now() + C.LOCK_MINUTES * 60e3).toISOString() : null;
    run('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', lock ? 0 : n, lock, u.id);
    req.user = null; C.audit(req, lock ? 'auth.locked' : 'auth.failed', 'user', u.id, { username });
    return fail();
  }
  run("UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = datetime('now') WHERE id = ?", u.id);
  const token = C.createSession(u.id, req);
  C.setSessionCookie(res, token, req);
  req.user = C.loadUser(u.id);
  C.audit(req, 'auth.login', 'user', u.id);
  res.json({ user: C.publicUser(req.user) });
});

auth.post('/logout', (req, res) => {
  if (req.user) C.audit(req, 'auth.logout', 'user', req.user.id);
  C.destroySession(req.sessionToken);
  C.clearSessionCookie(res);
  res.json({ ok: true });
});

auth.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'غير مسجل' });
  res.json({ user: C.publicUser(req.user), org: { name: C.orgName(), name_en: getSetting('org_name_en', 'Coalition of Relief and Building') } });
});

auth.post('/change-password', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'غير مسجل' });
  const { current, next } = req.body || {};
  const u = get('SELECT password_hash FROM users WHERE id = ?', req.user.id);
  if (!C.checkPassword(String(current || ''), u.password_hash)) return bad(res, 'كلمة المرور الحالية غير صحيحة');
  const p = C.passwordProblem(next);
  if (p) return bad(res, p);
  if (C.checkPassword(next, u.password_hash)) return bad(res, 'اختر كلمة مرور مختلفة عن الحالية');
  run("UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = datetime('now') WHERE id = ?", C.hashPassword(next), req.user.id);
  // sign out other devices
  run('DELETE FROM sessions WHERE user_id = ? AND id != ?', req.user.id, require('crypto').createHash('sha256').update(req.sessionToken).digest('hex'));
  C.audit(req, 'auth.password_changed', 'user', req.user.id);
  res.json({ ok: true });
});

auth.get('/sessions', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'غير مسجل' });
  res.json(all('SELECT created_at, last_seen, ip, user_agent FROM sessions WHERE user_id = ? ORDER BY last_seen DESC', req.user.id));
});

auth.patch('/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'غير مسجل' });
  const b = req.body || {};
  run('UPDATE users SET email = ?, phone = ? WHERE id = ?', str(b.email, 120), str(b.phone, 40), req.user.id);
  res.json({ ok: true });
});

// ================================================================= ADMIN
const admin = express.Router();

admin.get('/permissions-catalog', (req, res) => {
  res.json(PERMISSIONS.map(([group, key, label]) => ({ group, key, label })));
});

// ---------- users
function userRow(u) {
  return {
    id: u.id, username: u.username, full_name: u.full_name, email: u.email, phone: u.phone, job_title: u.job_title,
    department_id: u.department_id, dept_name: u.dept_name, role_id: u.role_id, role_name: u.role_name, role_key: u.role_key,
    is_active: !!u.is_active, must_change_password: !!u.must_change_password, last_login: u.last_login,
    locked: !!(u.locked_until && new Date(u.locked_until) > new Date()), created_at: u.created_at,
    extra_perms: json(u.extra_perms), denied_perms: json(u.denied_perms),
  };
}
const USERS_SQL = `SELECT u.*, r.name AS role_name, r.key AS role_key, d.name AS dept_name FROM users u
  JOIN roles r ON r.id = u.role_id LEFT JOIN departments d ON d.id = u.department_id`;

admin.get('/users', C.requirePerm('users.manage'), (req, res) => {
  res.json(all(USERS_SQL + ' ORDER BY u.is_active DESC, d.id, u.full_name').map(userRow));
});

admin.get('/users/:id/effective', C.requirePerm('users.manage', 'roles.manage'), (req, res) => {
  const u = C.loadUser(Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  res.json({
    role: json(u.role_perms), department: json(u.dept_perms), extra: u.extra_perms, denied: u.denied_perms,
    effective: [...u.perms].sort(),
    sessions: all('SELECT created_at, last_seen, ip, user_agent FROM sessions WHERE user_id = ? ORDER BY last_seen DESC', u.id),
  });
});

function validRole(req, roleId) {
  const r = get('SELECT * FROM roles WHERE id = ?', roleId);
  if (!r) return 'اختر الدور';
  if (r.key === 'owner' && !req.user.isOwner) return 'فقط المضيف الرئيسي يمكنه منح دور المضيف الرئيسي';
  return null;
}
function cleanPerms(list) { return [...new Set((Array.isArray(list) ? list : []).filter((p) => ALL_KEYS.includes(p)))]; }

admin.post('/users', C.requirePerm('users.manage'), (req, res) => {
  const b = req.body || {};
  const username = str(b.username, 40);
  const full_name = str(b.full_name, 120);
  if (!username || !/^[a-zA-Z0-9._-]{3,40}$/.test(username)) return bad(res, 'اسم المستخدم: 3 أحرف على الأقل بالإنجليزية أو أرقام أو (. _ -)');
  if (!full_name) return bad(res, 'الاسم الكامل مطلوب');
  if (get('SELECT 1 FROM users WHERE username = ?', username)) return bad(res, 'اسم المستخدم مستخدم مسبقًا');
  const rp = validRole(req, num(b.role_id)); if (rp) return bad(res, rp);
  const password = b.password ? String(b.password) : C.generatePassword();
  const pp = C.passwordProblem(password); if (pp) return bad(res, pp);
  const r = run(`INSERT INTO users(username, full_name, email, phone, job_title, department_id, role_id, password_hash, must_change_password, extra_perms, denied_perms)
    VALUES(?,?,?,?,?,?,?,?,1,?,?)`, username, full_name, str(b.email, 120), str(b.phone, 40), str(b.job_title, 120),
  num(b.department_id), num(b.role_id), C.hashPassword(password), JSON.stringify(cleanPerms(b.extra_perms)), JSON.stringify(cleanPerms(b.denied_perms)));
  const id = Number(r.lastInsertRowid);
  C.audit(req, 'user.create', 'user', id, { username, role_id: b.role_id, department_id: b.department_id });
  C.notify([id], { title: `مرحبًا بك في نظام ${C.orgName()}`, body: 'ابدأ بتغيير كلمة المرور المؤقتة، ثم استكشف لوحة التحكم الخاصة بك.', link: '#/', kind: 'success' });
  res.json({ id, username, temp_password: password });
});

admin.patch('/users/:id', C.requirePerm('users.manage'), (req, res) => {
  const id = Number(req.params.id);
  const u = get(USERS_SQL + ' WHERE u.id = ?', id);
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  if (u.role_key === 'owner' && !req.user.isOwner) return res.status(403).json({ error: 'لا يمكن تعديل حساب المضيف الرئيسي' });
  const b = req.body || {};
  if ('role_id' in b) {
    const rp = validRole(req, num(b.role_id)); if (rp) return bad(res, rp);
    if (u.role_key === 'owner' && id === req.user.id && get('SELECT key FROM roles WHERE id = ?', num(b.role_id)).key !== 'owner') {
      const owners = get("SELECT COUNT(*) c FROM users u JOIN roles r ON r.id = u.role_id WHERE r.key = 'owner' AND u.is_active = 1").c;
      if (owners <= 1) return bad(res, 'لا يمكن إزالة آخر مضيف رئيسي');
    }
  }
  if ('is_active' in b && !b.is_active && id === req.user.id) return bad(res, 'لا يمكنك إيقاف حسابك');
  const fields = { full_name: (v) => str(v, 120), email: (v) => str(v, 120), phone: (v) => str(v, 40), job_title: (v) => str(v, 120),
    department_id: num, role_id: num, is_active: (v) => (v ? 1 : 0),
    extra_perms: (v) => JSON.stringify(cleanPerms(v)), denied_perms: (v) => JSON.stringify(cleanPerms(v)) };
  const sets = []; const vals = [];
  for (const [f, fn] of Object.entries(fields)) if (f in b) { sets.push(`${f} = ?`); vals.push(fn(b[f])); }
  if (!sets.length) return bad(res, 'لا توجد تعديلات');
  if ('full_name' in b && !str(b.full_name)) return bad(res, 'الاسم مطلوب');
  run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...vals, id);
  if ('is_active' in b && !b.is_active) C.destroyUserSessions(id);
  C.audit(req, 'user.update', 'user', id, b);
  res.json({ ok: true });
});

admin.post('/users/:id/reset-password', C.requirePerm('users.manage'), (req, res) => {
  const id = Number(req.params.id);
  const u = get(USERS_SQL + ' WHERE u.id = ?', id);
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  if (u.role_key === 'owner' && !req.user.isOwner) return res.status(403).json({ error: 'لا يمكن تعديل حساب المضيف الرئيسي' });
  const password = (req.body && req.body.password) ? String(req.body.password) : C.generatePassword();
  const pp = C.passwordProblem(password); if (pp) return bad(res, pp);
  run('UPDATE users SET password_hash = ?, must_change_password = 1, failed_attempts = 0, locked_until = NULL WHERE id = ?', C.hashPassword(password), id);
  C.destroyUserSessions(id);
  C.audit(req, 'user.reset_password', 'user', id, { username: u.username });
  res.json({ ok: true, temp_password: password });
});

admin.post('/users/:id/unlock', C.requirePerm('users.manage'), (req, res) => {
  run('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', Number(req.params.id));
  C.audit(req, 'user.unlock', 'user', Number(req.params.id));
  res.json({ ok: true });
});
admin.post('/users/:id/logout-all', C.requirePerm('users.manage'), (req, res) => {
  C.destroyUserSessions(Number(req.params.id));
  C.audit(req, 'user.force_logout', 'user', Number(req.params.id));
  res.json({ ok: true });
});

// ---------- roles
admin.get('/roles', C.requirePerm('roles.manage', 'users.manage'), (req, res) => {
  res.json(all('SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) AS users_count FROM roles r ORDER BY r.id')
    .map((r) => ({ ...r, permissions: json(r.permissions) })));
});
admin.post('/roles', C.requirePerm('roles.manage'), (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80); if (!name) return bad(res, 'اسم الدور مطلوب');
  const key = 'r' + Date.now().toString(36);
  const r = run('INSERT INTO roles(key, name, description, permissions) VALUES(?,?,?,?)', key, name, str(b.description, 300), JSON.stringify(cleanPerms(b.permissions)));
  C.audit(req, 'role.create', 'role', Number(r.lastInsertRowid), { name });
  res.json({ id: Number(r.lastInsertRowid) });
});
admin.patch('/roles/:id', C.requirePerm('roles.manage'), (req, res) => {
  const r = get('SELECT * FROM roles WHERE id = ?', Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'غير موجود' });
  if (r.key === 'owner') return bad(res, 'دور المضيف الرئيسي يملك جميع الصلاحيات دائمًا ولا يُعدّل');
  const b = req.body || {};
  if ('name' in b && !str(b.name)) return bad(res, 'الاسم مطلوب');
  run('UPDATE roles SET name = COALESCE(?, name), description = COALESCE(?, description), permissions = COALESCE(?, permissions) WHERE id = ?',
    str(b.name, 80), str(b.description, 300), 'permissions' in b ? JSON.stringify(cleanPerms(b.permissions)) : null, r.id);
  C.audit(req, 'role.update', 'role', r.id, b);
  res.json({ ok: true });
});
admin.delete('/roles/:id', C.requirePerm('roles.manage'), (req, res) => {
  const r = get('SELECT * FROM roles WHERE id = ?', Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'غير موجود' });
  if (r.system) return bad(res, 'لا يمكن حذف دور أساسي');
  if (get('SELECT COUNT(*) c FROM users WHERE role_id = ?', r.id).c) return bad(res, 'انقل المستخدمين لدور آخر قبل الحذف');
  run('DELETE FROM roles WHERE id = ?', r.id);
  C.audit(req, 'role.delete', 'role', r.id, { name: r.name });
  res.json({ ok: true });
});

// ---------- departments
admin.get('/departments', (req, res) => {
  res.json(all(`SELECT d.*, (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = 1) AS users_count,
      h.full_name AS head_name FROM departments d LEFT JOIN users h ON h.id = d.head_user_id ORDER BY d.id`)
    .map((d) => ({ ...d, permissions: C.can(req.user, 'departments.manage') || C.can(req.user, 'roles.manage') ? json(d.permissions) : undefined })));
});
admin.post('/departments', C.requirePerm('departments.manage'), (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 120); if (!name) return bad(res, 'اسم الإدارة مطلوب');
  const key = str(b.key, 30) || 'd' + Date.now().toString(36);
  if (!/^[a-z0-9_]+$/.test(key)) return bad(res, 'المعرّف بالإنجليزية الصغيرة فقط');
  if (get('SELECT 1 FROM departments WHERE key = ?', key)) return bad(res, 'المعرّف مستخدم');
  const r = run('INSERT INTO departments(key, name, description, color, icon, permissions) VALUES(?,?,?,?,?,?)', key, name, str(b.description, 300),
    /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : '#01a453', str(b.icon, 20) || 'layers', JSON.stringify(cleanPerms(b.permissions)));
  const id = Number(r.lastInsertRowid);
  run("INSERT INTO channels(name, description, kind, department_id, created_by) VALUES(?,?,?,?,?)", name, 'قناة داخلية خاصة بأفراد الإدارة', 'department', id, req.user.id);
  C.audit(req, 'department.create', 'department', id, { name });
  res.json({ id });
});
admin.patch('/departments/:id', C.requirePerm('departments.manage', 'roles.manage'), (req, res) => {
  const d = get('SELECT * FROM departments WHERE id = ?', Number(req.params.id));
  if (!d) return res.status(404).json({ error: 'غير موجود' });
  const b = req.body || {};
  if ('permissions' in b && !C.can(req.user, 'roles.manage')) return res.status(403).json({ error: 'تعديل صلاحيات الإدارات يتطلب صلاحية إدارة الأدوار' });
  if (['name', 'description', 'color', 'head_user_id'].some((k) => k in b) && !C.can(req.user, 'departments.manage')) return res.status(403).json({ error: 'لا تملك صلاحية تعديل الإدارات' });
  run(`UPDATE departments SET name = COALESCE(?, name), description = COALESCE(?, description), color = COALESCE(?, color),
      head_user_id = CASE WHEN ? THEN ? ELSE head_user_id END, permissions = COALESCE(?, permissions) WHERE id = ?`,
  str(b.name, 120), str(b.description, 300), /^#[0-9a-f]{6}$/i.test(b.color || '') ? b.color : null,
  'head_user_id' in b ? 1 : 0, num(b.head_user_id), 'permissions' in b ? JSON.stringify(cleanPerms(b.permissions)) : null, d.id);
  if (b.name) run("UPDATE channels SET name = ? WHERE department_id = ? AND kind = 'department'", str(b.name, 120), d.id);
  C.audit(req, 'department.update', 'department', d.id, b);
  res.json({ ok: true });
});
admin.delete('/departments/:id', C.requirePerm('departments.manage'), (req, res) => {
  const d = get('SELECT * FROM departments WHERE id = ?', Number(req.params.id));
  if (!d) return res.status(404).json({ error: 'غير موجود' });
  if (['gm', 'secretariat', 'projects', 'logistics', 'finance', 'media'].includes(d.key)) return bad(res, 'هذه إدارة أساسية مرتبطة بسير العمل ولا يمكن حذفها');
  if (get('SELECT COUNT(*) c FROM users WHERE department_id = ?', d.id).c) return bad(res, 'انقل الموظفين أولًا');
  run('DELETE FROM departments WHERE id = ?', d.id);
  C.audit(req, 'department.delete', 'department', d.id, { name: d.name });
  res.json({ ok: true });
});

// ---------- access matrix: who can enter what
admin.get('/access-matrix', C.requirePerm('roles.manage', 'users.manage'), (req, res) => {
  const users = all('SELECT id FROM users WHERE is_active = 1 ORDER BY department_id, full_name').map((r) => C.loadUser(r.id));
  res.json(users.map((u) => ({ id: u.id, full_name: u.full_name, dept_name: u.dept_name, role_name: u.role_name, perms: [...u.perms] })));
});

// ---------- audit log
admin.get('/audit', C.requirePerm('audit.view'), (req, res) => {
  const { q, user_id, action } = req.query;
  let sql = 'SELECT a.*, u.full_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id WHERE 1=1';
  const p = [];
  if (user_id) { sql += ' AND a.user_id = ?'; p.push(Number(user_id)); }
  if (action) { sql += ' AND a.action LIKE ?'; p.push(action + '%'); }
  if (q) { sql += ' AND (a.details LIKE ? OR a.action LIKE ? OR a.username LIKE ?)'; p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' ORDER BY a.id DESC LIMIT 500';
  res.json(all(sql, ...p));
});

// ---------- settings & backup
const SETTINGS_KEYS = ['org_name', 'org_name_en', 'default_admin_fee_pct', 'currency', 'sla_warning_days', 'welcome_message', 'media_upload_link'];
admin.get('/settings', (req, res) => {
  const out = {};
  for (const k of SETTINGS_KEYS) out[k] = getSetting(k);
  res.json(out);
});
admin.put('/settings', C.requirePerm('settings.manage'), (req, res) => {
  const b = req.body || {};
  for (const k of SETTINGS_KEYS) if (k in b) setSetting(k, str(b[k], 1000) || '');
  C.audit(req, 'settings.update', 'settings', null, b);
  res.json({ ok: true });
});
admin.get('/backup', C.requirePerm('settings.manage'), (req, res) => {
  const file = path.join(DATA_DIR, `backup-${Date.now()}.sqlite`);
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  C.audit(req, 'settings.backup', 'settings', null);
  res.download(file, `crb-backup-${new Date().toISOString().slice(0, 10)}.sqlite`, () => fs.unlink(file, () => {}));
});

module.exports = { auth, admin };
