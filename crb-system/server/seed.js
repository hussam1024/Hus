'use strict';
const fs = require('fs');
const path = require('path');
const { all, get, run, tx, getSetting, setSetting, DATA_DIR } = require('./db');
const { DEFAULT_ROLES, DEFAULT_DEPARTMENTS } = require('./permissions');
const { hashPassword, generatePassword } = require('./core');

function ensureBase() {
  tx(() => {
    for (const r of DEFAULT_ROLES) {
      const ex = get('SELECT id FROM roles WHERE key = ?', r.key);
      if (!ex) run('INSERT INTO roles(key, name, description, permissions, system) VALUES(?,?,?,?,?)', r.key, r.name, r.description, JSON.stringify(r.permissions), r.system);
      else if (r.key === 'owner') run('UPDATE roles SET permissions = ? WHERE id = ?', JSON.stringify(r.permissions), ex.id);
    }
    for (const d of DEFAULT_DEPARTMENTS) {
      if (!get('SELECT 1 FROM departments WHERE key = ?', d.key)) {
        const r = run('INSERT INTO departments(key, name, description, color, icon, permissions) VALUES(?,?,?,?,?,?)', d.key, d.name, d.description, d.color, d.icon, JSON.stringify(d.permissions));
        run("INSERT INTO channels(name, description, kind, department_id) VALUES(?,?,?,?)", d.name, 'قناة داخلية خاصة بأفراد الإدارة (ويطّلع عليها المدير العام)', 'department', Number(r.lastInsertRowid));
      }
    }
    if (!get("SELECT 1 FROM channels WHERE kind = 'public'")) {
      run("INSERT INTO channels(name, description, kind) VALUES(?,?,?)", 'الساحة العامة', 'النقاش العام لجميع طاقم المنتدى', 'public');
      run("INSERT INTO channels(name, description, kind) VALUES(?,?,?)", 'أفكار ومقترحات التطوير', 'شاركنا فكرتك لتحسين العمل والإجراءات', 'public');
      run("INSERT INTO channels(name, description, kind) VALUES(?,?,?)", 'الدعم الفني للنظام', 'أسئلة واستفسارات حول استخدام النظام', 'public');
    }
    const defaults = { org_name: 'منتدى الإغاثة والبناء', org_name_en: 'Coalition of Relief and Building', default_admin_fee_pct: '7', currency: 'USD', sla_warning_days: '5' };
    for (const [k, v] of Object.entries(defaults)) if (getSetting(k) == null) setSetting(k, v);
  });

  if (!get('SELECT 1 FROM users')) {
    const username = process.env.CRB_ADMIN_USER || 'admin';
    const password = process.env.CRB_ADMIN_PASSWORD || generatePassword();
    const owner = get("SELECT id FROM roles WHERE key = 'owner'").id;
    const gm = get("SELECT id FROM departments WHERE key = 'gm'").id;
    run('INSERT INTO users(username, full_name, job_title, department_id, role_id, password_hash, must_change_password) VALUES(?,?,?,?,?,?,1)',
      username, 'المضيف الرئيسي', 'المدير العام', gm, owner, hashPassword(password));
    const note = `\n================ أول تشغيل لنظام منتدى الإغاثة والبناء ================\n  اسم المستخدم : ${username}\n  كلمة المرور  : ${password}\n  (سيطلب منك النظام تغييرها فور الدخول — احذف ملف FIRST_LOGIN.txt بعد ذلك)\n=======================================================================\n`;
    console.log(note);
    fs.writeFileSync(path.join(DATA_DIR, 'FIRST_LOGIN.txt'), note, { mode: 0o600 });
  }
}

module.exports = { ensureBase };
