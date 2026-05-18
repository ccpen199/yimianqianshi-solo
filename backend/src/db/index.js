const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../../data/app.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  }
});

const promisify = (fn) => (...args) => {
  return new Promise((resolve, reject) => {
    fn.call(db, ...args, function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

db.runAsync = promisify(db.run);
db.getAsync = promisify(db.get);
db.allAsync = promisify(db.all);

module.exports = db;
