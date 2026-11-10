'use strict';
const express = require('express');
const { all, get, run, tx } = require('../db');
const { PROJECT_STAGES, REQUEST_STAGES, GENERAL_RULES } = require('../workflows');
const { requirePerm, can, audit, notify, usersInDepts, usersWithPerm, ccGeneralManager, nextCode } = require('../core');
const { num, str, date, bad } = require('../validate');

const router = express.Router();
const DEFS = { project: PROJECT_STAGES, request: REQUEST_STAGES };
const TABLE = { project: 'projects', request: 'requests' };
const LINK = { project: (id) => `#/projects/${id}`, request: (id) => `#/requests/${id}` };
const LABEL = { project: 'المشروع', request: 'الطلب' };

// ------------------------------------------------------------------ helpers
function deptIdByKey(key) { const d = get('SELECT id FROM departments WHERE key = ?', key); return d && d.id; }

function matchesActor(user, actor, entity) {
  if (actor === '@sector') return !!entity.sector_dept_id && user.department_id === entity.sector_dept_id;
  if (actor === '@assignee') return !!entity.assignee_id && user.id === entity.assignee_id;
  return user.dept_key === actor;
}
function canActStage(user, stage, entity) {
  if (!stage || entity.status !== 'active') return false;
  if (can(user, 'workflow.override')) return true;
  if (!can(user, 'workflow.act')) return false;
  return stage.actors.some((a) => matchesActor(user, a, entity));
}
function canTick(user, check, entity) {
  if (entity.status !== 'active') return false;
  if (can(user, 'workflow.override')) return true;
  if (!can(user, 'workflow.act')) return false;
  return check.dept.some((a) => matchesActor(user, a, entity));
}
function canSeeRequest(user, r) {
  if (can(user, 'requests.view_all')) return true;
  if (!can(user, 'requests.view')) return false;
  if (r.created_by === user.id || r.assignee_id === user.id) return true;
  if (r.sector_dept_id && r.sector_dept_id === user.department_id) return true;
  if (user.dept_key === 'projects' && (r.current_stage >= 5 || r.status === 'closed')) return true;
  return false;
}
function canSeeEntity(user, type, e) {
  if (type === 'project') return can(user, 'projects.view');
  return canSeeRequest(user, e);
}

function gateProblem(type, e, gate) {
  if (!gate) return null;
  const c = (sql, ...p) => get(sql, ...p).c;
  switch (gate) {
    case 'approval_date': return e.approval_date ? null : 'يجب توثيق تاريخ ورود الاعتماد في بيانات المشروع';
    case 'has_quotes': return c('SELECT COUNT(*) c FROM quotes WHERE project_id = ?', e.id) ? null : 'أضف عرض سعر واحدًا على الأقل في تبويب اللوجستيات (يوصى بثلاثة عروض)';
    case 'admin_fee': return e.admin_fee_pct != null && e.net_amount != null ? null : 'يجب على الإدارة المالية تحديد نسبة المخصص الإداري والمبلغ المعتمد للتنفيذ';
    case 'selected_quote': return c('SELECT COUNT(*) c FROM quotes WHERE project_id = ? AND selected = 1', e.id) ? null : 'اختر العرض المعتمد (أقل سعر) من عروض الأسعار';
    case 'plan': return e.execution_date && e.plan_budget != null ? null : 'أكمل خطة التنفيذ: موعد التنفيذ، وميزانية ومصاريف التنفيذ، والأجور التشغيلية';
    case 'media_link': return e.media_link ? null : 'أدخل الرابط المعتمد للتوثيقات الإعلامية';
    case 'claims': return c("SELECT COUNT(*) c FROM claims WHERE project_id = ? AND status != 'rejected'", e.id) ? null : 'أضف مطالبات الموردين في تبويب اللوجستيات';
    case 'claims_paid': {
      const open = c("SELECT COUNT(*) c FROM claims WHERE project_id = ? AND status = 'approved'", e.id);
      const paid = c("SELECT COUNT(*) c FROM claims WHERE project_id = ? AND status = 'paid'", e.id);
      if (open) return `يوجد ${open} مطالبة معتمدة لم تُصرف بعد`;
      return paid ? null : 'لا توجد مطالبات مصروفة';
    }
    case 'large_contracts':
      if (e.size !== 'large') return null;
      return c("SELECT COUNT(*) c FROM contracts WHERE project_id = ? AND status = 'signed'", e.id) ? null : 'مشروع كبير: يجب وجود عقد موقّع من المدير العام مع المورد (العملية الاستثنائية ب)';
    case 'sector': return e.sector_dept_id && e.sector_deadline ? null : 'حدد القطاع المختص ومدة الإنجاز';
    case 'assignee':
      if (!e.assignee_id || !e.assignee_deadline) return 'حدد الموظف المكلف ومهلته';
      if (e.sector_deadline && e.assignee_deadline > e.sector_deadline) return 'مهلة الموظف يجب أن تكون أقصر من مهلة القطاع (احتياطًا)';
      return null;
    case 'deliverable': {
      const files = c("SELECT COUNT(*) c FROM files WHERE entity_type = 'request' AND entity_id = ?", e.id);
      return e.deliverable || files ? null : 'أرفق مخرجات الطلب (ملف أو وصف للإنجاز)';
    }
    default: return null;
  }
}

