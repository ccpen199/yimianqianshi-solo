const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = './data/app.sqlite';
const db = new sqlite3.Database(dbPath);

const demoPath = path.resolve(__dirname, '../uploads/demo.wav');

db.run(`
  UPDATE audio_files 
  SET filename = 'demo.wav', file_path = ?
  WHERE id = (SELECT id FROM audio_files LIMIT 1)
`, [demoPath], function(err) {
  if (err) {
    console.error('更新失败:', err);
  } else {
    console.log(`更新了 ${this.changes} 条记录`);
    console.log(`演示音频路径: ${demoPath}`);
  }
  db.close();
});