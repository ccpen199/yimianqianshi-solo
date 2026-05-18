const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../../data/app.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  const stmt = db.prepare(`INSERT INTO leads (student_name, parent_name, phone, grade, subject, source, demands, budget, pain_points, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  stmt.run('张三', '张爸爸', '13800138001', '初一', '数学', '转介绍', '希望提升基础', 5000, '计算粗心', 'new');
  stmt.run('李四', '李妈妈', '13800138002', '初二', '英语', '地推', '语法薄弱', 6000, '阅读理解差', 'following');
  stmt.run('王五', '王爸爸', '13800138003', '初三', '物理', '线上广告', '冲刺中考', 8000, '公式记忆困难', 'new');
  
  stmt.finalize((err) => {
    if (err) {
      console.error('Error inserting test data:', err);
    } else {
      console.log('✅ 测试数据已添加！');
    }
    db.close();
  });
});
