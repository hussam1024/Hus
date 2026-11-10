/* End-to-end API test: spins up the server on a temp DB with demo data and walks the real workflow.
   Run: npm test */
'use strict';
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const assert = require('assert');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crb-test-'));
const env = { ...process.env, CRB_DATA_DIR: dir, PORT: '3917', CRB_ADMIN_PASSWORD: 'Admin@2026x' };
const root = path.join(__dirname, '..');
execFileSync(process.execPath, ['server/demo.js'], { cwd: root, env, stdio: 'ignore' });
const srv = spawn(process.execPath, ['server/index.js'], { cwd: root, env, stdio: ['ignore', 'ignore', process.env.CRB_TEST_VERBOSE ? 'inherit' : 'ignore'] });
const B = 'http://127.0.0.1:3917/api';

function client() {
  let cookie = '';
  const call = async (method, p, body) => {
    const r = await fetch(B + p, { method, headers: { 'X-CRB': '1', 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    let data = null; try { data = await r.json(); } catch { /* */ }
    return { status: r.status, data };
  };
  return { get: (p) => call('GET', p), post: (p, b) => call('POST', p, b || {}), patch: (p, b) => call('PATCH', p, b) };
}
async function login(u, pw = 'Demo@2026') { const c = client(); const r = await c.post('/auth/login', { username: u, password: pw }); assert.strictEqual(r.status, 200, `login ${u}: ${JSON.stringify(r.data)}`); return c; }
let passed = 0; const ok = (m) => { passed++; console.log('  ✔ ' + m); };

(async () => {
  for (let i = 0; i < 40; i++) { try { await fetch(B + '/auth/me'); break; } catch { await new Promise((r) => setTimeout(r, 150)); } }

  // --- auth & owner first login
  const admin = await login('admin', 'Admin@2026x');
  assert.strictEqual((await admin.get('/dashboard')).status, 403); ok('owner must change temp password before using the system');
  assert.strictEqual((await admin.post('/auth/change-password', { current: 'Admin@2026x', next: 'short' })).status, 400); ok('weak password rejected');
  assert.strictEqual((await admin.post('/auth/change-password', { current: 'Admin@2026x', next: 'NewOwner2026' })).status, 200);
  assert.strictEqual((await admin.get('/dashboard')).status, 200); ok('owner password changed, dashboard loads');

  // CSRF header required
  const raw = await fetch(B + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.strictEqual(raw.status, 403); ok('state-changing request without X-CRB header is blocked (CSRF)');

  // lockout
  const bad = client();
  for (let i = 0; i < 5; i++) await bad.post('/auth/login', { username: 'auditor', password: 'wrong' });
  assert.strictEqual((await bad.post('/auth/login', { username: 'auditor', password: 'Demo@2026' })).status, 423); ok('account locks after 5 failed attempts');
  await admin.post('/admin/users/' + (await admin.get('/admin/users')).data.find((u) => u.username === 'auditor').id + '/unlock');

  // --- department isolation
  const fin = await login('fin.officer'); const log = await login('log.officer'); const media = await login('media.officer');
  assert.strictEqual((await fin.get('/suppliers')).status, 200);
  assert.strictEqual((await media.get('/transactions')).status, 403); ok('media cannot open finance ledger');
  assert.strictEqual((await log.get('/finance/summary')).status, 403); ok('logistics cannot open finance summary');
  assert.strictEqual((await fin.get('/media')).status, 403); ok('finance cannot open media');
  assert.strictEqual((await media.get('/admin/users')).status, 403); ok('staff cannot open user management');
  const pm = (await media.get('/projects/1')).data;
  assert.ok(!('net_amount' in pm.entity) && !pm.transactions); ok('finance fields hidden from non-finance users');

  // --- create project and walk stages
  const sec = await login('sec.head'); const gm = await login('gm.deputy'); const prj = await login('prj.head'); const lh = await login('log.head'); const fh = await login('fin.head'); const mh = await login('media.head');
  const np = await admin.post('/projects', { title: 'مشروع اختبار', donor: 'مانح', grant_amount: 10000, size: 'small', approval_date: '2026-11-01' });
  const id = np.data.id; const P = '/projects/' + id;
  assert.strictEqual((await lh.post(P + '/complete')).status, 403); ok('logistics cannot complete a GM stage');
  assert.strictEqual((await sec.post(P + '/complete')).status, 400); ok('stage cannot complete without written confirmation');
  await sec.post(P + '/check', { check_id: 'received', done: true });
  assert.strictEqual((await sec.post(P + '/complete')).status, 200); ok('stage 1 completed by secretariat');
  await lh.post(P + '/check', { check_id: 'quotes_done', done: true });
  assert.strictEqual((await lh.post(P + '/complete')).status, 400); ok('stage 2 gate: needs at least one quote');
  await lh.post(P + '/quotes', { supplier_id: 1, amount: 9000 }); await lh.post(P + '/quotes', { supplier_id: 2, amount: 8500 });
  assert.strictEqual((await lh.post(P + '/complete')).status, 200); ok('stage 2 completed');
  await fh.post(P + '/check', { check_id: 'fee_done', done: true });
  assert.strictEqual((await prj.patch(P, { admin_fee_pct: 7 })).status, 403); ok('projects dept cannot set admin fee');
  await fh.patch(P, { admin_fee_pct: 7 });
  assert.strictEqual((await fh.get(P)).data.entity.net_amount, 9300); ok('net amount computed after 7% admin fee');
  await fh.post(P + '/complete');
  const quotes = (await lh.get(P)).data.quotes;
  const high = quotes.find((q) => q.amount === 9000);
  assert.strictEqual((await lh.post(`/quotes/${high.id}/select`)).status, 400); ok('selecting a non-lowest quote needs a justification');
  await lh.post(`/quotes/${quotes.find((q) => q.amount === 8500).id}/select`);
  await lh.post(P + '/complete');
  assert.strictEqual((await lh.get(P)).data.entity.stage_status, 'pending_approval'); ok('stage 4 waits for GM approval');
  assert.strictEqual((await lh.post(P + '/approve')).status, 403); ok('logistics cannot approve its own stage');
  assert.strictEqual((await gm.post(P + '/approve')).status, 200); ok('GM approved stage 4');
  // return for error (exceptional A)
  const ret = await gm.post(P + '/return', { to_stage: 3, error_name: 'خطأ في النسبة' });
  assert.strictEqual(ret.status, 200);
  const after = (await gm.get(P)).data;
  assert.strictEqual(after.entity.current_stage, 3); assert.strictEqual(after.errors.length, 1); ok('return moved project to stage 3 and logged the error');
  const errs = (await sec.get('/errors')).data; assert.ok(errs.rows.some((e) => e.error_name === 'خطأ في النسبة')); ok('error appears in monthly error log');

  // --- requests
  const rq = await sec.post('/requests', { title: 'طلب اختبار', donor_deadline: '2030-01-10' });
  const R = '/requests/' + rq.data.id;
  assert.strictEqual((await media.get(R)).status, 404); ok('request hidden from unrelated department');
  await sec.post(R + '/check', { check_id: 'received', done: true }); await sec.post(R + '/complete');
  const mediaDept = (await admin.get('/admin/departments')).data.find((d) => d.key === 'media').id;
  assert.strictEqual((await sec.patch(R, { sector_dept_id: mediaDept, sector_deadline: '2030-02-01' })).status, 400); ok('sector deadline cannot exceed donor deadline');
  await sec.patch(R, { sector_dept_id: mediaDept, sector_deadline: '2030-01-05' }); await sec.post(R + '/complete');
  assert.strictEqual((await media.get(R)).status, 200); ok('assigned sector now sees the request');
  const mo = (await admin.get('/admin/users')).data.find((u) => u.username === 'media.officer').id;
  assert.strictEqual((await mh.patch(R, { assignee_id: mo, assignee_deadline: '2030-01-07' })).status, 400); ok('employee deadline must be shorter than sector deadline');
  await mh.patch(R, { assignee_id: mo, assignee_deadline: '2030-01-03' }); await mh.post(R + '/complete');
  await media.patch(R, { deliverable: 'تم' }); await media.post(R + '/check', { check_id: 'self_review', done: true });
  assert.strictEqual((await media.post(R + '/complete')).status, 200); ok('assigned employee delivered the request');

  // --- chat isolation
  const ch = (await fin.get('/chat/channels')).data;
  assert.ok(ch.every((c) => c.kind !== 'department' || c.name.includes('المالية'))); ok('finance sees only its own department channel');
  const logCh = (await log.get('/chat/channels')).data.find((c) => c.kind === 'department');
  assert.strictEqual((await fin.get(`/chat/channels/${logCh.id}/messages`)).status, 404); ok('cannot read another department channel');
  const pub = ch.find((c) => c.kind === 'public');
  assert.strictEqual((await fin.post(`/chat/channels/${pub.id}/messages`, { body: 'مرحبا @log.officer' })).status, 200);
  assert.ok((await log.get('/notifications')).data.some((n) => n.kind === 'mention')); ok('@mention notifies the colleague');

  // --- owner creates a user
  const nu = await admin.post('/admin/users', { username: 'new.user', full_name: 'موظف جديد', role_id: 4, department_id: mediaDept });
  assert.ok(nu.data.temp_password); const c2 = await login('new.user', nu.data.temp_password);
  assert.strictEqual((await c2.get('/dashboard')).status, 403); ok('new user gets a temp password and must change it');

  console.log(`\n✅ ${passed} checks passed`);
  srv.kill(); fs.rmSync(dir, { recursive: true, force: true });
})().catch((e) => { console.error('❌', e); srv.kill(); process.exit(1); });
