const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/app.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'operator', 'annotator', 'reviewer', 'data_owner')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tag_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_id INTEGER NOT NULL,
      parent_id INTEGER,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT,
      example TEXT,
      color TEXT,
      rule_type TEXT DEFAULT 'multiple' CHECK(rule_type IN ('single', 'multiple')),
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (version_id) REFERENCES tag_versions(id),
      FOREIGN KEY (parent_id) REFERENCES tags(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS text_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT UNIQUE NOT NULL,
      source TEXT,
      language TEXT DEFAULT 'zh-CN',
      total_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'processing' CHECK(status IN ('processing', 'completed', 'failed')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS text_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER,
      content TEXT NOT NULL,
      source TEXT,
      language TEXT DEFAULT 'zh-CN',
      has_sensitive_word INTEGER DEFAULT 0,
      clean_status TEXT DEFAULT 'raw' CHECK(clean_status IN ('raw', 'cleaned', 'abnormal')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'annotating', 'annotated', 'reviewing', 'reviewed', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES text_batches(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      version_id INTEGER NOT NULL,
      annotator_id INTEGER NOT NULL,
      tags TEXT NOT NULL,
      is_draft INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sample_id) REFERENCES text_samples(id),
      FOREIGN KEY (version_id) REFERENCES tag_versions(id),
      FOREIGN KEY (annotator_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      annotation_id INTEGER,
      tags TEXT,
      status TEXT NOT NULL CHECK(status IN ('approved', 'rejected', 'conflict')),
      reject_reason TEXT,
      agreement_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sample_id) REFERENCES text_samples(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (annotation_id) REFERENCES annotations(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS export_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_name TEXT NOT NULL,
      version_id INTEGER NOT NULL,
      sample_ids TEXT,
      status TEXT DEFAULT 'processing' CHECK(status IN ('processing', 'completed', 'failed')),
      file_path TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (version_id) REFERENCES tag_versions(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row.count === 0) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT INTO users (username, password, role) VALUES 
          ('admin', ?, 'admin'),
          ('operator', ?, 'operator'),
          ('annotator1', ?, 'annotator'),
          ('reviewer1', ?, 'reviewer'),
          ('dataowner', ?, 'data_owner')`, 
          [hashedPassword, hashedPassword, hashedPassword, hashedPassword, hashedPassword]);
      }
    });
  });
}

module.exports = db;
