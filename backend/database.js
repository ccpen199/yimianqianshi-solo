const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, process.env.DB_PATH || '../data/app.sqlite');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`PRAGMA foreign_keys = ON`);

      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('supervisor', 'operator', 'quality_inspector', 'admin')),
        phone TEXT,
        email TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'offline', 'disabled')),
        current_task_count INTEGER DEFAULT 0,
        max_daily_tasks INTEGER DEFAULT 50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS blacklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        reason TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        region TEXT,
        product TEXT,
        customer_level TEXT CHECK(customer_level IN ('A', 'B', 'C', 'D')),
        source TEXT NOT NULL,
        status TEXT DEFAULT 'new' CHECK(status IN ('new', 'assigned', 'calling', 'follow_up', 'deal', 'invalid', 'rejected', 'lost')),
        intent_level TEXT CHECK(intent_level IN ('high', 'medium', 'low', 'none')),
        assigned_to INTEGER,
        last_called_at DATETIME,
        next_follow_up_at DATETIME,
        total_calls INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS lead_import_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        total_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        duplicate_count INTEGER DEFAULT 0,
        blacklist_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS lead_import_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        import_log_id INTEGER NOT NULL,
        row_number INTEGER,
        phone TEXT,
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        row_data TEXT,
        FOREIGN KEY (import_log_id) REFERENCES lead_import_logs(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL,
        agent_id INTEGER NOT NULL,
        supervisor_id INTEGER NOT NULL,
        priority TEXT DEFAULT 'normal' CHECK(priority IN ('high', 'normal', 'low')),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'reassigned')),
        daily_goal_date DATE,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (lead_id) REFERENCES leads(id),
        FOREIGN KEY (agent_id) REFERENCES users(id),
        FOREIGN KEY (supervisor_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS call_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL,
        agent_id INTEGER NOT NULL,
        task_id INTEGER,
        call_result TEXT NOT NULL CHECK(call_result IN ('connected', 'no_answer', 'busy', 'invalid_number', 'rejected', 'voicemail')),
        disposition TEXT CHECK(disposition IN ('deal', 'invalid', 'rejected', 'follow_up', 'lost')),
        intent_level TEXT CHECK(intent_level IN ('high', 'medium', 'low', 'none')),
        notes TEXT,
        recording_url TEXT,
        duration INTEGER,
        next_follow_up_at DATETIME,
        quality_checked BOOLEAN DEFAULT 0,
        quality_status TEXT CHECK(quality_status IN ('passed', 'failed', 'pending')),
        quality_notes TEXT,
        quality_inspector_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id),
        FOREIGN KEY (agent_id) REFERENCES users(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (quality_inspector_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS daily_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id INTEGER NOT NULL,
        goal_date DATE NOT NULL,
        target_calls INTEGER DEFAULT 50,
        completed_calls INTEGER DEFAULT 0,
        target_deals INTEGER DEFAULT 5,
        completed_deals INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(agent_id, goal_date),
        FOREIGN KEY (agent_id) REFERENCES users(id)
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_call_records_lead_id ON call_records(lead_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_call_records_agent_id ON call_records(agent_id)`);

      db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row.count === 0) {
          const bcrypt = require('bcryptjs');
          const hashedPassword = bcrypt.hashSync('admin123', 10);
          db.run(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
            ['admin', hashedPassword, '系统管理员', 'admin']);
          
          const supervisorPass = bcrypt.hashSync('supervisor123', 10);
          db.run(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
            ['supervisor', supervisorPass, '张主管', 'supervisor']);
          
          const operatorPass = bcrypt.hashSync('operator123', 10);
          db.run(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
            ['operator', operatorPass, '李坐席', 'operator']);
          
          const inspectorPass = bcrypt.hashSync('inspector123', 10);
          db.run(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
            ['inspector', inspectorPass, '王质检员', 'quality_inspector'], (err) => {
              if (err) reject(err);
              else resolve();
            });
        } else {
          resolve();
        }
      });
    });
  });
};

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = {
  db,
  initDatabase,
  runQuery,
  getOne,
  getAll
};