function stageActorsUserIds(stage, e) {
  const ids = [];
  const depts = [];
  for (const a of stage.actors) {
    if (a === '@sector') { if (e.sector_dept_id) ids.push(...all('SELECT id FROM users WHERE department_id = ? AND is_active = 1', e.sector_dept_id).map((r) => r.id)); }
    else if (a === '@assignee') ids.push(e.assignee_id);
    else depts.push(a);
  }
  for (const ch of stage.checks || []) for (const a of ch.dept) if (!a.startsWith('@')) depts.push(a);
  return [...ids, ...usersInDepts([...new Set(depts)])];
}

function event(type, id, stage, action, user, note) {
  run('INSERT INTO workflow_events(entity_type, entity_id, stage, action, user_id, note) VALUES(?,?,?,?,?,?)', type, id, stage, action, user.id, note || null);
}

function buildStages(type, e, user) {
  const defs = DEFS[type];
  const checks = all(`SELECT c.*, u.full_name FROM stage_checks c LEFT JOIN users u ON u.id = c.done_by
    WHERE entity_type = ? AND entity_id = ?`, type, e.id);
  return defs.map((s) => {
    const state = e.status === 'closed' || s.n < e.current_stage ? 'done' : s.n === e.current_stage ? (e.stage_status === 'pending_approval' ? 'approval' : 'current') : 'future';
    return {
      ...s,
      state,
      checks: (s.checks || []).map((ch) => {
        const d = checks.find((x) => x.stage === s.n && x.check_id === ch.id);
        return { ...ch, done: !!d, done_by: d && d.full_name, done_at: d && d.done_at, canTick: s.n === e.current_stage && e.stage_status === 'active' && canTick(user, ch, e) };
      }),
      gateProblem: s.n === e.current_stage ? gateProblem(type, e, s.gate) : null,
    };
  });
}

function loadEntity(type, id) { return get(`SELECT * FROM ${TABLE[type]} WHERE id = ?`, id); }

function advance(type, e, user) {
  const defs = DEFS[type];
  const cur = defs[e.current_stage - 1];
  const t = TABLE[type];
  if (e.current_stage >= defs.length) {
    run(`UPDATE ${t} SET status = 'closed', stage_status = 'done', closed_at = datetime('now') WHERE id = ?`, e.id);
    event(type, e.id, cur.n, 'closed', user, `تم إغلاق ${LABEL[type]} نهائيًا`);
    notify([...ccGeneralManager(), e.created_by], { title: `✅ أُغلق ${LABEL[type]}: ${e.title}`, body: cur.output, link: LINK[type](e.id), kind: 'success' }, user.id);
    return;
  }
  const next = defs[e.current_stage];
  run(`UPDATE ${t} SET current_stage = ?, stage_status = 'active', stage_started_at = datetime('now') WHERE id = ?`, next.n, e.id);
  const fresh = loadEntity(type, e.id);
  notify(stageActorsUserIds(next, fresh), { title: `مرحلة جديدة بانتظارك: ${next.title}`, body: `${e.code} — ${e.title}`, link: LINK[type](e.id), kind: 'action' }, user.id);
  // GM is CC on every movement (General rule #1)
  notify(ccGeneralManager(), { title: `[نسخة للمدير العام] ${e.code}: انتقل إلى المرحلة ${next.n}`, body: next.title, link: LINK[type](e.id), kind: 'cc' }, user.id);
}

