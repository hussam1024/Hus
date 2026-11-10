'use strict';
/**
 * Demo data — run once with:  npm run demo
 * Creates sample staff in every department + sample projects at different stages so you can explore the system.
 * All demo accounts use the password:  Demo@2026   (delete them from «إدارة المستخدمين» before real use)
 */
const { all, get, run, tx } = require('./db');
const { ensureBase } = require('./seed');
const { hashPassword } = require('./core');
const { PROJECT_STAGES, REQUEST_STAGES } = require('./workflows');

ensureBase();
if (get("SELECT 1 FROM users WHERE username = 'sec.head'")) { console.log('البيانات التجريبية موجودة مسبقًا.'); process.exit(0); }

const PW = hashPassword('Demo@2026');
const dept = (k) => get('SELECT id FROM departments WHERE key = ?', k).id;
const role = (k) => get('SELECT id FROM roles WHERE key = ?', k).id;
const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const ts = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 19).replace('T', ' ');

const people = [
  ['gm.deputy', 'عبدالله محمد الصالح', 'نائب المدير العام', 'gm', 'gm'],
  ['sec.head', 'سامي علي الحميري', 'مسؤول المتابعة والرفع', 'secretariat', 'head'],
  ['sec.officer', 'مريم أحمد ناصر', 'سكرتيرة الإدارة العامة', 'secretariat', 'officer'],
  ['prj.head', 'خالد عبدالرحمن العمري', 'مدير المشاريع', 'projects', 'head'],
  ['prj.officer', 'فاطمة سعيد الشريف', 'مسؤولة مشاريع', 'projects', 'officer'],
  ['prj.field', 'يوسف حسن القاضي', 'منسق ميداني', 'projects', 'officer'],
  ['log.head', 'ماجد صالح الكبسي', 'مدير اللوجستيات', 'logistics', 'head'],
  ['log.officer', 'عمر ناجي المرادي', 'مسؤول المشتريات', 'logistics', 'officer'],
  ['fin.head', 'هدى عبدالله الأهدل', 'المديرة المالية', 'finance', 'head'],
  ['fin.officer', 'نبيل محمد الزبيدي', 'محاسب', 'finance', 'officer'],
  ['media.head', 'ريم خالد السقاف', 'مديرة الإعلام', 'media', 'head'],
  ['media.officer', 'أنس فؤاد العبسي', 'مصور ومحرر', 'media', 'officer'],
  ['auditor', 'إبراهيم يحيى المقطري', 'مدقق داخلي', null, 'auditor'],
];

