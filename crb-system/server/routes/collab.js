'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { all, get, run, json, DATA_DIR } = require('../db');
const C = require('../core');
const { PROJECT_STAGES, REQUEST_STAGES } = require('../workflows');
const { canSeeRequest, canActStage } = require('./workflow');
const { str, num, date, bad, oneOf } = require('../validate');

const router = express.Router();
const P = C.requirePerm;

// ================================================================ FILES
const UPLOAD_DIR = process.env.CRB_UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const BLOCKED_EXT = /\.(exe|bat|cmd|com|msi|sh|ps1|js|mjs|html?|svg|php|jar|vbs|scr)$/i;
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: Number(process.env.CRB_MAX_UPLOAD_MB || 25) * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(BLOCKED_EXT.test(file.originalname) ? new Error('نوع الملف غير مسموح') : null, !BLOCKED_EXT.test(file.originalname)),
});

function channelAccess(user, ch) {
  if (!ch || !C.can(user, 'chat.use')) return false;
  if (ch.kind === 'public') return true;
  if (ch.kind === 'project') return C.can(user, 'projects.view');
  if (ch.kind === 'department') return user.department_id === ch.department_id || user.isOwner || user.role_key === 'gm' || user.dept_key === 'gm';
  return !!get('SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?', ch.id, user.id);
}
function entityAccess(user, type, id) {
  switch (type) {
    case 'project': return C.can(user, 'projects.view') && !!get('SELECT 1 FROM projects WHERE id = ?', id);
    case 'request': { const r = get('SELECT * FROM requests WHERE id = ?', id); return !!r && canSeeRequest(user, r); }
    case 'channel': return channelAccess(user, get('SELECT * FROM channels WHERE id = ?', id));
    case 'meeting': return C.can(user, 'meetings.view');
    case 'task': { const t = get('SELECT * FROM tasks WHERE id = ?', id); return !!t && (t.assignee_id === user.id || t.created_by === user.id || C.can(user, 'tasks.assign')); }
    case 'general': return C.can(user, 'files.view');
    default: return false;
  }
}

router.post('/files', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return bad(res, err.code === 'LIMIT_FILE_SIZE' ? 'حجم الملف أكبر من المسموح' : err.message);
    if (!req.file) return bad(res, 'اختر ملفًا');
    const type = oneOf(req.body.entity_type, ['project', 'request', 'channel', 'meeting', 'task', 'general'], null);
    const id = num(req.body.entity_id);
    if (!type || !entityAccess(req.user, type, id)) { fs.unlink(req.file.path, () => {}); return res.status(403).json({ error: 'لا تملك صلاحية الإرفاق هنا' }); }
    const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, 200);
    const r = run('INSERT INTO files(entity_type, entity_id, category, original_name, stored_name, mime, size, uploaded_by) VALUES(?,?,?,?,?,?,?,?)',
      type, id, str(req.body.category, 60) || 'عام', name, req.file.filename, req.file.mimetype, req.file.size, req.user.id);
    if (type === 'project' || type === 'request') {
      const e = get(`SELECT current_stage FROM ${type}s WHERE id = ?`, id);
      run('INSERT INTO workflow_events(entity_type, entity_id, stage, action, user_id, note) VALUES(?,?,?,?,?,?)', type, id, e.current_stage, 'file', req.user.id, `إرفاق ملف: ${name}`);
    }
    C.audit(req, 'file.upload', type, id, { name });
    res.json({ id: Number(r.lastInsertRowid), name });
  });
});
router.get('/files/:id/download', (req, res) => {
  const f = get('SELECT * FROM files WHERE id = ?', Number(req.params.id));
  if (!f || !(entityAccess(req.user, f.entity_type, f.entity_id) || (C.can(req.user, 'files.view') && ['project', 'general'].includes(f.entity_type)))) return res.status(404).json({ error: 'غير موجود' });
  const inline = req.query.inline === '1' && /^(image\/(png|jpe?g|gif|webp)|application\/pdf)$/.test(f.mime || '');
  res.setHeader('Content-Type', inline ? f.mime : 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.original_name)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.join(UPLOAD_DIR, path.basename(f.stored_name)));
});
router.delete('/files/:id', (req, res) => {
  const f = get('SELECT * FROM files WHERE id = ?', Number(req.params.id));
  if (!f) return res.status(404).json({ error: 'غير موجود' });
  if (f.uploaded_by !== req.user.id && !req.user.isOwner) return res.status(403).json({ error: 'يحذف الملف رافعه أو المضيف الرئيسي فقط' });
  run('DELETE FROM files WHERE id = ?', f.id);
  fs.unlink(path.join(UPLOAD_DIR, path.basename(f.stored_name)), () => {});
  C.audit(req, 'file.delete', f.entity_type, f.entity_id, { name: f.original_name });
  res.json({ ok: true });
});
router.get('/files', P('files.view'), (req, res) => {
  const rows = all(`SELECT f.id, f.entity_type, f.entity_id, f.category, f.original_name, f.mime, f.size, f.created_at, u.full_name AS uploaded_by_name,
      CASE f.entity_type WHEN 'project' THEN (SELECT code || ' — ' || title FROM projects WHERE id = f.entity_id)
        WHEN 'request' THEN (SELECT code || ' — ' || title FROM requests WHERE id = f.entity_id)
        WHEN 'meeting' THEN (SELECT title FROM meetings WHERE id = f.entity_id) ELSE NULL END AS entity_label
    FROM files f LEFT JOIN users u ON u.id = f.uploaded_by WHERE f.entity_type IN ('project','request','meeting','general') ORDER BY f.id DESC LIMIT 2000`);
  res.json(rows.filter((f) => f.entity_type !== 'request' || entityAccess(req.user, 'request', f.entity_id)));
});

