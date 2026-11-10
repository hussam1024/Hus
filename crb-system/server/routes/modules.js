'use strict';
const express = require('express');
const { all, get, run } = require('../db');
const C = require('../core');
const { str, num, date, bad, oneOf } = require('../validate');

const router = express.Router();
const P = C.requirePerm;
const projectOpen = (id) => { const p = id && get('SELECT * FROM projects WHERE id = ?', id); return p && p.status === 'active' ? p : null; };
const wf = (type, id, stage, action, user, note) =>
  run('INSERT INTO workflow_events(entity_type, entity_id, stage, action, user_id, note) VALUES(?,?,?,?,?,?)', type, id, stage, action, user.id, note);

// ================================================================ LOGISTICS
router.get('/suppliers', P('logistics.view', 'finance.view'), (req, res) => {
  res.json(all(`SELECT s.*,
      (SELECT COUNT(*) FROM quotes q WHERE q.supplier_id = s.id) AS quotes_count,
      (SELECT COUNT(*) FROM quotes q WHERE q.supplier_id = s.id AND q.selected = 1) AS wins,
      (SELECT COALESCE(SUM(amount),0) FROM claims c WHERE c.supplier_id = s.id AND c.status = 'paid') AS paid_total,
      (SELECT COALESCE(SUM(amount),0) FROM claims c WHERE c.supplier_id = s.id AND c.status = 'approved') AS due_total
    FROM suppliers s ORDER BY s.is_active DESC, s.name`));
});
router.post('/suppliers', P('logistics.manage'), (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 160); if (!name) return bad(res, 'اسم المورد مطلوب');
  const r = run('INSERT INTO suppliers(name, category, contact_person, phone, email, address, rating, notes) VALUES(?,?,?,?,?,?,?,?)',
    name, str(b.category, 80), str(b.contact_person, 120), str(b.phone, 40), str(b.email, 120), str(b.address, 200), Math.max(0, Math.min(5, num(b.rating) || 0)), str(b.notes, 2000));
  C.audit(req, 'supplier.create', 'supplier', Number(r.lastInsertRowid), { name });
  res.json({ id: Number(r.lastInsertRowid) });
});
router.patch('/suppliers/:id', P('logistics.manage'), (req, res) => {
  const b = req.body || {};
  const s = get('SELECT * FROM suppliers WHERE id = ?', Number(req.params.id)); if (!s) return res.status(404).json({ error: 'غير موجود' });
  run(`UPDATE suppliers SET name=?, category=?, contact_person=?, phone=?, email=?, address=?, rating=?, notes=?, is_active=? WHERE id=?`,
    str(b.name, 160) || s.name, str(b.category, 80), str(b.contact_person, 120), str(b.phone, 40), str(b.email, 120), str(b.address, 200),
    Math.max(0, Math.min(5, num(b.rating) || 0)), str(b.notes, 2000), b.is_active === false ? 0 : 1, s.id);
  C.audit(req, 'supplier.update', 'supplier', s.id, b);
  res.json({ ok: true });
});

