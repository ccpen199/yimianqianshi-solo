const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function getDb() {
  if (!db) {
    const dbPath = path.join(__dirname, '../../data/app.sqlite');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.run(sql, params, function(err) {
      if (err) {
        console.error('Database error:', err);
        reject({ success: false, error: err.message });
      } else {
        resolve({ success: true, data: { lastID: this.lastID, changes: this.changes } });
      }
    });
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.get(sql, params, (err, row) => {
      if (err) {
        console.error('Database error:', err);
        reject({ success: false, error: err.message });
      } else {
        resolve({ success: true, data: row });
      }
    });
  });
}

function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        reject({ success: false, error: err.message });
      } else {
        resolve({ success: true, data: rows });
      }
    });
  });
}

module.exports = { getDb, runQuery, getOne, getAll };
