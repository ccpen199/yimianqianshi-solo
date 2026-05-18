const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const dbPath = path.join(__dirname, '../../data/app.sqlite');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function runSql(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function initDatabase() {
  try {
    await runSql('PRAGMA foreign_keys = OFF');

    await runSql(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        address TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        contract_no TEXT UNIQUE,
        subscription_version TEXT,
        seats_count INTEGER DEFAULT 0,
        seats_used INTEGER DEFAULT 0,
        arr_amount REAL DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'active',
        csm_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS health_scores (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        contract_id TEXT,
        overall_score INTEGER DEFAULT 0,
        usage_score INTEGER DEFAULT 0,
        satisfaction_score INTEGER DEFAULT 0,
        engagement_score INTEGER DEFAULT 0,
        payment_score INTEGER DEFAULT 0,
        risk_level TEXT DEFAULT 'low',
        calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
      )
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS usage_metrics (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        contract_id TEXT,
        active_users INTEGER DEFAULT 0,
        login_count_30d INTEGER DEFAULT 0,
        feature_adoption_rate REAL DEFAULT 0,
        last_activity_date TEXT,
        recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
      )
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        contract_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'open',
        satisfaction_score INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
      )
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS renewal_records (
        id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        previous_end_date TEXT,
        new_end_date TEXT,
        renewal_amount REAL DEFAULT 0,
        discount_rate REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        renewal_type TEXT,
        churn_reason TEXT,
        notes TEXT,
        csm_id TEXT,
        finance_verified BOOLEAN DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS risk_alerts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        contract_id TEXT,
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        assigned_to TEXT,
        resolved_at TEXT,
        resolution_notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
      )
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS renewal_tasks (
        id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        csm_id TEXT,
        task_type TEXT,
        due_date TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        touch_content TEXT,
        next_commitment TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS follow_up_records (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        contract_id TEXT,
        renewal_task_id TEXT,
        contact_type TEXT,
        content TEXT NOT NULL,
        outcome TEXT,
        next_step TEXT,
        follow_up_date TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
        FOREIGN KEY (renewal_task_id) REFERENCES renewal_tasks(id) ON DELETE SET NULL
      )
    `);

    await runSql(`
      CREATE TABLE IF NOT EXISTS csm_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully!');
    db.close();
  } catch (error) {
    console.error('Error initializing database:', error);
    db.close();
    process.exit(1);
  }
}

initDatabase();