router.post('/projects/:id/quotes', P('logistics.manage'), (req, res) => {
  const p = projectOpen(Number(req.params.id)); if (!p) return bad(res, 'المشروع غير موجود أو مغلق');
  const b = req.body || {};
  const amount = num(b.amount); if (!amount || amount <= 0) return bad(res, 'أدخل مبلغ العرض');
  const sid = num(b.supplier_id); if (!sid || !get('SELECT 1 FROM suppliers WHERE id = ?', sid)) return bad(res, 'اختر المورد');
  const r = run('INSERT INTO quotes(project_id, supplier_id, amount, delivery_days, details, created_by) VALUES(?,?,?,?,?,?)', p.id, sid, amount, num(b.delivery_days), str(b.details, 2000), req.user.id);
  wf('project', p.id, p.current_stage, 'quote', req.user, `إضافة عرض سعر بمبلغ ${amount}`);
  C.audit(req, 'quote.create', 'project', p.id, { amount, supplier_id: sid });
  res.json({ id: Number(r.lastInsertRowid) });
});
router.post('/quotes/:id/select', P('logistics.manage'), (req, res) => {
  const q = get('SELECT * FROM quotes WHERE id = ?', Number(req.params.id)); if (!q) return res.status(404).json({ error: 'غير موجود' });
  const p = projectOpen(q.project_id); if (!p) return bad(res, 'المشروع مغلق');
  if (p.current_stage > 4 && !req.user.isOwner) return bad(res, 'تم اعتماد العرض مسبقًا؛ استخدم الإرجاع لتغييره');
  const lowest = get('SELECT MIN(amount) m FROM quotes WHERE project_id = ?', p.id).m;
  const reason = str((req.body || {}).reason, 500);
  if (q.amount > lowest && !reason) return bad(res, 'هذا ليس أقل عرض سعر. القاعدة اعتماد الأقل؛ اكتب مبرر الاستثناء');
  run('UPDATE quotes SET selected = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE project_id = ?', q.id, p.id);
  wf('project', p.id, p.current_stage, 'quote_selected', req.user, `اختيار عرض بمبلغ ${q.amount}${reason ? ' — مبرر: ' + reason : ' (أقل عرض)'}`);
  C.audit(req, 'quote.select', 'project', p.id, { quote: q.id, reason });
  res.json({ ok: true });
});
router.delete('/quotes/:id', P('logistics.manage'), (req, res) => {
  const q = get('SELECT * FROM quotes WHERE id = ?', Number(req.params.id)); if (!q) return res.status(404).json({ error: 'غير موجود' });
  if (!projectOpen(q.project_id)) return bad(res, 'المشروع مغلق');
  run('DELETE FROM quotes WHERE id = ?', q.id);
  C.audit(req, 'quote.delete', 'project', q.project_id, { quote: q.id });
  res.json({ ok: true });
});

router.get('/contracts', P('logistics.view', 'finance.view', 'workflow.approve'), (req, res) => {
  res.json(all(`SELECT c.*, s.name AS supplier_name, p.code AS project_code, p.title AS project_title, u.full_name AS signed_by_name
    FROM contracts c LEFT JOIN suppliers s ON s.id = c.supplier_id LEFT JOIN projects p ON p.id = c.project_id
    LEFT JOIN users u ON u.id = c.signed_by ORDER BY c.id DESC`));
});
router.post('/contracts', P('logistics.manage'), (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 200); if (!title) return bad(res, 'عنوان العقد مطلوب');
  const p = projectOpen(num(b.project_id)); if (!p) return bad(res, 'اختر مشروعًا نشطًا');
  const r = run('INSERT INTO contracts(project_id, supplier_id, title, amount, quantities, delivery_date, status, created_by) VALUES(?,?,?,?,?,?,?,?)',
    p.id, num(b.supplier_id), title, num(b.amount), str(b.quantities, 2000), date(b.delivery_date), 'pending_signature', req.user.id);
  wf('project', p.id, p.current_stage, 'contract', req.user, `إعداد عقد: ${title} — رُفع للمدير العام لتوقيعه`);
  C.notify(C.usersWithPerm('workflow.approve'), { title: `عقد بانتظار توقيعك: ${title}`, body: `${p.code} — ${p.title}`, link: '#/logistics?tab=contracts', kind: 'approval' }, req.user.id);
  C.audit(req, 'contract.create', 'contract', Number(r.lastInsertRowid), { title });
  res.json({ id: Number(r.lastInsertRowid) });
});
router.post('/contracts/:id/sign', P('workflow.approve'), (req, res) => {
  const c = get('SELECT * FROM contracts WHERE id = ?', Number(req.params.id)); if (!c) return res.status(404).json({ error: 'غير موجود' });
  if (c.status === 'signed') return bad(res, 'العقد موقّع مسبقًا');
  const reject = !!(req.body || {}).reject;
  run("UPDATE contracts SET status = ?, signed_by = ?, signed_at = datetime('now') WHERE id = ?", reject ? 'rejected' : 'signed', req.user.id, c.id);
  wf('project', c.project_id, null, reject ? 'contract_rejected' : 'contract_signed', req.user, `${reject ? 'رفض' : 'توقيع'} العقد: ${c.title}`);
  C.notify([c.created_by, ...C.usersInDepts(['logistics'])], { title: `${reject ? 'رُفض' : 'وُقّع'} العقد: ${c.title}`, link: '#/logistics?tab=contracts', kind: reject ? 'error' : 'success' }, req.user.id);
  C.audit(req, reject ? 'contract.reject' : 'contract.sign', 'contract', c.id);
  res.json({ ok: true });
});

