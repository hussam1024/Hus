'use strict';
const path = require('path');
const fs = require('fs');

// Silence the one-time ExperimentalWarning of node:sqlite (built into Node ≥ 22.13)
const origEmit = process.emitWarning;
process.emitWarning = function (w, ...rest) {
  if (String(w && w.message || w).includes('SQLite')) return;
  return origEmit.call(process, w, ...rest);
};
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.CRB_DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'crb.sqlite');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY, key TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT,
  color TEXT DEFAULT '#01a453', icon TEXT DEFAULT 'layers', permissions TEXT DEFAULT '[]',
  head_user_id INTEGER, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY, key TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT,
  permissions TEXT DEFAULT '[]', system INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL COLLATE NOCASE, full_name TEXT NOT NULL,
  email TEXT, phone TEXT, job_title TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  password_hash TEXT NOT NULL, must_change_password INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1, failed_attempts INTEGER DEFAULT 0, locked_until TEXT,
  extra_perms TEXT DEFAULT '[]', denied_perms TEXT DEFAULT '[]',
  last_login TEXT, password_changed_at TEXT, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')), last_seen TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL, ip TEXT, user_agent TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY, code TEXT UNIQUE, title TEXT NOT NULL, donor TEXT, sector TEXT, location TEXT,
  size TEXT DEFAULT 'small', currency TEXT DEFAULT 'USD',
  grant_amount REAL DEFAULT 0, admin_fee_pct REAL, admin_fee_amount REAL, net_amount REAL,
  beneficiaries INTEGER DEFAULT 0, approval_date TEXT, execution_date TEXT, end_date TEXT,
  plan_budget REAL, plan_wages REAL, plan_notes TEXT, media_link TEXT,
  description TEXT, current_stage INTEGER DEFAULT 1, stage_status TEXT DEFAULT 'active',
  stage_started_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'active', priority TEXT DEFAULT 'normal',
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now')), closed_at TEXT
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY, code TEXT UNIQUE, title TEXT NOT NULL, donor TEXT, description TEXT,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  received_at TEXT, donor_deadline TEXT,
  sector_dept_id INTEGER REFERENCES departments(id), sector_deadline TEXT,
  assignee_id INTEGER REFERENCES users(id), assignee_deadline TEXT,
  deliverable TEXT, current_stage INTEGER DEFAULT 1, stage_status TEXT DEFAULT 'active',
  stage_started_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'active', priority TEXT DEFAULT 'normal',
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now')), closed_at TEXT
);

CREATE TABLE IF NOT EXISTS stage_checks (
  entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, stage INTEGER NOT NULL, check_id TEXT NOT NULL,
  done_by INTEGER REFERENCES users(id), done_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (entity_type, entity_id, stage, check_id)
);

CREATE TABLE IF NOT EXISTS workflow_events (
  id INTEGER PRIMARY KEY, entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, stage INTEGER,
  action TEXT NOT NULL, user_id INTEGER REFERENCES users(id), note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_wf_entity ON workflow_events(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, contact_person TEXT, phone TEXT, email TEXT,
  address TEXT, rating INTEGER DEFAULT 0, notes TEXT, is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id), amount REAL NOT NULL, delivery_days INTEGER,
  details TEXT, selected INTEGER DEFAULT 0, created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY, project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id), title TEXT NOT NULL, amount REAL, quantities TEXT,
  delivery_date TEXT, status TEXT DEFAULT 'draft', signed_by INTEGER REFERENCES users(id), signed_at TEXT,
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY, project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id), amount REAL NOT NULL, description TEXT,
  status TEXT DEFAULT 'submitted', logistics_ok INTEGER DEFAULT 0, finance_ok INTEGER DEFAULT 0,
  approved_by INTEGER REFERENCES users(id), approved_at TEXT,
  cheque_no TEXT, bank TEXT, paid_at TEXT, paid_by INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  type TEXT NOT NULL, category TEXT, amount REAL NOT NULL, description TEXT, ref TEXT, tx_date TEXT,
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_items (
  id INTEGER PRIMARY KEY, project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL, kind TEXT DEFAULT 'coverage', scheduled_date TEXT, link TEXT,
  reporter_id INTEGER REFERENCES users(id), status TEXT DEFAULT 'planned', notes TEXT,
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS correspondence (
  id INTEGER PRIMARY KEY, direction TEXT NOT NULL, ref_no TEXT, subject TEXT NOT NULL, party TEXT,
  corr_date TEXT, channel TEXT, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL, notes TEXT,
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS errors (
  id INTEGER PRIMARY KEY, entity_type TEXT, entity_id INTEGER, entity_title TEXT, stage INTEGER, stage_title TEXT,
  error_name TEXT NOT NULL, description TEXT,
  department_id INTEGER REFERENCES departments(id), responsible_user_id INTEGER REFERENCES users(id),
  reported_by INTEGER REFERENCES users(id), severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open', resolved_at TEXT, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY, entity_type TEXT, entity_id INTEGER, category TEXT, original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL, mime TEXT, size INTEGER, uploaded_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT, kind TEXT DEFAULT 'public',
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  dm_key TEXT UNIQUE, archived INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (channel_id, user_id)
);
CREATE TABLE IF NOT EXISTS channel_reads (
  channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  last_read_id INTEGER DEFAULT 0, PRIMARY KEY (channel_id, user_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY, channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id), body TEXT NOT NULL, reply_to INTEGER, pinned INTEGER DEFAULT 0,
  file_id INTEGER REFERENCES files(id), edited_at TEXT, deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_msg_channel ON messages(channel_id, id);
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL, PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, priority TEXT DEFAULT 'normal',
  audience_dept_id INTEGER REFERENCES departments(id) ON DELETE CASCADE, require_ack INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now')), expires_at TEXT
);
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL, created_by INTEGER REFERENCES users(id),
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  meeting_id INTEGER, due_date TEXT, priority TEXT DEFAULT 'normal', status TEXT DEFAULT 'todo',
  completed_at TEXT, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL, meeting_date TEXT, location TEXT, agenda TEXT, minutes TEXT,
  attendees TEXT DEFAULT '[]', status TEXT DEFAULT 'scheduled',
  created_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT DEFAULT 'annual', start_date TEXT NOT NULL, end_date TEXT NOT NULL, days INTEGER, reason TEXT,
  delegate_id INTEGER REFERENCES users(id), status TEXT DEFAULT 'pending',
  decided_by INTEGER REFERENCES users(id), decided_at TEXT, decision_note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT DEFAULT 'info', title TEXT NOT NULL, body TEXT, link TEXT, read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_notif_user ON notifications(user_id, read_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY, user_id INTEGER, username TEXT, action TEXT NOT NULL, entity TEXT, entity_id INTEGER,
  details TEXT, ip TEXT, created_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- helpers ----------
const stmtCache = new Map();
function prep(sql) {
  let s = stmtCache.get(sql);
  if (!s) { s = db.prepare(sql); stmtCache.set(sql, s); }
  return s;
}
const norm = (params) => params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
const all = (sql, ...p) => prep(sql).all(...norm(p));
const get = (sql, ...p) => prep(sql).get(...norm(p));
const run = (sql, ...p) => prep(sql).run(...norm(p));
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
const json = (s, d = []) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };

function getSetting(key, def = null) {
  const r = get('SELECT value FROM settings WHERE key = ?', key);
  return r ? r.value : def;
}
function setSetting(key, value) {
  run('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
}

module.exports = { db, all, get, run, tx, json, getSetting, setSetting, DATA_DIR, DB_PATH };