// ------------------------------------------------------------------ meta
router.get('/workflows', (req, res) => res.json({ project: PROJECT_STAGES, request: REQUEST_STAGES, rules: GENERAL_RULES }));

// ------------------------------------------------------------------ projects
router.get('/projects', requirePerm('projects.view'), (req, res) => {
  const { status, q, stage } = req.query;
  let sql = `SELECT p.*, (SELECT COUNT(*) FROM errors e WHERE e.entity_type='project' AND e.entity_id=p.id) AS error_count
    FROM projects p WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (stage) { sql += ' AND p.current_stage = ?'; params.push(Number(stage)); }
  if (q) { sql += ' AND (p.title LIKE ? OR p.code LIKE ? OR p.donor LIKE ? OR p.location LIKE ?)'; params.push(...Array(4).fill(`%${q}%`)); }
  sql += ' ORDER BY p.status = \'closed\', p.id DESC';
  const rows = all(sql, ...params).map((p) => {
    const s = PROJECT_STAGES[p.current_stage - 1];
    return { ...p, stage_title: s.title, stage_actors: s.actors, my_turn: canActStage(req.user, s, p) || (p.stage_status === 'pending_approval' && can(req.user, 'workflow.approve')) };
  });
  if (!can(req.user, 'finance.view')) rows.forEach((r) => { delete r.admin_fee_amount; delete r.admin_fee_pct; delete r.net_amount; delete r.plan_wages; });
  res.json(rows);
});

router.post('/projects', requirePerm('projects.create'), (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 200);
  if (!title) return bad(res, 'اسم المشروع مطلوب');
  const code = nextCode('projects', 'PRJ');
  const r = run(`INSERT INTO projects(code, title, donor, sector, location, size, currency, grant_amount, beneficiaries, approval_date, description, priority, created_by)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, code, title, str(b.donor, 120), str(b.sector, 80), str(b.location, 120),
    b.size === 'large' ? 'large' : 'small', str(b.currency, 8) || 'USD', num(b.grant_amount) || 0, num(b.beneficiaries) || 0,
    date(b.approval_date), str(b.description, 4000), ['high', 'urgent', 'normal'].includes(b.priority) ? b.priority : 'normal', req.user.id);
  const id = Number(r.lastInsertRowid);
  event('project', id, 1, 'created', req.user, 'تسجيل اعتماد المشروع في النظام');
  // project discussion channel
  run("INSERT INTO channels(name, description, kind, project_id, created_by) VALUES(?,?,?,?,?)", `مشروع ${code}`, title, 'project', id, req.user.id);
  notify([...ccGeneralManager(), ...usersInDepts(['gm', 'secretariat'])], { title: `مشروع جديد: ${title}`, body: `${code} — بانتظار توثيق استلام الاعتماد`, link: LINK.project(id), kind: 'action' }, req.user.id);
  audit(req, 'project.create', 'project', id, { code, title });
  res.json({ id, code });
});

router.get('/projects/:id', requirePerm('projects.view'), (req, res) => {
  const p = loadEntity('project', Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'المشروع غير موجود' });
  res.json(entityPayload('project', p, req.user));
});