router.get('/claims', P('logistics.view', 'finance.view'), (req, res) => {
  res.json(all(`SELECT c.*, s.name AS supplier_name, p.code AS project_code, p.title AS project_title, p.current_stage
    FROM claims c LEFT JOIN suppliers s ON s.id = c.supplier_id LEFT JOIN projects p ON p.id = c.project_id ORDER BY c.id DESC`));
});
router.post('/claims', P('logistics.manage'), (req, res) => {
  const b = req.body || {};
  const p = projectOpen(num(b.project_id)); if (!p) return bad(res, 'اختر مشروعًا نشطًا');
  const amount = num(b.amount); if (!amount || amount <= 0) return bad(res, 'أدخل مبلغ المطالبة');
  const sid = num(b.supplier_id); if (!sid) return bad(res, 'اختر المورد');
  const r = run('INSERT INTO claims(project_id, supplier_id, amount, description, created_by) VALUES(?,?,?,?,?)', p.id, sid, amount, str(b.description, 2000), req.user.id);
  wf('project', p.id, p.current_stage, 'claim', req.user, `مطالبة مورد بمبلغ ${amount}`);
  C.audit(req, 'claim.create', 'claim', Number(r.lastInsertRowid), { amount });
  res.json({ id: Number(r.lastInsertRowid) });
});
router.post('/claims/:id/review', P('logistics.manage', 'finance.manage'), (req, res) => {
  const c = get('SELECT * FROM claims WHERE id = ?', Number(req.params.id)); if (!c) return res.status(404).json({ error: 'غير موجود' });
  if (c.status !== 'submitted') return bad(res, 'لا يمكن مراجعة هذه المطالبة في حالتها الحالية');
  const ok = (req.body || {}).ok ? 1 : 0;
  const field = (req.body || {}).as === 'finance' ? 'finance_ok' : 'logistics_ok';
  if (field === 'finance_ok' && !C.can(req.user, 'finance.manage')) return res.status(403).json({ error: 'إفادة المالية من صلاحية الإدارة المالية' });
  if (field === 'logistics_ok' && !C.can(req.user, 'logistics.manage')) return res.status(403).json({ error: 'إفادة اللوجستيات من صلاحية إدارة اللوجستيات' });
  run(`UPDATE claims SET ${field} = ? WHERE id = ?`, ok, c.id);
  C.audit(req, 'claim.review', 'claim', c.id, { field, ok });
  res.json({ ok: true });
});
router.post('/claims/:id/reject', P('workflow.approve', 'finance.manage'), (req, res) => {
  const c = get('SELECT * FROM claims WHERE id = ?', Number(req.params.id)); if (!c) return res.status(404).json({ error: 'غير موجود' });
  if (c.status === 'paid') return bad(res, 'المطالبة مصروفة');
  run("UPDATE claims SET status = 'rejected' WHERE id = ?", c.id);
  C.audit(req, 'claim.reject', 'claim', c.id);
  res.json({ ok: true });
});

