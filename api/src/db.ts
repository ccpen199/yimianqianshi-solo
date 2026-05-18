import sqlite3 from 'sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'app.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        variables_json TEXT,
        example_input TEXT,
        scenario TEXT,
        risk_description TEXT,
        status TEXT DEFAULT 'draft',
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id INTEGER NOT NULL,
        version_number TEXT NOT NULL,
        content TEXT NOT NULL,
        variables_json TEXT,
        change_description TEXT,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prompt_id) REFERENCES prompts(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        input_data TEXT NOT NULL,
        expected_output TEXT,
        prompt_id INTEGER,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prompt_id) REFERENCES prompts(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_version_id INTEGER NOT NULL,
        test_case_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        actual_output TEXT,
        score REAL,
        error_message TEXT,
        error_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id),
        FOREIGN KEY (test_case_id) REFERENCES test_cases(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS releases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_version_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending_review',
        gray_ratio REAL DEFAULT 0,
        usage_scope TEXT,
        approver_id INTEGER,
        approved_at DATETIME,
        rollback_reason TEXT,
        rolled_back_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id),
        FOREIGN KEY (approver_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS monitoring_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        release_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        call_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        avg_score REAL,
        complaint_count INTEGER DEFAULT 0,
        log_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (release_id) REFERENCES releases(id)
      )
    `);

    const initialUsers = [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'engineer', password: 'engineer123', role: 'engineer' },
      { username: 'product', password: 'product123', role: 'product' },
      { username: 'viewer', password: 'viewer123', role: 'viewer' }
    ];

    initialUsers.forEach(user => {
      const passwordHash = bcrypt.hashSync(user.password, 10);
      db.run(
        'INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [user.username, passwordHash, user.role]
      );
    });
  });
}

export function runQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export default db;