function entityPayload(type, e, user) {
  const stage = DEFS[type][e.current_stage - 1];
  const events = all(`SELECT w.*, u.full_name, d.name AS dept_name FROM workflow_events w LEFT JOIN users u ON u.id = w.user_id
    LEFT JOIN departments d ON d.id = u.department_id WHERE entity_type = ? AND entity_id = ? ORDER BY w.id DESC`, type, e.id);
  const errors = all(`SELECT er.*, u.full_name AS responsible_name, d.name AS dept_name, rb.full_name AS reported_by_name
    FROM errors er LEFT JOIN users u ON u.id = er.responsible_user_id LEFT JOIN departments d ON d.id = er.department_id
    LEFT JOIN users rb ON rb.id = er.reported_by WHERE er.entity_type = ? AND er.entity_id = ? ORDER BY er.id DESC`, type, e.id);
  const files = all(`SELECT f.id, f.original_name, f.category, f.size, f.mime, f.created_at, u.full_name AS uploaded_by_name
    FROM files f LEFT JOIN users u ON u.id = f.uploaded_by WHERE entity_type = ? AND entity_id = ? ORDER BY f.id DESC`, type, e.id);
  const tasks = all(`SELECT t.*, u.full_name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
    WHERE ${type}_id = ? ORDER BY t.id DESC`, e.id);
  const out = {
    entity: { ...e }, stages: buildStages(type, e, user), events, errors, files, tasks,
    can: {
      act: canActStage(user, stage, e),
      approve: e.status === 'active' && e.stage_status === 'pending_approval' && can(user, 'workflow.approve'),
      return: e.status === 'active' && (can(user, 'workflow.return') || can(user, 'workflow.approve') || can(user, 'workflow.override')),
      edit: can(user, type === 'project' ? 'projects.edit' : 'requests.create'),
      delete: can(user, type === 'project' ? 'projects.delete' : 'requests.view_all') && (user.isOwner || can(user, 'projects.delete')),
      finance: can(user, 'finance.manage'), logistics: can(user, 'logistics.manage'), media: can(user, 'media.manage'),
    },
  };
  if (type === 'project') {
    const channel = get('SELECT id FROM channels WHERE project_id = ?', e.id);
    out.channel_id = channel && channel.id;
    if (can(user, 'logistics.view') || can(user, 'finance.view')) {
      out.quotes = all(`SELECT q.*, s.name AS supplier_name FROM quotes q LEFT JOIN suppliers s ON s.id = q.supplier_id WHERE project_id = ? ORDER BY amount`, e.id);
      out.contracts = all(`SELECT c.*, s.name AS supplier_name, u.full_name AS signed_by_name FROM contracts c LEFT JOIN suppliers s ON s.id = c.supplier_id LEFT JOIN users u ON u.id = c.signed_by WHERE project_id = ? ORDER BY c.id DESC`, e.id);
      out.claims = all(`SELECT c.*, s.name AS supplier_name FROM claims c LEFT JOIN suppliers s ON s.id = c.supplier_id WHERE project_id = ? ORDER BY c.id DESC`, e.id);
    }
    if (can(user, 'finance.view')) {
      out.transactions = all(`SELECT t.*, u.full_name AS created_by_name FROM transactions t LEFT JOIN users u ON u.id = t.created_by WHERE project_id = ? ORDER BY tx_date DESC, id DESC`, e.id);
    } else {
      ['admin_fee_pct', 'admin_fee_amount', 'net_amount', 'plan_wages'].forEach((k) => delete out.entity[k]);
    }
    if (can(user, 'media.view')) {
      out.media = all(`SELECT m.*, u.full_name AS reporter_name FROM media_items m LEFT JOIN users u ON u.id = m.reporter_id WHERE project_id = ? ORDER BY scheduled_date`, e.id);
    }
    out.requests = all('SELECT id, code, title, status, current_stage FROM requests WHERE project_id = ?', e.id);
  } else {
    const s = e.sector_dept_id && get('SELECT name FROM departments WHERE id = ?', e.sector_dept_id);
    const a = e.assignee_id && get('SELECT full_name FROM users WHERE id = ?', e.assignee_id);
    out.entity.sector_name = s && s.name;
    out.entity.assignee_name = a && a.full_name;
    const pr = e.project_id && get('SELECT code, title FROM projects WHERE id = ?', e.project_id);
    out.entity.project_label = pr ? `${pr.code} — ${pr.title}` : null;
    out.can.assignSector = e.current_stage === 2 && canActStage(user, stage, e);
    out.can.assignEmployee = e.current_stage === 3 && canActStage(user, stage, e);
    out.can.deliver = e.current_stage === 4 && canActStage(user, stage, e);
  }
  return out;
}