// ================================================================ FINANCE
router.post('/claims/:id/pay', P('finance.manage'), (req, res) => {
  const c = get('SELECT * FROM claims WHERE id = ?', Number(req.params.id)); if (!c) return res.status(404).json({ error: 'غير موجود' });
  if (c.status !== 'approved') return bad(res, 'لا تُصرف إلا المطالبات المعتمدة من المدير العام');
  const b = req.body || {};
  const cheque = str(b.cheque_no, 60); const bank = str(b.bank, 80);
  if (!cheque || !bank) return bad(res, 'أدخل رقم الشيك والبنك');
  const s = get('SELECT name FROM suppliers WHERE id = ?', c.supplier_id);
  run("UPDATE claims SET status = 'paid', cheque_no = ?, bank = ?, paid_at = datetime('now'), paid_by = ? WHERE id = ?", cheque, bank, req.user.id, c.id);
  run('INSERT INTO transactions(project_id, type, category, amount, description, ref, tx_date, created_by) VALUES(?,?,?,?,?,?,?,?)',
    c.project_id, 'expense', 'supplier', c.amount, `صرف مستحقات المورد ${s ? s.name : ''}`, `شيك ${cheque} — ${bank}`, new Date().toISOString().slice(0, 10), req.user.id);
  wf('project', c.project_id, null, 'payment', req.user, `صرف ${c.amount} للمورد ${s ? s.name : ''} بشيك رقم ${cheque}`);
  C.audit(req, 'claim.pay', 'claim', c.id, { cheque, bank });
  res.json({ ok: true });
});

router.get('/finance/summary', P('finance.view'), (req, res) => {
  const totals = get(`SELECT COALESCE(SUM(grant_amount),0) AS grants, COALESCE(SUM(admin_fee_amount),0) AS fees,
      COALESCE(SUM(net_amount),0) AS net, COUNT(*) AS projects FROM projects`);
  const spent = get("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE type = 'expense'").s;
  const income = get("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE type = 'income'").s;
  const due = get("SELECT COALESCE(SUM(amount),0) s FROM claims WHERE status = 'approved'").s;
  const pendingClaims = get("SELECT COUNT(*) c FROM claims WHERE status = 'submitted'").c;
  const perProject = all(`SELECT p.id, p.code, p.title, p.currency, p.grant_amount, p.admin_fee_amount, p.net_amount, p.status, p.current_stage,
      (SELECT COALESCE(SUM(amount),0) FROM transactions t WHERE t.project_id = p.id AND t.type='expense') AS spent
    FROM projects p ORDER BY p.id DESC`);
  const monthly = all(`SELECT substr(tx_date,1,7) AS month, type, SUM(amount) AS total FROM transactions
    WHERE tx_date >= date('now','-11 months','start of month') GROUP BY month, type ORDER BY month`);
  res.json({ totals: { ...totals, spent, income, due, pendingClaims }, perProject, monthly });
});
router.get('/transactions', P('finance.view'), (req, res) => {
  res.json(all(`SELECT t.*, p.code AS project_code, u.full_name AS created_by_name FROM transactions t
    LEFT JOIN projects p ON p.id = t.project_id LEFT JOIN users u ON u.id = t.created_by ORDER BY t.tx_date DESC, t.id DESC LIMIT 1000`));
});
router.post('/transactions', P('finance.manage'), (req, res) => {
  const b = req.body || {};
  const amount = num(b.amount); if (!amount || amount <= 0) return bad(res, 'أدخل المبلغ');
  const type = oneOf(b.type, ['income', 'expense'], null); if (!type) return bad(res, 'اختر نوع الحركة');
  const r = run('INSERT INTO transactions(project_id, type, category, amount, description, ref, tx_date, created_by) VALUES(?,?,?,?,?,?,?,?)',
    num(b.project_id), type, str(b.category, 60), amount, str(b.description, 500), str(b.ref, 120), date(b.tx_date) || new Date().toISOString().slice(0, 10), req.user.id);
  C.audit(req, 'transaction.create', 'transaction', Number(r.lastInsertRowid), b);
  res.json({ id: Number(r.lastInsertRowid) });
});
router.delete('/transactions/:id', P('finance.manage'), (req, res) => {
  const t = get('SELECT * FROM transactions WHERE id = ?', Number(req.params.id)); if (!t) return res.status(404).json({ error: 'غير موجود' });
  if (t.category === 'supplier' && !req.user.isOwner) return bad(res, 'حركات صرف الموردين مرتبطة بالمطالبات ولا تُحذف');
  run('DELETE FROM transactions WHERE id = ?', t.id);
  C.audit(req, 'transaction.delete', 'transaction', t.id, t);
  res.json({ ok: true });
});