// ================================================================ CHAT (ساحة النقاش)
router.get('/chat/channels', P('chat.use'), (req, res) => {
  const rows = all(`SELECT c.*, (SELECT MAX(id) FROM messages m WHERE m.channel_id = c.id AND m.deleted = 0) AS last_id,
      (SELECT created_at FROM messages m WHERE m.channel_id = c.id AND m.deleted = 0 ORDER BY id DESC LIMIT 1) AS last_at,
      COALESCE((SELECT last_read_id FROM channel_reads r WHERE r.channel_id = c.id AND r.user_id = ?), 0) AS last_read_id,
      d.color AS dept_color
    FROM channels c LEFT JOIN departments d ON d.id = c.department_id WHERE c.archived = 0 ORDER BY c.kind, c.id`, req.user.id)
    .filter((c) => channelAccess(req.user, c));
  for (const c of rows) {
    c.unread = c.last_id ? get('SELECT COUNT(*) c FROM messages WHERE channel_id = ? AND id > ? AND deleted = 0 AND user_id != ?', c.id, c.last_read_id, req.user.id).c : 0;
    if (c.kind === 'dm') {
      const other = get('SELECT u.id, u.full_name FROM channel_members m JOIN users u ON u.id = m.user_id WHERE m.channel_id = ? AND m.user_id != ?', c.id, req.user.id);
      c.name = other ? other.full_name : 'محادثة';
      c.other_user_id = other && other.id;
    }
    if (c.kind === 'project') {
      const pr = get('SELECT code, title, status FROM projects WHERE id = ?', c.project_id);
      if (pr) { c.name = pr.title; c.description = pr.code; c.closed = pr.status === 'closed'; }
    }
    if (c.kind === 'group') c.members = all('SELECT u.id, u.full_name FROM channel_members m JOIN users u ON u.id = m.user_id WHERE m.channel_id = ?', c.id);
  }
  res.json(rows);
});
router.post('/chat/channels', P('chat.manage'), (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80); if (!name) return bad(res, 'اسم القناة مطلوب');
  const kind = oneOf(b.kind, ['public', 'group'], 'public');
  const r = run('INSERT INTO channels(name, description, kind, created_by) VALUES(?,?,?,?)', name, str(b.description, 300), kind, req.user.id);
  const id = Number(r.lastInsertRowid);
  if (kind === 'group') {
    const members = [...new Set([req.user.id, ...(Array.isArray(b.members) ? b.members.map(Number) : [])])];
    for (const m of members) if (get('SELECT 1 FROM users WHERE id = ?', m)) run('INSERT OR IGNORE INTO channel_members(channel_id, user_id) VALUES(?,?)', id, m);
    C.notify(members, { title: `أُضفت إلى مجموعة النقاش: ${name}`, link: `#/chat/${id}`, kind: 'info' }, req.user.id);
  }
  C.audit(req, 'channel.create', 'channel', id, { name, kind });
  res.json({ id });
});
router.patch('/chat/channels/:id', P('chat.manage'), (req, res) => {
  const ch = get('SELECT * FROM channels WHERE id = ?', Number(req.params.id)); if (!ch || ch.kind === 'dm') return res.status(404).json({ error: 'غير موجود' });
  const b = req.body || {};
  run('UPDATE channels SET name = COALESCE(?, name), description = COALESCE(?, description), archived = ? WHERE id = ?', str(b.name, 80), str(b.description, 300), b.archived ? 1 : 0, ch.id);
  C.audit(req, 'channel.update', 'channel', ch.id, b);
  res.json({ ok: true });
});
router.post('/chat/dm', P('chat.use'), (req, res) => {
  const other = num((req.body || {}).user_id);
  if (!other || other === req.user.id || !get('SELECT 1 FROM users WHERE id = ? AND is_active = 1', other)) return bad(res, 'اختر زميلًا');
  const key = [req.user.id, other].sort((a, b) => a - b).join(':');
  let ch = get('SELECT id FROM channels WHERE dm_key = ?', key);
  if (!ch) {
    const r = run("INSERT INTO channels(name, kind, dm_key, created_by) VALUES('محادثة خاصة','dm',?,?)", key, req.user.id);
    ch = { id: Number(r.lastInsertRowid) };
    run('INSERT INTO channel_members(channel_id, user_id) VALUES(?,?),(?,?)', ch.id, req.user.id, ch.id, other);
  }
  res.json({ id: ch.id });
});

