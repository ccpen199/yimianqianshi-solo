const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/app.sqlite');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function initDB() {
  try {
    await runAsync(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      store_id INTEGER,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      manager_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      budget_min INTEGER,
      budget_max INTEGER,
      areas TEXT,
      house_types TEXT,
      school_district TEXT,
      loan_ability INTEGER,
      purchase_stage TEXT,
      privacy_authorized INTEGER DEFAULT 0,
      agent_id INTEGER,
      store_id INTEGER,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(phone)
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_name TEXT NOT NULL,
      owner_phone TEXT NOT NULL,
      address TEXT NOT NULL,
      price INTEGER NOT NULL,
      area REAL,
      house_type TEXT,
      floor TEXT,
      orientation TEXT,
      has_key INTEGER DEFAULT 0,
      viewing_restrictions TEXT,
      status TEXT DEFAULT 'available',
      is_sensitive INTEGER DEFAULT 0,
      store_id INTEGER,
      agent_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS property_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      photo_url TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS viewings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      property_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      viewing_time DATETIME NOT NULL,
      status TEXT DEFAULT 'scheduled',
      customer_feedback TEXT,
      agent_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS negotiations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      property_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      initial_offer INTEGER,
      counter_offer INTEGER,
      final_price INTEGER,
      owner_feedback TEXT,
      loan_progress TEXT,
      contract_nodes TEXT,
      status TEXT DEFAULT 'negotiating',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negotiation_id INTEGER,
      customer_id INTEGER NOT NULL,
      property_id INTEGER NOT NULL,
      contract_no TEXT UNIQUE,
      total_price INTEGER NOT NULL,
      sign_date DATETIME,
      commission_amount INTEGER,
      status TEXT DEFAULT 'signed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      percentage REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      old_price INTEGER,
      new_price INTEGER NOT NULL,
      changed_by INTEGER,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS customer_conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      existing_agent_id INTEGER,
      new_agent_id INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('123456', 10);

    const userCount = await getAsync('SELECT COUNT(*) as count FROM users WHERE username = ?', ['admin']);
    if (!userCount || userCount.count === 0) {
      await runAsync('INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)', 
        ['admin', hashedPassword, '系统管理员', 'admin', '13800138000']);
      await runAsync('INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)', 
        ['manager1', hashedPassword, '张店长', 'manager', '13800138001']);
      await runAsync('INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)', 
        ['agent1', hashedPassword, '李经纪人', 'agent', '13800138002']);
      await runAsync('INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)', 
        ['agent2', hashedPassword, '王经纪人', 'agent', '13800138003']);
      await runAsync('INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)', 
        ['field1', hashedPassword, '赵案场', 'field', '13800138004']);
      await runAsync('INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)', 
        ['finance1', hashedPassword, '钱财务', 'finance', '13800138005']);
    }

    const storeCount = await getAsync('SELECT COUNT(*) as count FROM stores');
    if (!storeCount || storeCount.count === 0) {
      await runAsync('INSERT INTO stores (name, address, manager_id) VALUES (?, ?, ?)', 
        ['朝阳门店', '北京市朝阳区朝阳门大街1号', 2]);
    }

    console.log('数据库初始化完成');
    db.close();
  } catch (error) {
    console.error('数据库初始化错误:', error);
    db.close();
  }
}

initDB();