// ================================================================ MEDIA
router.get('/media', P('media.view'), (req, res) => {
  res.json(all(`SELECT m.*, p.code AS project_code, p.title AS project_title, p.execution_date, u.full_name AS reporter_name
    FROM media_items m LEFT JOIN projects p ON p.id = m.project_id LEFT JOIN users u ON u.id = m.reporter_id
    ORDER BY COALESCE(m.scheduled_date, p.execution_date) DESC`));
});
router.post('/media', P('media.manage'), (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 200); if (!title) return bad(res, 'العنوان مطلوب');
  const link = str(b.link, 500); if (link && !/^https?:\/\//i.test(link)) return bad(res, 'رابط غير صالح');
  const r = run('INSERT INTO media_items(project_id, title, kind, scheduled_date, link, reporter_id, status, notes, created_by) VALUES(?,?,?,?,?,?,?,?,?)',
    num(b.project_id), title, oneOf(b.kind, ['coverage', 'photo', 'video', 'story', 'report', 'post'], 'coverage'), date(b.scheduled_date), link,
    num(b.reporter_id), oneOf(b.status, ['planned', 'covered', 'uploaded', 'reviewed', 'published'], 'planned'), str(b.notes, 2000), req.user.id);
  if (b.reporter_id) C.notify([num(b.reporter_id)], { title: `تكليف تغطية إعلامية: ${title}`, body: b.scheduled_date || '', link: '#/media', kind: 'action' }, req.user.id);
  C.audit(req, 'media.create', 'media', Number(r.lastInsertRowid), { title });
  res.json({ id: Number(r.lastInsertRowid) });
});
router.patch('/media/:id', P('media.manage'), (req, res) => {
  const m = get('SELECT * FROM media_items WHERE id = ?', Number(req.params.id)); if (!m) return res.status(404).json({ error: 'غير موجود' });
  const b = req.body || {};
  const link = 'link' in b ? str(b.link, 500) : m.link; if (link && !/^https?:\/\//i.test(link)) return bad(res, 'رابط غير صالح');
  run('UPDATE media_items SET title=?, kind=?, scheduled_date=?, link=?, reporter_id=?, status=?, notes=? WHERE id=?',
    str(b.title, 200) || m.title, oneOf(b.kind, ['coverage', 'photo', 'video', 'story', 'report', 'post'], m.kind),
    'scheduled_date' in b ? date(b.scheduled_date) : m.scheduled_date, link, 'reporter_id' in b ? num(b.reporter_id) : m.reporter_id,
    oneOf(b.status, ['planned', 'covered', 'uploaded', 'reviewed', 'published'], m.status), 'notes' in b ? str(b.notes, 2000) : m.notes, m.id);
  C.audit(req, 'media.update', 'media', m.id, b);
  res.json({ ok: true });
});
router.delete('/media/:id', P('media.manage'), (req, res) => {
  run('DELETE FROM media_items WHERE id = ?', Number(req.params.id));
  C.audit(req, 'media.delete', 'media', Number(req.params.id));
  res.json({ ok: true });
});

// ================================================================ SECRETARIAT (incoming / outgoing register)
router.get('/correspondence', P('secretariat.view'), (req, res) => {
  res.json(all(`SELECT c.*, p.code AS project_code, r.code AS request_code, u.full_name AS created_by_name FROM correspondence c
    LEFT JOIN projects p ON p.id = c.project_id LEFT JOIN requests r ON r.id = c.request_id LEFT JOIN users u ON u.id = c.created_by
    ORDER BY c.corr_date DESC, c.id DESC`));
});
router.post('/correspondence', P('secretariat.manage'), (req, res) => {
  const b = req.body || {};
  const subject = str(b.subject, 300); if (!subject) return bad(res, 'الموضوع مطلوب');
  const direction = oneOf(b.direction, ['in', 'out'], null); if (!direction) return bad(res, 'حدد وارد أو صادر');
  const year = new Date().getFullYear();
  const count = get('SELECT COUNT(*) c FROM correspondence WHERE direction = ? AND ref_no LIKE ?', direction, `%/${year}`).c + 1;
  const ref = str(b.ref_no, 60) || `${direction === 'in' ? 'و' : 'ص'}-${String(count).padStart(4, '0')}/${year}`;
  const r = run('INSERT INTO correspondence(direction, ref_no, subject, party, corr_date, channel, project_id, request_id, notes, created_by) VALUES(?,?,?,?,?,?,?,?,?,?)',
    direction, ref, subject, str(b.party, 200), date(b.corr_date) || new Date().toISOString().slice(0, 10), str(b.channel, 60) || 'البريد الإلكتروني',
    num(b.project_id), num(b.request_id), str(b.notes, 2000), req.user.id);
  C.audit(req, 'correspondence.create', 'correspondence', Number(r.lastInsertRowid), { ref, subject });
  res.json({ id: Number(r.lastInsertRowid), ref_no: ref });
});
router.delete('/correspondence/:id', P('secretariat.manage'), (req, res) => {
  run('DELETE FROM correspondence WHERE id = ?', Number(req.params.id));
  C.audit(req, 'correspondence.delete', 'correspondence', Number(req.params.id));
  res.json({ ok: true });
});

// ================================================================ ERRORS (monthly log)
router.get('/errors', P('errors.view'), (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : null;
  let sql = `SELECT e.*, d.name AS dept_name, u.full_name AS responsible_name, rb.full_name AS reported_by_name
    FROM errors e LEFT JOIN departments d ON d.id = e.department_id LEFT JOIN users u ON u.id = e.responsible_user_id
    LEFT JOIN users rb ON rb.id = e.reported_by`;
  const p = [];
  if (month) { sql += ' WHERE substr(e.created_at,1,7) = ?'; p.push(month); }
  sql += ' ORDER BY e.id DESC';
  const rows = all(sql, ...p);
  const byDept = {}; const byUser = {}; const byStage = {};
  for (const r of rows) {
    byDept[r.dept_name || 'غير محدد'] = (byDept[r.dept_name || 'غير محدد'] || 0) + 1;
    if (r.responsible_name) byUser[r.responsible_name] = (byUser[r.responsible_name] || 0) + 1;
    const k = `${r.entity_type === 'project' ? 'مشروع' : 'طلب'} – م${r.stage}`;
    byStage[k] = (byStage[k] || 0) + 1;
  }
  res.json({ rows, byDept, byUser, byStage });
});
router.post('/errors', P('errors.manage'), (req, res) => {
  const b = req.body || {};
  const name = str(b.error_name, 200); if (!name) return bad(res, 'اسم الخطأ مطلوب');
  const r = run(`INSERT INTO errors(entity_type, entity_title, stage, stage_title, error_name, description, department_id, responsible_user_id, reported_by, severity)
    VALUES(?,?,?,?,?,?,?,?,?,?)`, 'manual', str(b.entity_title, 200), num(b.stage), str(b.stage_title, 200), name, str(b.description, 2000),
  num(b.department_id), num(b.responsible_user_id), req.user.id, oneOf(b.severity, ['low', 'medium', 'high'], 'medium'));
  C.audit(req, 'error.create', 'error', Number(r.lastInsertRowid), { name });
  res.json({ id: Number(r.lastInsertRowid) });
});
router.patch('/errors/:id', P('errors.manage'), (req, res) => {
  const e = get('SELECT * FROM errors WHERE id = ?', Number(req.params.id)); if (!e) return res.status(404).json({ error: 'غير موجود' });
  const status = oneOf((req.body || {}).status, ['open', 'resolved'], e.status);
  run("UPDATE errors SET status = ?, resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now') ELSE NULL END WHERE id = ?", status, status, e.id);
  C.audit(req, 'error.update', 'error', e.id, { status });
  res.json({ ok: true });
});

module.exports = router;
