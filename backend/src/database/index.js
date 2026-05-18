const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function getDb() {
  if (!db) {
    const dbPath = path.join(__dirname, '../../data/app.sqlite');
    db = new sqlite3.Database(dbPath);
  }
  return db;
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
      });
    }
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = { getDb, query, getOne };