const PROJECT_FIELDS = {
  'projects.edit': { title: 'str200', donor: 'str120', sector: 'str80', location: 'str120', size: 'size', currency: 'str8', grant_amount: 'num', beneficiaries: 'num', approval_date: 'date', end_date: 'date', description: 'str4000', priority: 'prio', execution_date: 'date', plan_budget: 'num', plan_notes: 'str4000' },
  'finance.manage': { admin_fee_pct: 'num', plan_wages: 'num' },
  'media.manage': { media_link: 'url' },
};
router.patch('/projects/:id', (req, res) => {
  const p = loadEntity('project', Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'المشروع غير موجود' });
  if (p.status === 'closed' && !req.user.isOwner) return bad(res, 'المشروع مغلق ولا يمكن تعديله');
  const b = req.body || {};
  const sets = []; const vals = []; const changed = {};
  for (const [perm, fields] of Object.entries(PROJECT_FIELDS)) {
    for (const [f, kind] of Object.entries(fields)) {
      if (!(f in b)) continue;
      // plan wages: projects dept prepares it in the execution plan too
      const allowed = can(req.user, perm) || (f === 'plan_wages' && can(req.user, 'projects.edit'));
      if (!allowed) return res.status(403).json({ error: `ليست لديك صلاحية تعديل الحقل (${f})` });
      let v = b[f];
      if (kind === 'num') v = num(v);
      else if (kind === 'date') v = date(v);
      else if (kind === 'size') v = v === 'large' ? 'large' : 'small';
      else if (kind === 'prio') v = ['high', 'urgent', 'normal'].includes(v) ? v : 'normal';
      else if (kind === 'url') { v = str(v, 500); if (v && !/^https?:\/\//i.test(v)) return bad(res, 'الرابط يجب أن يبدأ بـ http:// أو https://'); }
      else v = str(v, Number(kind.slice(3)));
      if (f === 'title' && !v) return bad(res, 'اسم المشروع مطلوب');
      sets.push(`${f} = ?`); vals.push(v); changed[f] = v;
    }
  }
  if (!sets.length) return bad(res, 'لا توجد تعديلات');
  run(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, ...vals, p.id);
  // recompute admin fee / net
  const fresh = loadEntity('project', p.id);
  if (fresh.admin_fee_pct != null) {
    const fee = Math.round(fresh.grant_amount * fresh.admin_fee_pct) / 100;
    run('UPDATE projects SET admin_fee_amount = ?, net_amount = ? WHERE id = ?', fee, Math.round((fresh.grant_amount - fee) * 100) / 100, p.id);
  }
  event('project', p.id, p.current_stage, 'edit', req.user, 'تحديث بيانات: ' + Object.keys(changed).join('، '));
  audit(req, 'project.update', 'project', p.id, changed);
  res.json({ ok: true });
});

router.delete('/projects/:id', requirePerm('projects.delete'), (req, res) => {
  const p = loadEntity('project', Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'غير موجود' });
  tx(() => {
    run("DELETE FROM stage_checks WHERE entity_type='project' AND entity_id = ?", p.id);
    run("DELETE FROM workflow_events WHERE entity_type='project' AND entity_id = ?", p.id);
    run('DELETE FROM projects WHERE id = ?', p.id);
  });
  audit(req, 'project.delete', 'project', p.id, { code: p.code, title: p.title });
  res.json({ ok: true });
});

// ------------------------------------------------------------------ requests
router.get('/requests', requirePerm('requests.view', 'requests.view_all'), (req, res) => {
  const rows = all(`SELECT r.*, d.name AS sector_name, u.full_name AS assignee_name FROM requests r
    LEFT JOIN departments d ON d.id = r.sector_dept_id LEFT JOIN users u ON u.id = r.assignee_id
    ORDER BY r.status = 'closed', r.id DESC`).filter((r) => canSeeRequest(req.user, r));
  res.json(rows.map((r) => {
    const s = REQUEST_STAGES[r.current_stage - 1];
    return { ...r, stage_title: s.title, my_turn: canActStage(req.user, s, r) };
  }));
});

router.post('/requests', requirePerm('requests.create'), (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 200);
  if (!title) return bad(res, 'عنوان الطلب مطلوب');
  const code = nextCode('requests', 'REQ');
  const r = run(`INSERT INTO requests(code, title, donor, description, project_id, received_at, donor_deadline, priority, created_by)
    VALUES(?,?,?,?,?,?,?,?,?)`, code, title, str(b.donor, 120), str(b.description, 4000), num(b.project_id),
    date(b.received_at) || new Date().toISOString().slice(0, 10), date(b.donor_deadline),
    ['high', 'urgent', 'normal'].includes(b.priority) ? b.priority : 'normal', req.user.id);
  const id = Number(r.lastInsertRowid);
  event('request', id, 1, 'created', req.user, 'تسجيل الطلب الوارد من الجهة المانحة');
  notify(ccGeneralManager(), { title: `طلب جديد من المانح: ${title}`, body: `${code}${b.donor_deadline ? ' — المهلة: ' + b.donor_deadline : ''}`, link: LINK.request(id), kind: 'cc' }, req.user.id);
  audit(req, 'request.create', 'request', id, { code, title });
  res.json({ id, code });
});