function messageRows(where, ...params) {
  const rows = all(`SELECT m.*, u.full_name, u.username, d.color AS dept_color, d.name AS dept_name, f.original_name AS file_name, f.mime AS file_mime,
      rm.body AS reply_body, ru.full_name AS reply_name
    FROM messages m LEFT JOIN users u ON u.id = m.user_id LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN files f ON f.id = m.file_id LEFT JOIN messages rm ON rm.id = m.reply_to LEFT JOIN users ru ON ru.id = rm.user_id
    WHERE ${where}`, ...params);
  for (const m of rows) {
    if (m.deleted) { m.body = ''; m.file_id = null; }
    m.reactions = all('SELECT emoji, COUNT(*) AS n, GROUP_CONCAT(user_id) AS users FROM message_reactions WHERE message_id = ? GROUP BY emoji', m.id)
      .map((r) => ({ emoji: r.emoji, n: r.n, users: String(r.users).split(',').map(Number) }));
  }
  return rows;
}
router.get('/chat/channels/:id/messages', P('chat.use'), (req, res) => {
  const ch = get('SELECT * FROM channels WHERE id = ?', Number(req.params.id));
  if (!channelAccess(req.user, ch)) return res.status(404).json({ error: 'القناة غير متاحة لك' });
  const after = num(req.query.after); const before = num(req.query.before);
  let rows;
  if (after) rows = messageRows('m.channel_id = ? AND m.id > ? ORDER BY m.id LIMIT 200', ch.id, after);
  else if (before) rows = messageRows('m.channel_id = ? AND m.id < ? ORDER BY m.id DESC LIMIT 50', ch.id, before).reverse();
  else rows = messageRows('m.channel_id = ? ORDER BY m.id DESC LIMIT 60', ch.id).reverse();
  const pinned = messageRows('m.channel_id = ? AND m.pinned = 1 AND m.deleted = 0 ORDER BY m.id DESC LIMIT 10', ch.id);
  const lastId = rows.length ? rows[rows.length - 1].id : 0;
  if (lastId) run(`INSERT INTO channel_reads(channel_id, user_id, last_read_id) VALUES(?,?,?)
    ON CONFLICT(channel_id, user_id) DO UPDATE SET last_read_id = MAX(last_read_id, excluded.last_read_id)`, ch.id, req.user.id, lastId);
  const members = ch.kind === 'department' ? all('SELECT id, full_name FROM users WHERE department_id = ? AND is_active = 1', ch.department_id)
    : ['group', 'dm'].includes(ch.kind) ? all('SELECT u.id, u.full_name FROM channel_members m JOIN users u ON u.id = m.user_id WHERE m.channel_id = ?', ch.id) : null;
  res.json({ channel: ch, messages: rows, pinned, members, canManage: C.can(req.user, 'chat.manage') });
});
router.post('/chat/channels/:id/messages', P('chat.use'), (req, res) => {
  const ch = get('SELECT * FROM channels WHERE id = ?', Number(req.params.id));
  if (!channelAccess(req.user, ch) || ch.archived) return res.status(404).json({ error: 'القناة غير متاحة لك' });
  const b = req.body || {};
  const body = str(b.body, 5000);
  const fileId = num(b.file_id);
  if (!body && !fileId) return bad(res, 'اكتب رسالة');
  if (fileId) { const f = get('SELECT * FROM files WHERE id = ?', fileId); if (!f || f.entity_type !== 'channel' || f.entity_id !== ch.id) return bad(res, 'ملف غير صالح'); }
  const replyTo = num(b.reply_to);
  const r = run('INSERT INTO messages(channel_id, user_id, body, reply_to, file_id) VALUES(?,?,?,?,?)', ch.id, req.user.id, body || '📎', replyTo, fileId);
  const id = Number(r.lastInsertRowid);
  run(`INSERT INTO channel_reads(channel_id, user_id, last_read_id) VALUES(?,?,?)
    ON CONFLICT(channel_id, user_id) DO UPDATE SET last_read_id = excluded.last_read_id`, ch.id, req.user.id, id);
  // @mentions → notifications
  const names = [...new Set(((body || '').match(/@([a-zA-Z0-9._-]{3,40})/g) || []).map((s) => s.slice(1).toLowerCase()))];
  const chName = ch.kind === 'dm' ? 'محادثة خاصة' : ch.name;
  const mentioned = names.map((n) => get('SELECT id FROM users WHERE username = ? AND is_active = 1', n)).filter(Boolean).map((u) => u.id)
    .filter((uid) => channelAccess(C.loadUser(uid), ch));
  C.notify(mentioned, { title: `${req.user.full_name} أشار إليك في ${chName}`, body: (body || '').slice(0, 140), link: `#/chat/${ch.id}`, kind: 'mention' }, req.user.id);
  if (ch.kind === 'dm') {
    const other = get('SELECT user_id FROM channel_members WHERE channel_id = ? AND user_id != ?', ch.id, req.user.id);
    const recent = other && get("SELECT 1 FROM notifications WHERE user_id = ? AND link = ? AND read_at IS NULL AND created_at > datetime('now','-10 minutes')", other.user_id, `#/chat/${ch.id}`);
    if (other && !recent) C.notify([other.user_id], { title: `رسالة خاصة من ${req.user.full_name}`, body: (body || '').slice(0, 140), link: `#/chat/${ch.id}`, kind: 'message' });
  }
  res.json({ id });
});
router.patch('/chat/messages/:id', P('chat.use'), (req, res) => {
  const m = get('SELECT * FROM messages WHERE id = ?', Number(req.params.id));
  if (!m || m.user_id !== req.user.id || m.deleted) return res.status(403).json({ error: 'يمكنك تعديل رسائلك فقط' });
  const body = str((req.body || {}).body, 5000); if (!body) return bad(res, 'الرسالة فارغة');
  run("UPDATE messages SET body = ?, edited_at = datetime('now') WHERE id = ?", body, m.id);
  res.json({ ok: true });
});
router.delete('/chat/messages/:id', P('chat.use'), (req, res) => {
  const m = get('SELECT * FROM messages WHERE id = ?', Number(req.params.id));
  if (!m) return res.status(404).json({ error: 'غير موجود' });
  if (m.user_id !== req.user.id && !C.can(req.user, 'chat.manage')) return res.status(403).json({ error: 'لا يمكنك حذف رسالة غيرك' });
  run('UPDATE messages SET deleted = 1, pinned = 0 WHERE id = ?', m.id);
  if (m.user_id !== req.user.id) C.audit(req, 'message.delete', 'channel', m.channel_id, { message: m.id });
  res.json({ ok: true });
});
router.post('/chat/messages/:id/pin', P('chat.manage'), (req, res) => {
  const m = get('SELECT * FROM messages WHERE id = ?', Number(req.params.id)); if (!m) return res.status(404).json({ error: 'غير موجود' });
  run('UPDATE messages SET pinned = ? WHERE id = ?', m.pinned ? 0 : 1, m.id);
  res.json({ ok: true });
});
router.post('/chat/messages/:id/react', P('chat.use'), (req, res) => {
  const m = get('SELECT * FROM messages WHERE id = ?', Number(req.params.id));
  if (!m || !channelAccess(req.user, get('SELECT * FROM channels WHERE id = ?', m.channel_id))) return res.status(404).json({ error: 'غير موجود' });
  const emoji = oneOf((req.body || {}).emoji, ['👍', '✅', '❤️', '👏', '🙏', '👀'], null); if (!emoji) return bad(res, 'تفاعل غير صالح');
  const has = get('SELECT 1 FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', m.id, req.user.id, emoji);
  if (has) run('DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', m.id, req.user.id, emoji);
  else run('INSERT INTO message_reactions(message_id, user_id, emoji) VALUES(?,?,?)', m.id, req.user.id, emoji);
  res.json({ ok: true });
});

