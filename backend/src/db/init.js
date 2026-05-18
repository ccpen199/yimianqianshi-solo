const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../../data/app.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'consultant',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    parent_name TEXT,
    phone TEXT,
    grade TEXT,
    subject TEXT,
    source TEXT,
    demands TEXT,
    budget REAL,
    pain_points TEXT,
    status TEXT DEFAULT 'new',
    consultant_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultant_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    consultant_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    next_follow_up DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (consultant_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS trial_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    student_name TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    grade TEXT,
    teacher_id INTEGER NOT NULL,
    classroom_id INTEGER NOT NULL,
    trial_time DATETIME NOT NULL,
    duration INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled',
    cancel_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 20,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    student_name TEXT NOT NULL,
    phone TEXT,
    course_package_id INTEGER NOT NULL,
    total_hours REAL NOT NULL,
    used_hours REAL DEFAULT 0,
    gifted_hours REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    invoice_info TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (course_package_id) REFERENCES course_packages(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS course_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT,
    hours REAL NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT,
    teacher_id INTEGER NOT NULL,
    classroom_id INTEGER NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 20,
    current_students INTEGER DEFAULT 0,
    schedule TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS class_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    enrollment_id INTEGER NOT NULL,
    student_name TEXT NOT NULL,
    join_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    class_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (student_id) REFERENCES class_students(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS renewal_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER NOT NULL,
    student_name TEXT NOT NULL,
    remaining_hours REAL NOT NULL,
    alert_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
  )`);

  const hashedPassword = bcrypt.hashSync('admin123', 10);

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
  insertUser.run('admin', hashedPassword, '系统管理员', 'admin');
  insertUser.run('consultant1', hashedPassword, '张顾问', 'consultant');
  insertUser.run('teacher1', hashedPassword, '李老师', 'teacher');
  insertUser.finalize();

  const insertClassroom = db.prepare('INSERT OR IGNORE INTO classrooms (name, capacity, location) VALUES (?, ?, ?)');
  insertClassroom.run('教室A', 25, '一楼');
  insertClassroom.run('教室B', 30, '二楼');
  insertClassroom.finalize();

  const insertPackage = db.prepare('INSERT OR IGNORE INTO course_packages (name, subject, grade, hours, price) VALUES (?, ?, ?, ?, ?)');
  insertPackage.run('数学基础班', '数学', '初一', 40, 3200);
  insertPackage.run('英语提高班', '英语', '初二', 48, 4800);
  insertPackage.finalize();
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('Database initialized successfully!');
  }
});