router.get('/requests/:id', (req, res) => {
  const r = loadEntity('request', Number(req.params.id));
  if (!r || !canSeeRequest(req.user, r)) return res.status(404).json({ error: 'الطلب غير موجود أو لا تملك صلاحية عرضه' });
  res.json(entityPayload('request', r, req.user));
});

router.patch('/requests/:id', (req, res) => {
  const r = loadEntity('request', Number(req.params.id));
  if (!r || !canSeeRequest(req.user, r)) return res.status(404).json({ error: 'غير موجود' });
  if (r.status !== 'active') return bad(res, 'الطلب مغلق');
  const b = req.body || {};
  const stage = REQUEST_STAGES[r.current_stage - 1];
  const acting = canActStage(req.user, stage, r);
  const changed = {};
  if ('sector_dept_id' in b || 'sector_deadline' in b) {
    if (!(r.current_stage === 2 && acting)) return res.status(403).json({ error: 'تحديد القطاع يتم في المرحلة الثانية من قبل السكرتارية' });
    const d = num(b.sector_dept_id); if (!d || !get('SELECT 1 FROM departments WHERE id = ?', d)) return bad(res, 'اختر القطاع المختص');
    const dl = date(b.sector_deadline); if (!dl) return bad(res, 'حدد مدة الإنجاز');
    if (r.donor_deadline && dl > r.donor_deadline) return bad(res, 'مهلة القطاع يجب ألا تتجاوز مهلة المانح');
    run('UPDATE requests SET sector_dept_id = ?, sector_deadline = ? WHERE id = ?', d, dl, r.id);
    Object.assign(changed, { sector_dept_id: d, sector_deadline: dl });
  }
  if ('assignee_id' in b || 'assignee_deadline' in b) {
    if (!(r.current_stage === 3 && acting)) return res.status(403).json({ error: 'التكليف يتم في المرحلة الثالثة من قبل القطاع المختص' });
    const u = num(b.assignee_id); const uu = u && get('SELECT * FROM users WHERE id = ? AND is_active = 1', u);
    if (!uu) return bad(res, 'اختر الموظف المكلف');
    if (!req.user.isOwner && !can(req.user, 'workflow.override') && uu.department_id !== r.sector_dept_id) return bad(res, 'الموظف يجب أن يكون من أفراد القطاع المختص');
    const dl = date(b.assignee_deadline); if (!dl) return bad(res, 'حدد مهلة الموظف');
    if (r.sector_deadline && dl > r.sector_deadline) return bad(res, 'مهلة الموظف يجب أن تكون أقصر من مهلة القطاع احتياطًا');
    run('UPDATE requests SET assignee_id = ?, assignee_deadline = ? WHERE id = ?', u, dl, r.id);
    notify([u], { title: `تكليف رسمي: ${r.title}`, body: `${r.code} — المهلة ${dl}`, link: LINK.request(r.id), kind: 'action' }, req.user.id);
    Object.assign(changed, { assignee_id: u, assignee_deadline: dl });
  }
  if ('deliverable' in b) {
    if (!(r.current_stage === 4 && acting)) return res.status(403).json({ error: 'رفع المخرجات من صلاحية الموظف المكلف في المرحلة الرابعة' });
    run('UPDATE requests SET deliverable = ? WHERE id = ?', str(b.deliverable, 8000), r.id);
    changed.deliverable = true;
  }
  const generic = ['title', 'donor', 'description', 'donor_deadline', 'priority', 'project_id'].filter((f) => f in b);
  if (generic.length) {
    if (!can(req.user, 'requests.create')) return res.status(403).json({ error: 'ليست لديك صلاحية تعديل بيانات الطلب' });
    for (const f of generic) {
      let v = b[f];
      if (f === 'donor_deadline') v = date(v); else if (f === 'project_id') v = num(v);
      else if (f === 'priority') v = ['high', 'urgent', 'normal'].includes(v) ? v : 'normal'; else v = str(v, f === 'description' ? 4000 : 200);
      if (f === 'title' && !v) return bad(res, 'العنوان مطلوب');
      run(`UPDATE requests SET ${f} = ? WHERE id = ?`, v, r.id); changed[f] = v;
    }
  }
  if (!Object.keys(changed).length) return bad(res, 'لا توجد تعديلات');
  event('request', r.id, r.current_stage, 'edit', req.user, 'تحديث: ' + Object.keys(changed).join('، '));
  audit(req, 'request.update', 'request', r.id, changed);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ stage actions (shared)
function withEntity(handler) {
  return (req, res) => {
    const type = req.params.type === 'projects' ? 'project' : req.params.type === 'requests' ? 'request' : null;
    if (!type) return res.status(404).json({ error: 'غير موجود' });
    const e = loadEntity(type, Number(req.params.id));
    if (!e || !canSeeEntity(req.user, type, e)) return res.status(404).json({ error: 'غير موجود' });
    return handler(req, res, type, e, DEFS[type][e.current_stage - 1]);
  };
}

router.post('/:type(projects|requests)/:id/check', withEntity((req, res, type, e, stage) => {
  const { check_id, done } = req.body || {};
  const ch = (stage.checks || []).find((c) => c.id === check_id);
  if (!ch) return bad(res, 'تأكيد غير معروف');
  if (e.stage_status !== 'active') return bad(res, 'المرحلة بانتظار الاعتماد');
  if (!canTick(req.user, ch, e)) return res.status(403).json({ error: 'هذا التأكيد من صلاحية إدارة أخرى' });
  if (done) run('INSERT OR REPLACE INTO stage_checks(entity_type, entity_id, stage, check_id, done_by) VALUES(?,?,?,?,?)', type, e.id, stage.n, ch.id, req.user.id);
  else run('DELETE FROM stage_checks WHERE entity_type = ? AND entity_id = ? AND stage = ? AND check_id = ?', type, e.id, stage.n, ch.id);
  event(type, e.id, stage.n, done ? 'check' : 'uncheck', req.user, `${done ? 'تأكيد' : 'إلغاء تأكيد'}: ${ch.label}`);
  audit(req, `${type}.check`, type, e.id, { stage: stage.n, check: ch.id, done: !!done });
  res.json({ ok: true });
}));

router.post('/:type(projects|requests)/:id/complete', withEntity((req, res, type, e, stage) => {
  if (e.status !== 'active') return bad(res, `${LABEL[type]} مغلق`);
  if (e.stage_status !== 'active') return bad(res, 'المرحلة بانتظار الاعتماد');
  if (!canActStage(req.user, stage, e)) return res.status(403).json({ error: 'هذه المرحلة من صلاحية إدارة أخرى' });
  const done = all('SELECT check_id FROM stage_checks WHERE entity_type = ? AND entity_id = ? AND stage = ?', type, e.id, stage.n).map((r) => r.check_id);
  const missing = (stage.checks || []).filter((c) => !done.includes(c.id));
  if (missing.length) return bad(res, 'لا يُعتمد الانتقال إلا بتأكيد مكتوب. التأكيدات الناقصة: ' + missing.map((m) => m.label).join(' | '));
  const g = gateProblem(type, e, stage.gate);
  if (g) return bad(res, g);
  const note = str((req.body || {}).note, 2000);
  tx(() => {
    if (stage.approval) {
      run(`UPDATE ${TABLE[type]} SET stage_status = 'pending_approval' WHERE id = ?`, e.id);
      event(type, e.id, stage.n, 'submitted', req.user, note || 'رُفعت المرحلة للاعتماد');
      notify(usersWithPerm('workflow.approve'), { title: `بانتظار اعتمادك: ${stage.title}`, body: `${e.code} — ${e.title}`, link: LINK[type](e.id), kind: 'approval' }, req.user.id);
    } else {
      event(type, e.id, stage.n, 'completed', req.user, note || stage.output);
      advance(type, e, req.user);
    }
  });
  audit(req, `${type}.complete`, type, e.id, { stage: stage.n });
  res.json({ ok: true });
}));

router.post('/:type(projects|requests)/:id/approve', withEntity((req, res, type, e, stage) => {
  if (e.stage_status !== 'pending_approval') return bad(res, 'لا توجد مرحلة بانتظار الاعتماد');
  if (!can(req.user, 'workflow.approve')) return res.status(403).json({ error: 'الاعتماد من صلاحية المدير العام' });
  const note = str((req.body || {}).note, 2000);
  tx(() => {
    if (type === 'project' && stage.n === 11) {
      run("UPDATE claims SET status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE project_id = ? AND status = 'submitted'", req.user.id, e.id);
    }
    event(type, e.id, stage.n, 'approved', req.user, note || `اعتماد: ${stage.output}`);
    advance(type, e, req.user);
  });
  audit(req, `${type}.approve`, type, e.id, { stage: stage.n });
  res.json({ ok: true });
}));

// Exceptional procedure (A): return the work for correction and log the error
router.post('/:type(projects|requests)/:id/return', withEntity((req, res, type, e, stage) => {
  if (e.status !== 'active') return bad(res, `${LABEL[type]} مغلق`);
  if (!(can(req.user, 'workflow.return') || can(req.user, 'workflow.approve') || can(req.user, 'workflow.override'))) return res.status(403).json({ error: 'ليست لديك صلاحية الإرجاع' });
  const b = req.body || {};
  const to = num(b.to_stage);
  if (!to || to < 1 || to > e.current_stage) return bad(res, 'اختر المرحلة التي وقع فيها الخطأ');
  const errorName = str(b.error_name, 200);
  if (!errorName) return bad(res, 'اسم الخطأ مطلوب (يُقيَّد في سجل الأخطاء الشهري)');
  const target = DEFS[type][to - 1];
  const deptId = num(b.department_id) || (target.actors[0] && !target.actors[0].startsWith('@') ? deptIdByKey(target.actors[0]) : (target.actors[0] === '@sector' ? e.sector_dept_id : null));
  const respUser = num(b.responsible_user_id) || (target.actors[0] === '@assignee' ? e.assignee_id : null);
  tx(() => {
    run(`INSERT INTO errors(entity_type, entity_id, entity_title, stage, stage_title, error_name, description, department_id, responsible_user_id, reported_by, severity)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`, type, e.id, `${e.code} — ${e.title}`, to, target.title, errorName, str(b.description, 4000), deptId, respUser, req.user.id,
    ['low', 'medium', 'high'].includes(b.severity) ? b.severity : 'medium');
    run('DELETE FROM stage_checks WHERE entity_type = ? AND entity_id = ? AND stage >= ?', type, e.id, to);
    run(`UPDATE ${TABLE[type]} SET current_stage = ?, stage_status = 'active', stage_started_at = datetime('now') WHERE id = ?`, to, e.id);
    event(type, e.id, to, 'returned', req.user, `إرجاع إلى المرحلة ${to} لتصحيح خطأ: ${errorName}${b.description ? ' — ' + str(b.description, 500) : ''}`);
  });
  const recipients = respUser ? [respUser] : stageActorsUserIds(target, e);
  notify(recipients, { title: `⚠️ أُرجع إليك العمل لتصحيح خطأ: ${errorName}`, body: `${e.code} — المرحلة ${to}: ${target.title}`, link: LINK[type](e.id), kind: 'error' }, req.user.id);
  notify(ccGeneralManager(), { title: `[نسخة] قُيِّد خطأ على ${e.code}`, body: `${errorName} — المرحلة ${to}`, link: LINK[type](e.id), kind: 'cc' }, req.user.id);
  audit(req, `${type}.return`, type, e.id, { to, errorName });
  res.json({ ok: true });
}));

router.post('/:type(projects|requests)/:id/comment', withEntity((req, res, type, e) => {
  const note = str((req.body || {}).note, 4000);
  if (!note) return bad(res, 'اكتب الملاحظة');
  event(type, e.id, e.current_stage, 'comment', req.user, note);
  res.json({ ok: true });
}));

router.delete('/requests/:id', (req, res) => {
  const r = loadEntity('request', Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'غير موجود' });
  if (!req.user.isOwner && !can(req.user, 'projects.delete')) return res.status(403).json({ error: 'لا تملك صلاحية الحذف' });
  tx(() => {
    run("DELETE FROM stage_checks WHERE entity_type='request' AND entity_id = ?", r.id);
    run("DELETE FROM workflow_events WHERE entity_type='request' AND entity_id = ?", r.id);
    run('DELETE FROM requests WHERE id = ?', r.id);
  });
  audit(req, 'request.delete', 'request', r.id, { code: r.code });
  res.json({ ok: true });
});

module.exports = { router, canSeeRequest, canActStage, loadEntity };