// ================================================================ ANNOUNCEMENTS (التعميمات)
router.get('/announcements', (req, res) => {
  const rows = all(`SELECT a.*, u.full_name AS author, d.name AS audience_name,
      (SELECT read_at FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = ?) AS my_read,
      (SELECT COUNT(*) FROM announcement_reads r WHERE r.announcement_id = a.id) AS reads
    FROM announcements a LEFT JOIN users u ON u.id = a.created_by LEFT JOIN departments d ON d.id = a.audience_dept_id
    WHERE (a.expires_at IS NULL OR a.expires_at >= date('now')) ORDER BY a.id DESC`, req.user.id)
    .filter((a) => !a.audience_dept_id || a.audience_dept_id === req.user.department_id || C.can(req.user, 'announcements.publish'));
  const canPublish = C.can(req.user, 'announcements.publish');
  for (const a of rows) {
    if (canPublish) {
      a.audience_total = a.audience_dept_id ? get('SELECT COUNT(*) c FROM users WHERE department_id = ? AND is_active = 1', a.audience_dept_id).c : get('SELECT COUNT(*) c FROM users WHERE is_active = 1').c;
      a.readers = all('SELECT u.full_name, r.read_at FROM announcement_reads r JOIN users u ON u.id = r.user_id WHERE announcement_id = ?', a.id);
    }
  }
  res.json(rows);
});
router.post('/announcements', P('announcements.publish'), (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 200); const body = str(b.body, 8000);
  if (!title || !body) return bad(res, 'العنوان والنص مطلوبان');
  const dept = num(b.audience_dept_id);
  const r = run('INSERT INTO announcements(title, body, priority, audience_dept_id, require_ack, created_by, expires_at) VALUES(?,?,?,?,?,?,?)',
    title, body, oneOf(b.priority, ['normal', 'important', 'urgent'], 'normal'), dept, b.require_ack ? 1 : 0, req.user.id, date(b.expires_at));
  const targets = dept ? all('SELECT id FROM users WHERE department_id = ? AND is_active = 1', dept) : all('SELECT id FROM users WHERE is_active = 1');
  C.notify(targets.map((t) => t.id), { title: `📢 تعميم: ${title}`, body: body.slice(0, 140), link: '#/announcements', kind: 'announcement' }, req.user.id);
  C.audit(req, 'announcement.create', 'announcement', Number(r.lastInsertRowid), { title });
  res.json({ id: Number(r.lastInsertRowid) });
});
router.post('/announcements/:id/ack', (req, res) => {
  run('INSERT OR IGNORE INTO announcement_reads(announcement_id, user_id) VALUES(?,?)', Number(req.params.id), req.user.id);
  res.json({ ok: true });
});
router.delete('/announcements/:id', P('announcements.publish'), (req, res) => {
  run('DELETE FROM announcements WHERE id = ?', Number(req.params.id));
  C.audit(req, 'announcement.delete', 'announcement', Number(req.params.id));
  res.json({ ok: true });
});

// ================================================================ TASKS
router.get('/tasks', P('tasks.use'), (req, res) => {
  const scope = req.query.scope || 'mine';
  let where = 't.assignee_id = ?'; const p = [req.user.id];
  if (scope === 'created') where = 't.created_by = ?';
  else if (scope === 'dept') {
    if (!C.can(req.user, 'tasks.assign')) return res.status(403).json({ error: 'غير مسموح' });
    where = 'u.department_id = ?'; p[0] = req.user.department_id;
  } else if (scope === 'all') {
    if (!req.user.isOwner && !C.can(req.user, 'workflow.approve')) return res.status(403).json({ error: 'غير مسموح' });
    where = '1=1'; p.length = 0;
  }
  res.json(all(`SELECT t.*, u.full_name AS assignee_name, cb.full_name AS created_by_name, pr.code AS project_code, rq.code AS request_code
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id LEFT JOIN users cb ON cb.id = t.created_by
    LEFT JOIN projects pr ON pr.id = t.project_id LEFT JOIN requests rq ON rq.id = t.request_id
    WHERE ${where} ORDER BY t.status = 'done', COALESCE(t.due_date, '9999'), t.id DESC`, ...p));
});
router.post('/tasks', P('tasks.use'), (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 200); if (!title) return bad(res, 'عنوان المهمة مطلوب');
  const assignee = num(b.assignee_id) || req.user.id;
  if (assignee !== req.user.id && !C.can(req.user, 'tasks.assign')) return res.status(403).json({ error: 'إسناد المهام للآخرين يتطلب صلاحية «إسناد المهام»' });
  const r = run('INSERT INTO tasks(title, description, assignee_id, created_by, project_id, request_id, meeting_id, due_date, priority, status) VALUES(?,?,?,?,?,?,?,?,?,?)',
    title, str(b.description, 4000), assignee, req.user.id, num(b.project_id), num(b.request_id), num(b.meeting_id), date(b.due_date),
    oneOf(b.priority, ['low', 'normal', 'high', 'urgent'], 'normal'), 'todo');
  if (assignee !== req.user.id) C.notify([assignee], { title: `مهمة جديدة من ${req.user.full_name}: ${title}`, body: b.due_date ? `الاستحقاق: ${b.due_date}` : '', link: '#/tasks', kind: 'action' });
  res.json({ id: Number(r.lastInsertRowid) });
});
router.patch('/tasks/:id', P('tasks.use'), (req, res) => {
  const t = get('SELECT * FROM tasks WHERE id = ?', Number(req.params.id)); if (!t) return res.status(404).json({ error: 'غير موجود' });
  if (t.assignee_id !== req.user.id && t.created_by !== req.user.id && !req.user.isOwner) return res.status(403).json({ error: 'غير مسموح' });
  const b = req.body || {};
  const status = oneOf(b.status, ['todo', 'doing', 'review', 'done'], t.status);
  run(`UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), due_date = COALESCE(?, due_date),
     priority = ?, status = ?, completed_at = CASE WHEN ? = 'done' THEN COALESCE(completed_at, datetime('now')) ELSE NULL END WHERE id = ?`,
  str(b.title, 200), str(b.description, 4000), date(b.due_date), oneOf(b.priority, ['low', 'normal', 'high', 'urgent'], t.priority), status, status, t.id);
  if (status !== t.status && t.created_by !== req.user.id && ['review', 'done'].includes(status)) {
    C.notify([t.created_by], { title: `${req.user.full_name}: ${status === 'done' ? 'أنجز' : 'رفع للمراجعة'} المهمة «${t.title}»`, link: '#/tasks', kind: 'success' });
  }
  res.json({ ok: true });
});
router.delete('/tasks/:id', P('tasks.use'), (req, res) => {
  const t = get('SELECT * FROM tasks WHERE id = ?', Number(req.params.id)); if (!t) return res.status(404).json({ error: 'غير موجود' });
  if (t.created_by !== req.user.id && !req.user.isOwner) return res.status(403).json({ error: 'يحذف المهمة منشئها فقط' });
  run('DELETE FROM tasks WHERE id = ?', t.id);
  res.json({ ok: true });
});

