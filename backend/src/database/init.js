require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/app.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const initSql = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'supervisor', 'agent', 'quality', 'ticket')),
    skill_group TEXT,
    status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'busy', 'away', 'offline')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS queues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    skill_required TEXT,
    priority INTEGER DEFAULT 5,
    wait_warning_threshold INTEGER DEFAULT 120,
    overflow_queue_id INTEGER,
    no_answer_queue_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT UNIQUE NOT NULL,
    caller_number TEXT NOT NULL,
    called_number TEXT,
    customer_id INTEGER,
    queue_id INTEGER,
    agent_id INTEGER,
    status TEXT NOT NULL CHECK(status IN ('waiting', 'ringing', 'connected', 'held', 'transferred', 'ended', 'missed', 'abandoned')),
    direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
    priority INTEGER DEFAULT 5,
    wait_start_time DATETIME,
    ring_start_time DATETIME,
    connect_time DATETIME,
    end_time DATETIME,
    hold_duration INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    recording_url TEXT,
    recording_status TEXT DEFAULT 'none' CHECK(recording_status IN ('none', 'recording', 'completed', 'failed', 'missing')),
    transfer_from_id INTEGER,
    transfer_to_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS call_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('enter_queue', 'assign', 'ring', 'connect', 'hold', 'unhold', 'transfer', 'hangup', 'miss', 'abandon')),
    agent_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    company TEXT,
    level TEXT DEFAULT 'normal' CHECK(level IN ('vip', 'normal', 'blocked')),
    tags TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_no TEXT UNIQUE NOT NULL,
    call_id TEXT,
    customer_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('complaint', 'consult', 'aftersale', 'suggestion', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('urgent', 'high', 'normal', 'low')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'resolved', 'closed', 'escalated')),
    creator_id INTEGER NOT NULL,
    assignee_id INTEGER,
    assignee_group TEXT,
    due_date DATETIME,
    follow_up_required INTEGER DEFAULT 0,
    follow_up_date DATETIME,
    follow_up_status TEXT CHECK(follow_up_status IN ('pending', 'completed', 'failed', 'timeout')),
    follow_up_result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ticket_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_internal INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ticket_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quality_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT NOT NULL,
    reviewer_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'appealed', 'finalized')),
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quality_criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    max_score INTEGER DEFAULT 10,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quality_review_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    criteria_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    comments TEXT
  );

  CREATE TABLE IF NOT EXISTS corrective_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    assignee_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'verified')),
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS service_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT UNIQUE NOT NULL,
    agent_id INTEGER NOT NULL,
    summary TEXT,
    disposition TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

db.serialize(() => {
  const statements = initSql.split(';').filter(s => s.trim());
  statements.forEach(sql => {
    db.run(sql, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      }
    });
  });

  const bcrypt = require('bcryptjs');

  const initUsers = [
    { username: 'admin', name: '系统管理员', role: 'admin', password: 'admin123' },
    { username: 'supervisor1', name: '张主管', role: 'supervisor', password: '123456' },
    { username: 'agent1', name: '李坐席', role: 'agent', skill_group: 'general', password: '123456' },
    { username: 'agent2', name: '王坐席', role: 'agent', skill_group: 'tech', password: '123456' },
    { username: 'quality1', name: '赵质检', role: 'quality', password: '123456' },
    { username: 'ticket1', name: '工单处理员', role: 'ticket', password: '123456' },
  ];

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, name, role, skill_group) VALUES (?, ?, ?, ?, ?)');
  
  initUsers.forEach(user => {
    const hash = bcrypt.hashSync(user.password, 10);
    insertUser.run(user.username, hash, user.name, user.role, user.skill_group || null);
  });

  const insertQueue = db.prepare('INSERT OR IGNORE INTO queues (name, description, skill_required, priority) VALUES (?, ?, ?, ?)');
  insertQueue.run('普通咨询', '普通客户咨询队列', 'general', 5);
  insertQueue.run('技术支持', '技术问题处理队列', 'tech', 6);
  insertQueue.run('VIP专线', 'VIP客户专属队列', null, 10);
  insertQueue.run('投诉处理', '客户投诉处理队列', null, 8);

  const insertCriteria = db.prepare('INSERT OR IGNORE INTO quality_criteria (name, description, max_score, category) VALUES (?, ?, ?, ?)');
  insertCriteria.run('服务态度', '语音语调、礼貌用语', 20, 'service');
  insertCriteria.run('专业知识', '业务熟练度、解答准确性', 30, 'professional');
  insertCriteria.run('沟通技巧', '倾听、表达、引导能力', 25, 'communication');
  insertCriteria.run('流程规范', '系统操作、流程遵循', 25, 'process');

  const insertCustomer = db.prepare('INSERT OR IGNORE INTO customers (phone_number, name, email, company, level) VALUES (?, ?, ?, ?, ?)');
  insertCustomer.run('13800138000', '张三', 'zhangsan@example.com', 'ABC公司', 'vip');
  insertCustomer.run('13900139000', '李四', 'lisi@example.com', 'XYZ公司', 'normal');
  insertCustomer.run('13700137000', '王五', null, null, 'normal');

  console.log('数据库初始化完成！');
  console.log('默认账号：');
  initUsers.forEach(u => {
    console.log(`  ${u.role}: ${u.username} / ${u.password}`);
  });

  db.close();
});
