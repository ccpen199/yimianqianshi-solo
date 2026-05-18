const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

function getDb() {
  if (!db) {
    const dbPath = path.join(__dirname, '../../data/app.sqlite');
    const dataDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      }
    });
    
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Database query error:', err.message);
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database query error:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  getDb,
  closeDb,
  runQuery,
  getOne,
  getAll
};