tx(() => {
  const U = {};
  for (const [username, name, title, d, r] of people) {
    const res = run('INSERT INTO users(username, full_name, job_title, department_id, role_id, password_hash, must_change_password, email, phone) VALUES(?,?,?,?,?,?,0,?,?)',
      username, name, title, d ? dept(d) : null, role(r), PW, `${username.replace('.', '_')}@crb.example`, `+967 7${Math.floor(10000000 + Math.random() * 89999999)}`);
    U[username] = Number(res.lastInsertRowid);
  }
  U.admin = 1;
  for (const k of ['secretariat', 'projects', 'logistics', 'finance', 'media']) {
    const head = people.find((p) => p[3] === k && p[4] === 'head');
    run('UPDATE departments SET head_user_id = ? WHERE key = ?', U[head[0]], k);
  }

  const sup = [
    ['مؤسسة السعيد للتجارة العامة', 'مواد غذائية', 'محمد السعيد', 5],
    ['شركة الأمل للمقاولات والتوريدات', 'مواد بناء', 'علي الأمل', 4],
    ['مجموعة الريان التجارية', 'مواد غذائية', 'صالح الريان', 4],
    ['مؤسسة النور للأدوات الصحية', 'مستلزمات إيواء', 'حسن النور', 3],
  ].map(([n, c, p, r]) => Number(run('INSERT INTO suppliers(name, category, contact_person, rating, phone) VALUES(?,?,?,?,?)', n, c, p, r, '+967 1 234567').lastInsertRowid));

  const ev = (type, id, stage, action, user, note, off) => run('INSERT INTO workflow_events(entity_type, entity_id, stage, action, user_id, note, created_at) VALUES(?,?,?,?,?,?,?)', type, id, stage, action, user, note, ts(off));
  const actorUser = { gm: U.admin, secretariat: U['sec.head'], projects: U['prj.head'], logistics: U['log.head'], finance: U['fin.head'], media: U['media.head'] };

  function walk(type, id, toStage, startOff, stepDays) {
    const defs = type === 'project' ? PROJECT_STAGES : REQUEST_STAGES;
    let off = startOff;
    ev(type, id, 1, 'created', U['sec.head'], 'تسجيل في النظام', off);
    for (let n = 1; n < toStage; n++) {
      const s = defs[n - 1];
      off += stepDays;
      for (const ch of s.checks || []) {
        const who = ch.dept[0].startsWith('@') ? U['prj.officer'] : actorUser[ch.dept[0]];
        run('INSERT INTO stage_checks(entity_type, entity_id, stage, check_id, done_by, done_at) VALUES(?,?,?,?,?,?)', type, id, n, ch.id, who, ts(off - 0.2));
      }
      const doer = s.actors[0].startsWith('@') ? U['prj.officer'] : actorUser[s.actors[0]];
      if (s.approval) { ev(type, id, n, 'submitted', doer, 'رُفعت المرحلة للاعتماد', off - 0.3); ev(type, id, n, 'approved', U.admin, 'اعتماد: ' + s.output, off); }
      else ev(type, id, n, 'completed', doer, s.output, off);
    }
    return ts(off);
  }

  const projects = [
    { title: 'سلال غذائية للأسر النازحة – مخيمات صرواح', donor: 'هيئة الإغاثة التركية', sector: 'الأمن الغذائي', location: 'مأرب – صرواح', size: 'small', grant: 48000, ben: 1200, stage: 1 },
    { title: 'ترميم مدرسة النور الأساسية', donor: 'وقف الديانة التركي', sector: 'التعليم', location: 'مأرب – الوادي', size: 'large', grant: 126000, ben: 850, stage: 4, pending: true },
    { title: 'توزيع حقائب الشتاء والبطانيات', donor: 'هيئة الإغاثة التركية', sector: 'الإيواء', location: 'مأرب – الجوبة', size: 'small', grant: 35500, ben: 900, stage: 8 },
    { title: 'حفر بئر مياه ارتوازية لقرية آل جلال', donor: 'جمعية سقيا الماء', sector: 'المياه والإصحاح', location: 'مأرب – حريب', size: 'large', grant: 92000, ben: 3400, stage: 12 },
    { title: 'كسوة العيد للأيتام', donor: 'هيئة الإغاثة التركية', sector: 'رعاية الأيتام', location: 'مأرب – المدينة', size: 'small', grant: 22000, ben: 600, stage: 16 },
    { title: 'مشروع الأضاحي 1447هـ', donor: 'وقف الديانة التركي', sector: 'الأمن الغذائي', location: 'مأرب – مديريات متعددة', size: 'large', grant: 210000, ben: 5200, stage: 6 },
  ];
  const year = new Date().getFullYear();
  projects.forEach((p, i) => {
    const code = `PRJ-${year}-${String(i + 1).padStart(3, '0')}`;
    const closed = p.stage > 15;
    const fee = p.stage > 3 ? 7 : null;
    const r = run(`INSERT INTO projects(code, title, donor, sector, location, size, grant_amount, beneficiaries, approval_date, admin_fee_pct, admin_fee_amount, net_amount,
        execution_date, plan_budget, plan_wages, media_link, current_stage, stage_status, status, created_by, created_at, closed_at, priority, stage_started_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    code, p.title, p.donor, p.sector, p.location, p.size, p.grant, p.ben, day(-40 + i * 5), fee, fee ? p.grant * 0.07 : null, fee ? p.grant * 0.93 : null,
    p.stage >= 6 ? day(i === 5 ? 9 : -10) : null, p.stage >= 6 ? p.grant * 0.85 : null, p.stage >= 6 ? p.grant * 0.05 : null,
    p.stage > 8 ? 'https://drive.example.com/crb/' + code : null, closed ? 15 : p.stage, p.pending ? 'pending_approval' : closed ? 'done' : 'active',
    closed ? 'closed' : 'active', U['sec.head'], ts(-45 + i * 5), closed ? ts(-2) : null, i === 5 ? 'urgent' : 'normal', ts(i === 3 ? -8 : -1.5));
    const id = Number(r.lastInsertRowid);
    run("INSERT INTO channels(name, description, kind, project_id) VALUES(?,?,?,?)", `مشروع ${code}`, p.title, 'project', id);
    walk('project', id, closed ? 16 : p.stage, -45 + i * 5, 2.2);
    if (p.pending) ev('project', id, 4, 'submitted', U['log.head'], 'تم اختيار أقل عرض ورُفع للمدير العام للاعتماد', -0.5);
    if (p.stage >= 2) {
      const amounts = [p.grant * 0.81, p.grant * 0.78, p.grant * 0.84];
      amounts.forEach((a, k) => run('INSERT INTO quotes(project_id, supplier_id, amount, delivery_days, selected, created_by) VALUES(?,?,?,?,?,?)', id, sup[k % 4], Math.round(a), 7 + k * 3, p.stage >= 4 && k === 1 ? 1 : 0, U['log.officer']));
    }
    if (p.size === 'large' && p.stage >= 5) run("INSERT INTO contracts(project_id, supplier_id, title, amount, status, signed_by, signed_at, created_by) VALUES(?,?,?,?,?,?,?,?)", id, sup[1], `عقد توريد – ${p.title}`, Math.round(p.grant * 0.78), 'signed', U.admin, ts(-20), U['log.head']);
    if (p.stage >= 7) run("INSERT INTO media_items(project_id, title, kind, scheduled_date, reporter_id, status, link) VALUES(?,?,?,?,?,?,?)", id, 'تغطية يوم التنفيذ', 'coverage', day(-10), U['media.officer'], p.stage > 8 ? 'reviewed' : 'covered', p.stage > 8 ? 'https://drive.example.com/crb/' + code : null);
    if (p.stage >= 12) {
      run("INSERT INTO claims(project_id, supplier_id, amount, description, status, logistics_ok, finance_ok, approved_by, approved_at, created_by) VALUES(?,?,?,?,?,1,1,?,?,?)", id, sup[1], Math.round(p.grant * 0.78), 'قيمة المواد الموردة كاملة', closed ? 'paid' : 'approved', U.admin, ts(-3), U['log.head']);
      if (closed) run("UPDATE claims SET cheque_no = '004512', bank = 'بنك التضامن', paid_at = ? WHERE project_id = ?", ts(-2.5), id);
    }
    if (fee) run("INSERT INTO transactions(project_id, type, category, amount, description, tx_date, created_by) VALUES(?,?,?,?,?,?,?)", id, 'income', 'grant', p.grant, 'استلام منحة المشروع', day(-38 + i * 5), U['fin.head']);
    if (closed) run("INSERT INTO transactions(project_id, type, category, amount, description, ref, tx_date, created_by) VALUES(?,?,?,?,?,?,?,?)", id, 'expense', 'supplier', Math.round(p.grant * 0.78), 'صرف مستحقات المورد', 'شيك 004512 — بنك التضامن', day(-3), U['fin.head']);
  });
  // an error logged on project 3 (returned at documentation stage)
  run(`INSERT INTO errors(entity_type, entity_id, entity_title, stage, stage_title, error_name, description, department_id, responsible_user_id, reported_by, severity, created_at)
    VALUES('project', 3, ?, 8, ?, 'نقص صور التوزيع', 'التوثيقات المرفوعة لا تتضمن صور تسليم الحقائب للمستفيدين', ?, ?, ?, 'medium', ?)`,
  `PRJ-${year}-003 — توزيع حقائب الشتاء والبطانيات`, PROJECT_STAGES[7].title, dept('media'), U['media.officer'], U['prj.head'], ts(-1));
  run(`INSERT INTO errors(entity_type, entity_id, entity_title, stage, stage_title, error_name, department_id, responsible_user_id, reported_by, severity, created_at, status, resolved_at)
    VALUES('project', 4, ?, 13, ?, 'كشف المستفيدين غير موقّع', ?, ?, ?, 'high', ?, 'resolved', ?)`,
  `PRJ-${year}-004 — حفر بئر مياه`, PROJECT_STAGES[12].title, dept('projects'), U['prj.field'], U['fin.head'], ts(-6), ts(-5));
  ev('project', 3, 8, 'returned', U['prj.head'], 'إرجاع إلى المرحلة 8 لتصحيح خطأ: نقص صور التوزيع', -1);

  // requests
  const reqs = [
    { title: 'تقرير قصة نجاح لمشروع بئر المياه', stage: 2, dl: day(6) },
    { title: 'تحديث كشوف المستفيدين بصيغة المانح الجديدة', stage: 4, dl: day(2), sector: 'projects', assignee: 'prj.officer', adl: day(-1) },
    { title: 'عرض فني ومالي لمشروع كفالة الأيتام', stage: 5, dl: day(4), sector: 'projects', assignee: 'prj.field', adl: day(1), deliverable: 'تم إعداد العرض الفني والمالي ومراجعته (مرفق)' },
    { title: 'صور عالية الدقة لمشروع كسوة العيد', stage: 7, dl: day(-5), sector: 'media', assignee: 'media.officer', adl: day(-8), deliverable: 'تم رفع 40 صورة عبر الرابط المعتمد' },
  ];
  reqs.forEach((q, i) => {
    const code = `REQ-${year}-${String(i + 1).padStart(3, '0')}`;
    const closed = q.stage > 6;
    const r = run(`INSERT INTO requests(code, title, donor, received_at, donor_deadline, sector_dept_id, sector_deadline, assignee_id, assignee_deadline, deliverable, current_stage, status, created_by, created_at, closed_at, project_id, stage_started_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, code, q.title, 'هيئة الإغاثة التركية', day(-6 - i), q.dl, q.sector ? dept(q.sector) : null, q.sector ? day(i) : null,
    q.assignee ? U[q.assignee] : null, q.adl || null, q.deliverable || null, closed ? 6 : q.stage, closed ? 'closed' : 'active', U['sec.head'], ts(-6 - i), closed ? ts(-6) : null, i === 0 ? 4 : null, ts(-2));
    walk('request', Number(r.lastInsertRowid), closed ? 7 : q.stage, -6 - i, 0.8);
  });

  // collaboration
  const general = get("SELECT id FROM channels WHERE kind = 'public' ORDER BY id LIMIT 1").id;
  const msgs = [
    [U.admin, 'السلام عليكم ورحمة الله 🌿 أهلًا بكم جميعًا في النظام الجديد للمنتدى. من اليوم كل العمليات تمر من هنا بدل الإيميلات العشوائية.'],
    [U['prj.head'], 'وعليكم السلام، ممتاز جدًا 👏 سهّل علينا متابعة المراحل.'],
    [U['fin.head'], 'تنبيه للجميع: آخر موعد لتسليم الإخلاءات المالية لمشروع البئر يوم الخميس.'],
    [U['media.head'], '@prj.head تم رفع توثيقات حقائب الشتاء، سنضيف صور التسليم المطلوبة اليوم إن شاء الله.'],
  ];
  msgs.forEach(([u, b], k) => run('INSERT INTO messages(channel_id, user_id, body, created_at) VALUES(?,?,?,?)', general, u, b, ts(-1 + k * 0.05)));
  run('UPDATE messages SET pinned = 1 WHERE id = 1');
  run(`INSERT INTO announcements(title, body, priority, require_ack, created_by) VALUES(?,?,?,?,?)`,
    'اعتماد دليل العمليات الإدارية – الإصدار الأول',
    'يُعتمد دليل العمليات الإدارية (استقبال المشاريع والطلبات وتنفيذها وإغلاقها) ابتداءً من تاريخه. لا يُعتمد الانتقال من مرحلة إلى أخرى إلا بتأكيد مكتوب داخل النظام، ويُقيَّد كل خطأ على المسؤول عنه في سجل الأخطاء الشهري. يرجى من الجميع الاطلاع والتأكيد.', 'important', 1, U.admin);
  const tasks = [
    ['تجهيز كشوف المستفيدين لمشروع الأضاحي', 'prj.officer', 3, 'high', 'doing'],
    ['متابعة عروض أسعار الأضاحي من 3 موردين', 'log.officer', 2, 'urgent', 'todo'],
    ['تصميم بوستر حملة الشتاء', 'media.officer', 5, 'normal', 'todo'],
    ['مطابقة كشف حساب البنك لشهر أكتوبر', 'fin.officer', -1, 'high', 'todo'],
    ['أرشفة الإخلاءات الورقية لمشروع الكسوة', 'sec.officer', 1, 'normal', 'review'],
  ];
  tasks.forEach(([t, a, d, pr, st]) => run('INSERT INTO tasks(title, assignee_id, created_by, due_date, priority, status) VALUES(?,?,?,?,?,?)', t, U[a], U.admin, day(d), pr, st));
  run(`INSERT INTO meetings(title, meeting_date, location, agenda, attendees, created_by) VALUES(?,?,?,?,?,?)`,
    'الاجتماع الأسبوعي لمدراء الإدارات', day(2) + 'T10:00', 'قاعة الاجتماعات – الإدارة العامة', '1. مراجعة المشاريع المتأخرة\n2. سجل الأخطاء الشهري\n3. خطة مشروع الأضاحي',
    JSON.stringify([U['sec.head'], U['prj.head'], U['log.head'], U['fin.head'], U['media.head']]), U.admin);
  run(`INSERT INTO correspondence(direction, ref_no, subject, party, corr_date, project_id) VALUES('in', 'و-0001/${year}', 'اعتماد مشروع ترميم مدرسة النور', 'وقف الديانة التركي', ?, 2)`, day(-35));
  run(`INSERT INTO correspondence(direction, ref_no, subject, party, corr_date, project_id) VALUES('out', 'ص-0001/${year}', 'رفع الإخلاءات الإعلامية لمشروع كسوة العيد', 'هيئة الإغاثة التركية', ?, 5)`, day(-4));
  run("INSERT INTO leaves(user_id, kind, start_date, end_date, days, reason, delegate_id) VALUES(?,?,?,?,?,?,?)", U['log.officer'], 'annual', day(12), day(15), 4, 'ظرف عائلي', U['log.head']);
});
console.log('✅ تم إنشاء البيانات التجريبية. كلمة مرور جميع الحسابات التجريبية: Demo@2026');
console.log('   الحسابات: ' + people.map((p) => p[0]).join('، '));