// ================================================================ MEETINGS
router.get('/meetings', P('meetings.view'), (req, res) => {
  const rows = all(`SELECT m.*, u.full_name AS created_by_name FROM meetings m LEFT JOIN users u ON u.id = m.created_by ORDER BY m.meeting_date DESC`);
  for (const m of rows) {
    const ids = json(m.attendees);
    m.attendees = ids.length ? all(`SELECT id, full_name FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids) : [];
    m.tasks = all('SELECT t.id, t.title, t.status, u.full_name AS assignee_name, t.due_date FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id WHERE meeting_id = ?', m.id);
  }
  res.json(rows);
});
router.post('/meetings', P('meetings.manage'), (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 200); if (!title) return bad(res, 'عنوان الاجتماع مطلوب');
  const att = Array.isArray(b.attendees) ? [...new Set(b.attendees.map(Number).filter(Boolean))] : [];
  const r = run('INSERT INTO meetings(title, meeting_date, location, agenda, minutes, attendees, status, created_by) VALUES(?,?,?,?,?,?,?,?)',
    title, date(b.meeting_date), str(b.location, 200), str(b.agenda, 8000), str(b.minutes, 20000), JSON.stringify(att), 'scheduled', req.user.id);
  C.notify(att, { title: `دعوة لاجتماع: ${title}`, body: `${(b.meeting_date || '').replace('T', ' ')} — ${b.location || ''}`, link: '#/meetings', kind: 'info' }, req.user.id);
  res.json({ id: Number(r.lastInsertRowid) });
});
router.patch('/meetings/:id', P('meetings.manage'), (req, res) => {
  const m = get('SELECT * FROM meetings WHERE id = ?', Number(req.params.id)); if (!m) return res.status(404).json({ error: 'غير موجود' });
  const b = req.body || {};
  run(`UPDATE meetings SET title = COALESCE(?, title), meeting_date = COALESCE(?, meeting_date), location = ?, agenda = ?, minutes = ?,
     attendees = COALESCE(?, attendees), status = ? WHERE id = ?`,
  str(b.title, 200), date(b.meeting_date), 'location' in b ? str(b.location, 200) : m.location, 'agenda' in b ? str(b.agenda, 8000) : m.agenda,
  'minutes' in b ? str(b.minutes, 20000) : m.minutes, Array.isArray(b.attendees) ? JSON.stringify([...new Set(b.attendees.map(Number))]) : null,
  oneOf(b.status, ['scheduled', 'done', 'cancelled'], m.status), m.id);
  res.json({ ok: true });
});
router.delete('/meetings/:id', P('meetings.manage'), (req, res) => { run('DELETE FROM meetings WHERE id = ?', Number(req.params.id)); res.json({ ok: true }); });

// ================================================================ LEAVES
router.get('/leaves', P('leaves.request', 'leaves.approve'), (req, res) => {
  const approver = C.can(req.user, 'leaves.approve');
  res.json(all(`SELECT l.*, u.full_name, d.name AS dept_name, dl.full_name AS delegate_name, db.full_name AS decided_by_name
    FROM leaves l JOIN users u ON u.id = l.user_id LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN users dl ON dl.id = l.delegate_id LEFT JOIN users db ON db.id = l.decided_by
    WHERE ${approver ? '1=1' : 'l.user_id = ?'} ORDER BY l.status != 'pending', l.id DESC`, ...(approver ? [] : [req.user.id])));
});
router.post('/leaves', P('leaves.request'), (req, res) => {
  const b = req.body || {};
  const s = date(b.start_date); const e = date(b.end_date);
  if (!s || !e || e < s) return bad(res, 'حدد تاريخ البداية والنهاية بشكل صحيح');
  const days = Math.round((new Date(e) - new Date(s)) / 864e5) + 1;
  const r = run('INSERT INTO leaves(user_id, kind, start_date, end_date, days, reason, delegate_id) VALUES(?,?,?,?,?,?,?)',
    req.user.id, oneOf(b.kind, ['annual', 'sick', 'emergency', 'unpaid', 'mission'], 'annual'), s, e, days, str(b.reason, 1000), num(b.delegate_id));
  C.notify(C.usersWithPerm('leaves.approve'), { title: `طلب إجازة من ${req.user.full_name}`, body: `${s} ← ${e} (${days} يوم)`, link: '#/leaves', kind: 'approval' }, req.user.id);
  res.json({ id: Number(r.lastInsertRowid) });
});
router.post('/leaves/:id/decide', P('leaves.approve'), (req, res) => {
  const l = get('SELECT * FROM leaves WHERE id = ?', Number(req.params.id)); if (!l) return res.status(404).json({ error: 'غير موجود' });
  if (l.user_id === req.user.id && !req.user.isOwner) return bad(res, 'لا يمكنك اعتماد إجازتك بنفسك');
  const status = oneOf((req.body || {}).status, ['approved', 'rejected'], null); if (!status) return bad(res, 'حدد القرار');
  run("UPDATE leaves SET status = ?, decided_by = ?, decided_at = datetime('now'), decision_note = ? WHERE id = ?", status, req.user.id, str((req.body || {}).note, 500), l.id);
  C.notify([l.user_id], { title: `طلب إجازتك: ${status === 'approved' ? 'مقبول ✅' : 'مرفوض'}`, body: str((req.body || {}).note, 140), link: '#/leaves', kind: status === 'approved' ? 'success' : 'error' });
  if (status === 'approved' && l.delegate_id) C.notify([l.delegate_id], { title: 'تم تعيينك بديلًا خلال إجازة زميل', body: `${l.start_date} ← ${l.end_date}`, link: '#/leaves', kind: 'info' });
  C.audit(req, 'leave.decide', 'leave', l.id, { status });
  res.json({ ok: true });
});

// ================================================================ NOTIFICATIONS / PEOPLE / SEARCH
router.get('/notifications', (req, res) => {
  res.json(all('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 150', req.user.id));
});
router.get('/pulse', (req, res) => {
  const unread = get('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at IS NULL', req.user.id).c;
  let chat = 0;
  if (C.can(req.user, 'chat.use')) {
    const chans = all('SELECT c.*, COALESCE((SELECT last_read_id FROM channel_reads r WHERE r.channel_id = c.id AND r.user_id = ?),0) AS lr FROM channels c WHERE archived = 0', req.user.id)
      .filter((c) => channelAccess(req.user, c));
    for (const c of chans) chat += get('SELECT COUNT(*) c FROM messages WHERE channel_id = ? AND id > ? AND deleted = 0 AND user_id != ?', c.id, c.lr, req.user.id).c;
  }
  const latest = get('SELECT id, title, kind FROM notifications WHERE user_id = ? AND read_at IS NULL ORDER BY id DESC LIMIT 1', req.user.id);
  res.json({ unread, chat, latest });
});
router.post('/notifications/:id/read', (req, res) => {
  run("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?", Number(req.params.id), req.user.id);
  res.json({ ok: true });
});
router.post('/notifications/read-all', (req, res) => {
  run("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL", req.user.id);
  res.json({ ok: true });
});

router.get('/people', (req, res) => {
  // light list for pickers (assignment, mentions, DMs)
  res.json(all(`SELECT u.id, u.username, u.full_name, u.job_title, u.department_id, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color
    FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.is_active = 1 ORDER BY d.id, u.full_name`));
});
router.get('/directory', P('directory.view'), (req, res) => {
  res.json(all(`SELECT u.id, u.username, u.full_name, u.job_title, u.email, u.phone, u.last_login, d.name AS dept_name, d.color AS dept_color, d.id AS department_id, r.name AS role_name,
      (SELECT 1 FROM leaves l WHERE l.user_id = u.id AND l.status = 'approved' AND date('now') BETWEEN l.start_date AND l.end_date) AS on_leave
    FROM users u LEFT JOIN departments d ON d.id = u.department_id JOIN roles r ON r.id = u.role_id WHERE u.is_active = 1 ORDER BY d.id, u.full_name`));
});

router.get('/search', (req, res) => {
  const q = str(req.query.q, 80); if (!q || q.length < 2) return res.json([]);
  const like = `%${q}%`; const out = [];
  if (C.can(req.user, 'projects.view')) all('SELECT id, code, title FROM projects WHERE title LIKE ? OR code LIKE ? OR donor LIKE ? LIMIT 8', like, like, like)
    .forEach((p) => out.push({ type: 'مشروع', label: `${p.code} — ${p.title}`, link: `#/projects/${p.id}` }));
  all('SELECT * FROM requests WHERE title LIKE ? OR code LIKE ? LIMIT 20', like, like).filter((r) => canSeeRequest(req.user, r)).slice(0, 8)
    .forEach((r) => out.push({ type: 'طلب', label: `${r.code} — ${r.title}`, link: `#/requests/${r.id}` }));
  if (C.can(req.user, 'directory.view')) all('SELECT id, full_name, job_title FROM users WHERE is_active = 1 AND (full_name LIKE ? OR username LIKE ?) LIMIT 6', like, like)
    .forEach((u) => out.push({ type: 'موظف', label: `${u.full_name}${u.job_title ? ' — ' + u.job_title : ''}`, link: `#/directory?u=${u.id}` }));
  if (C.can(req.user, 'logistics.view')) all('SELECT id, name FROM suppliers WHERE name LIKE ? LIMIT 5', like)
    .forEach((s) => out.push({ type: 'مورد', label: s.name, link: '#/logistics?tab=suppliers' }));
  if (C.can(req.user, 'tasks.use')) all('SELECT id, title FROM tasks WHERE (assignee_id = ? OR created_by = ?) AND title LIKE ? LIMIT 5', req.user.id, req.user.id, like)
    .forEach((t) => out.push({ type: 'مهمة', label: t.title, link: '#/tasks' }));
  res.json(out);
});

// ================================================================ DASHBOARD
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
router.get('/dashboard', (req, res) => {
  const u = req.user; const today = new Date().toISOString().slice(0, 10);
  const out = { today };
  // items waiting for me
  const mine = [];
  if (C.can(u, 'projects.view')) {
    for (const p of all("SELECT * FROM projects WHERE status = 'active'")) {
      const s = PROJECT_STAGES[p.current_stage - 1];
      const approval = p.stage_status === 'pending_approval';
      if ((approval && C.can(u, 'workflow.approve')) || (!approval && canActStage(u, s, p))) {
        mine.push({ type: 'project', id: p.id, code: p.code, title: p.title, stage: p.current_stage, stage_title: s.title, approval, since: p.stage_started_at, priority: p.priority });
      }
    }
  }
  for (const r of all("SELECT * FROM requests WHERE status = 'active'")) {
    if (!canSeeRequest(u, r)) continue;
    const s = REQUEST_STAGES[r.current_stage - 1];
    if (canActStage(u, s, r)) {
      const deadline = r.current_stage >= 4 ? r.assignee_deadline : r.current_stage === 3 ? r.sector_deadline : r.donor_deadline;
      mine.push({ type: 'request', id: r.id, code: r.code, title: r.title, stage: r.current_stage, stage_title: s.title, since: r.stage_started_at, deadline, overdue: deadline && deadline < today, priority: r.priority });
    }
  }
  out.myQueue = mine;
  out.myTasks = C.can(u, 'tasks.use') ? all("SELECT t.*, p.code AS project_code FROM tasks t LEFT JOIN projects p ON p.id = t.project_id WHERE t.assignee_id = ? AND t.status != 'done' ORDER BY COALESCE(t.due_date,'9999') LIMIT 8", u.id) : [];
  out.announcements = all(`SELECT a.id, a.title, a.priority, a.created_at, a.require_ack, (SELECT 1 FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = ?) AS read
    FROM announcements a WHERE (a.expires_at IS NULL OR a.expires_at >= date('now')) AND (a.audience_dept_id IS NULL OR a.audience_dept_id = ?) ORDER BY a.id DESC LIMIT 4`, u.id, u.department_id);

  if (C.can(u, 'projects.view')) {
    out.kpi = {
      activeProjects: get("SELECT COUNT(*) c FROM projects WHERE status = 'active'").c,
      closedProjects: get("SELECT COUNT(*) c FROM projects WHERE status = 'closed'").c,
      beneficiaries: get('SELECT COALESCE(SUM(beneficiaries),0) c FROM projects').c,
      pendingApprovals: get("SELECT COUNT(*) c FROM projects WHERE stage_status = 'pending_approval'").c + get("SELECT COUNT(*) c FROM contracts WHERE status = 'pending_signature'").c,
    };
    out.stageDistribution = PROJECT_STAGES.map((s) => ({ n: s.n, title: s.title, count: get("SELECT COUNT(*) c FROM projects WHERE status = 'active' AND current_stage = ?", s.n).c }));
    out.upcoming = all("SELECT id, code, title, execution_date, location FROM projects WHERE execution_date >= ? AND status = 'active' ORDER BY execution_date LIMIT 6", today);
    const projStalled = all("SELECT id, code, title, current_stage, stage_started_at FROM projects WHERE status = 'active'")
      .map((p) => ({ ...p, days: daysBetween(p.stage_started_at.slice(0, 10), today) })).filter((p) => p.days >= Number(require('../db').getSetting('sla_warning_days', 5)))
      .sort((a, b) => b.days - a.days).slice(0, 6);
    out.stalled = projStalled.map((p) => ({ ...p, stage_title: PROJECT_STAGES[p.current_stage - 1].title }));
  }
  if (C.can(u, 'requests.view') || C.can(u, 'requests.view_all')) {
    const reqs = all("SELECT * FROM requests WHERE status = 'active'").filter((r) => canSeeRequest(u, r));
    out.requestsKpi = { open: reqs.length, overdue: reqs.filter((r) => r.donor_deadline && r.donor_deadline < today).length };
  }
  if (C.can(u, 'errors.view')) {
    const m = today.slice(0, 7);
    out.errorsThisMonth = get('SELECT COUNT(*) c FROM errors WHERE substr(created_at,1,7) = ?', m).c;
    out.errorsByDept = all('SELECT d.name, d.color, COUNT(*) AS n FROM errors e LEFT JOIN departments d ON d.id = e.department_id WHERE substr(e.created_at,1,7) = ? GROUP BY e.department_id ORDER BY n DESC', m);
  }
  if (C.can(u, 'finance.view')) {
    out.finance = get("SELECT COALESCE(SUM(grant_amount),0) AS grants, COALESCE(SUM(net_amount),0) AS net, COALESCE(SUM(admin_fee_amount),0) AS fees FROM projects WHERE status = 'active'");
    out.finance.due = get("SELECT COALESCE(SUM(amount),0) s FROM claims WHERE status = 'approved'").s;
  }
  out.activity = C.can(u, 'projects.view') ? all(`SELECT w.*, u.full_name, CASE w.entity_type WHEN 'project' THEN p.code ELSE r.code END AS code
    FROM workflow_events w LEFT JOIN users u ON u.id = w.user_id LEFT JOIN projects p ON w.entity_type='project' AND p.id = w.entity_id
    LEFT JOIN requests r ON w.entity_type='request' AND r.id = w.entity_id WHERE w.entity_type = 'project' OR ? ORDER BY w.id DESC LIMIT 12`, C.can(u, 'requests.view_all') ? 1 : 0) : [];
  res.json(out);
});

// ================================================================ CALENDAR
router.get('/calendar', (req, res) => {
  const m = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : new Date().toISOString().slice(0, 7);
  const like = m + '%'; const u = req.user; const ev = [];
  if (C.can(u, 'projects.view')) all("SELECT id, code, title, execution_date FROM projects WHERE execution_date LIKE ?", like)
    .forEach((p) => ev.push({ date: p.execution_date, kind: 'execution', title: `تنفيذ ${p.code}: ${p.title}`, link: `#/projects/${p.id}` }));
  all('SELECT * FROM requests WHERE donor_deadline LIKE ? OR assignee_deadline LIKE ? OR sector_deadline LIKE ?', like, like, like).filter((r) => canSeeRequest(u, r)).forEach((r) => {
    if (r.donor_deadline && r.donor_deadline.startsWith(m)) ev.push({ date: r.donor_deadline, kind: 'deadline', title: `مهلة المانح ${r.code}`, link: `#/requests/${r.id}` });
    if (r.assignee_deadline && r.assignee_deadline.startsWith(m) && (r.assignee_id === u.id || C.can(u, 'requests.view_all'))) ev.push({ date: r.assignee_deadline, kind: 'deadline', title: `مهلة المكلف ${r.code}`, link: `#/requests/${r.id}` });
  });
  if (C.can(u, 'meetings.view')) all('SELECT id, title, meeting_date FROM meetings WHERE meeting_date LIKE ?', like)
    .forEach((x) => ev.push({ date: x.meeting_date.slice(0, 10), time: x.meeting_date.slice(11, 16), kind: 'meeting', title: x.title, link: '#/meetings' }));
  if (C.can(u, 'tasks.use')) all("SELECT id, title, due_date FROM tasks WHERE assignee_id = ? AND due_date LIKE ? AND status != 'done'", u.id, like)
    .forEach((t) => ev.push({ date: t.due_date, kind: 'task', title: t.title, link: '#/tasks' }));
  if (C.can(u, 'media.view')) all('SELECT id, title, scheduled_date FROM media_items WHERE scheduled_date LIKE ?', like)
    .forEach((x) => ev.push({ date: x.scheduled_date, kind: 'media', title: `تغطية: ${x.title}`, link: '#/media' }));
  all(`SELECT l.*, u.full_name FROM leaves l JOIN users u ON u.id = l.user_id WHERE l.status = 'approved' AND (l.start_date LIKE ? OR l.end_date LIKE ?)`, like, like)
    .forEach((l) => ev.push({ date: l.start_date < m + '-01' ? m + '-01' : l.start_date, kind: 'leave', title: `إجازة: ${l.full_name} (${l.days} يوم)`, link: '#/leaves' }));
  res.json({ month: m, events: ev });
});

// ================================================================ REPORTS
router.get('/reports', P('reports.view'), (req, res) => {
  const u = req.user;
  // average days spent per project stage (from completion/approval events)
  const stageDur = PROJECT_STAGES.map((s) => ({ n: s.n, title: s.title, days: null, samples: 0 }));
  for (const p of all('SELECT id, created_at FROM projects')) {
    const evs = all("SELECT stage, action, created_at FROM workflow_events WHERE entity_type='project' AND entity_id = ? AND action IN ('completed','approved','returned','created') ORDER BY id", p.id);
    let start = p.created_at;
    for (const e of evs) {
      if (e.action === 'created' || e.action === 'returned') { start = e.created_at; continue; }
      if (e.action === 'completed' && PROJECT_STAGES[e.stage - 1].approval) continue;
      const sd = stageDur[e.stage - 1];
      const d = (new Date(e.created_at + 'Z') - new Date(start + 'Z')) / 864e5;
      sd.days = ((sd.days || 0) * sd.samples + d) / (sd.samples + 1); sd.samples++;
      start = e.created_at;
    }
  }
  const closedReq = all("SELECT * FROM requests WHERE status = 'closed'");
  const onTime = closedReq.filter((r) => !r.donor_deadline || r.closed_at.slice(0, 10) <= r.donor_deadline).length;
  const errorsMonthly = all("SELECT substr(created_at,1,7) AS month, COUNT(*) AS n FROM errors WHERE created_at >= date('now','-11 months','start of month') GROUP BY month ORDER BY month");
  const errorsByDept = all('SELECT d.name, d.color, COUNT(*) AS n FROM errors e LEFT JOIN departments d ON d.id = e.department_id GROUP BY e.department_id ORDER BY n DESC');
  const byDonor = all("SELECT COALESCE(donor,'غير محدد') AS donor, COUNT(*) AS n, SUM(beneficiaries) AS beneficiaries" + (C.can(u, 'finance.view') ? ', SUM(grant_amount) AS grants' : '') + ' FROM projects GROUP BY donor ORDER BY n DESC');
  const bySector = all("SELECT COALESCE(sector,'غير محدد') AS sector, COUNT(*) AS n, SUM(beneficiaries) AS beneficiaries FROM projects GROUP BY sector ORDER BY n DESC");
  const deptLoad = all(`SELECT d.name, d.color,
      (SELECT COUNT(*) FROM tasks t JOIN users x ON x.id = t.assignee_id WHERE x.department_id = d.id AND t.status != 'done') AS open_tasks,
      (SELECT COUNT(*) FROM tasks t JOIN users x ON x.id = t.assignee_id WHERE x.department_id = d.id AND t.status = 'done') AS done_tasks,
      (SELECT COUNT(*) FROM errors e WHERE e.department_id = d.id) AS errors
    FROM departments d ORDER BY d.id`);
  res.json({
    stageDur, errorsMonthly, errorsByDept, byDonor, bySector, deptLoad,
    requests: { closed: closedReq.length, onTime, rate: closedReq.length ? Math.round((onTime / closedReq.length) * 100) : null },
    projects: get("SELECT COUNT(*) AS total, SUM(status='closed') AS closed, SUM(status='active') AS active, SUM(beneficiaries) AS beneficiaries FROM projects"),
  });
});

module.exports = router;
