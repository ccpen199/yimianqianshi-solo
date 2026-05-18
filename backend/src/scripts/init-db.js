const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../data/app.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL CHECK(role IN ('project_manager', 'annotator', 'quality_inspector', 'delivery_manager')),
      daily_capacity INTEGER DEFAULT 50,
      skills TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      data_type TEXT NOT NULL CHECK(data_type IN ('image', 'text', 'audio', 'video')),
      label_spec TEXT NOT NULL,
      acceptance_ratio REAL DEFAULT 0.1,
      delivery_date DATETIME NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'quality_check', 'delivered', 'completed')),
      created_by INTEGER NOT NULL,
      annotator_pool TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS datasets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'disputed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      difficulty INTEGER DEFAULT 1 CHECK(difficulty IN (1, 2, 3, 4, 5)),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'annotating', 'submitted', 'quality_checking', 'rework', 'approved', 'disputed')),
      current_annotator_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dataset_id) REFERENCES datasets(id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (current_annotator_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      annotator_id INTEGER NOT NULL,
      sample_count INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'submitted', 'paused', 'returned', 'completed')),
      assigned_at DATETIME,
      started_at DATETIME,
      submitted_at DATETIME,
      deadline DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (annotator_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_package_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_package_id INTEGER NOT NULL,
      sample_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (task_package_id) REFERENCES task_packages(id),
      FOREIGN KEY (sample_id) REFERENCES samples(id),
      UNIQUE(task_package_id, sample_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      task_package_id INTEGER NOT NULL,
      annotator_id INTEGER NOT NULL,
      label_data TEXT NOT NULL,
      remark TEXT,
      is_draft INTEGER DEFAULT 1,
      version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'rework', 'approved')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sample_id) REFERENCES samples(id),
      FOREIGN KEY (task_package_id) REFERENCES task_packages(id),
      FOREIGN KEY (annotator_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quality_inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      annotation_id INTEGER NOT NULL,
      inspector_id INTEGER NOT NULL,
      inspection_type TEXT NOT NULL CHECK(inspection_type IN ('sampling', 'full', 'rule_based')),
      result TEXT CHECK(result IN ('passed', 'failed', 'pending')),
      comment TEXT,
      is_rework INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sample_id) REFERENCES samples(id),
      FOREIGN KEY (annotation_id) REFERENCES annotations(id),
      FOREIGN KEY (inspector_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sample_id INTEGER NOT NULL,
      reporter_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('sample_abnormal', 'label_confusion', 'other')),
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'resolved', 'rejected')),
      resolution TEXT,
      resolved_by INTEGER,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sample_id) REFERENCES samples(id),
      FOREIGN KEY (reporter_id) REFERENCES users(id),
      FOREIGN KEY (resolved_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS delivery_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      delivery_manager_id INTEGER NOT NULL,
      sample_count INTEGER NOT NULL,
      passed_count INTEGER NOT NULL DEFAULT 0,
      disputed_count INTEGER NOT NULL DEFAULT 0,
      rework_count INTEGER NOT NULL DEFAULT 0,
      duplicate_count INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'delivered', 'rejected')),
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (delivery_manager_id) REFERENCES users(id)
    )
  `);

  const defaultPassword = bcrypt.hashSync('123456', 10);
  
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, name, email, role, daily_capacity, skills)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('pm1', defaultPassword, '张经理', 'pm1@example.com', 'project_manager', 100, 'all');
  insertUser.run('annotator1', defaultPassword, '李标注', 'annotator1@example.com', 'annotator', 50, 'image,text');
  insertUser.run('annotator2', defaultPassword, '王标注', 'annotator2@example.com', 'annotator', 60, 'audio,video');
  insertUser.run('qi1', defaultPassword, '赵质检', 'qi1@example.com', 'quality_inspector', 80, 'all');
  insertUser.run('dm1', defaultPassword, '钱交付', 'dm1@example.com', 'delivery_manager', 100, 'all');

  insertUser.finalize();

  console.log('Database initialized successfully!');
  console.log('Default users created:');
  console.log('  - Project Manager: pm1 / 123456');
  console.log('  - Annotator: annotator1 / 123456');
  console.log('  - Annotator: annotator2 / 123456');
  console.log('  - Quality Inspector: qi1 / 123456');
  console.log('  - Delivery Manager: dm1 / 123456');
});

db.close();
