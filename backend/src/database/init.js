const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../data/app.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('consultant', 'doctor', 'nurse', 'cashier', 'admin')),
    phone TEXT,
    department TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    gender TEXT CHECK(gender IN ('male', 'female', 'other')),
    age INTEGER,
    channel TEXT,
    consultant_id INTEGER REFERENCES users(id),
    consultation_items TEXT,
    budget REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id),
    channel TEXT NOT NULL,
    consultant_id INTEGER REFERENCES users(id),
    consultation_items TEXT,
    budget REAL,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'appointed', 'converted', 'lost')),
    source_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id),
    doctor_id INTEGER REFERENCES users(id),
    room_id INTEGER,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    type TEXT DEFAULT 'consultation' CHECK(type IN ('consultation', 'treatment', 'followup')),
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'late')),
    checkin_time DATETIME,
    cancel_reason TEXT,
    reschedule_reason TEXT,
    late_reason TEXT,
    no_show_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('consultation', 'treatment', 'surgery')),
    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS treatment_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id),
    doctor_id INTEGER REFERENCES users(id),
    appointment_id INTEGER REFERENCES appointments(id),
    items TEXT NOT NULL,
    contraindications TEXT,
    total_price REAL NOT NULL,
    discount REAL DEFAULT 0,
    final_price REAL NOT NULL,
    consent_confirmed INTEGER DEFAULT 0 CHECK(consent_confirmed IN (0, 1)),
    valid_until DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'expired', 'cancelled')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    plan_id INTEGER REFERENCES treatment_plans(id),
    consultant_id INTEGER REFERENCES users(id),
    items TEXT NOT NULL,
    total_amount REAL NOT NULL,
    discount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial_paid', 'paid', 'cancelled', 'refunded')),
    payment_method TEXT,
    payment_time DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS service_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    customer_id INTEGER REFERENCES customers(id),
    doctor_id INTEGER REFERENCES users(id),
    nurse_id INTEGER REFERENCES users(id),
    item TEXT NOT NULL,
    service_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS followup_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id),
    service_id INTEGER REFERENCES service_records(id),
    planned_date DATE NOT NULL,
    assigned_to INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'missed')),
    content TEXT,
    result TEXT,
    followup_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS todo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('followup', 'service', 'payment', 'other')),
    related_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )`);

  db.all("SELECT COUNT(*) as count FROM users", (err, rows) => {
    if (rows[0].count === 0) {
      const salt = bcrypt.genSaltSync(10);
      const users = [
        { username: 'admin', password: bcrypt.hashSync('admin123', salt), name: '系统管理员', role: 'admin', phone: '13800000000', department: '管理部' },
        { username: 'consultant1', password: bcrypt.hashSync('123456', salt), name: '李咨询师', role: 'consultant', phone: '13800000001', department: '咨询部' },
        { username: 'doctor1', password: bcrypt.hashSync('123456', salt), name: '张医生', role: 'doctor', phone: '13800000002', department: '医疗部' },
        { username: 'nurse1', password: bcrypt.hashSync('123456', salt), name: '王护士', role: 'nurse', phone: '13800000003', department: '护理部' },
        { username: 'cashier1', password: bcrypt.hashSync('123456', salt), name: '赵收银', role: 'cashier', phone: '13800000004', department: '财务部' }
      ];

      const stmt = db.prepare("INSERT INTO users (username, password, name, role, phone, department) VALUES (?, ?, ?, ?, ?, ?)");
      users.forEach(user => {
        stmt.run(user.username, user.password, user.name, user.role, user.phone, user.department);
      });
      stmt.finalize();
      console.log('Default users created');
    }
  });

  db.all("SELECT COUNT(*) as count FROM rooms", (err, rows) => {
    if (rows[0].count === 0) {
      const rooms = [
        { name: '咨询室1', type: 'consultation', status: 'available' },
        { name: '咨询室2', type: 'consultation', status: 'available' },
        { name: '治疗室1', type: 'treatment', status: 'available' },
        { name: '治疗室2', type: 'treatment', status: 'available' },
        { name: '手术室1', type: 'surgery', status: 'available' }
      ];

      const stmt = db.prepare("INSERT INTO rooms (name, type, status) VALUES (?, ?, ?)");
      rooms.forEach(room => {
        stmt.run(room.name, room.type, room.status);
      });
      stmt.finalize();
      console.log('Default rooms created');
    }
  });
});

module.exports = db;
