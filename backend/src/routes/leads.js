const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { status, consultant_id } = req.query;
    let sql = `SELECT l.*, u.name as consultant_name FROM leads l LEFT JOIN users u ON l.consultant_id = u.id WHERE 1=1`;
    const params = [];
    
    if (status) {
      sql += ` AND l.status = ?`;
      params.push(status);
    }
    if (consultant_id) {
      sql += ` AND l.consultant_id = ?`;
      params.push(consultant_id);
    }
    sql += ` ORDER BY l.created_at DESC`;
    
    const leads = await new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lead = await new Promise((resolve, reject) => {
      db.get(`
        SELECT l.*, u.name as consultant_name 
        FROM leads l 
        LEFT JOIN users u ON l.consultant_id = u.id 
        WHERE l.id = ?
      `, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!lead) {
      return res.status(404).json({ success: false, message: '线索不存在' });
    }
    
    const followUps = await new Promise((resolve, reject) => {
      db.all(`
        SELECT f.*, u.name as consultant_name 
        FROM follow_ups f 
        LEFT JOIN users u ON f.consultant_id = u.id 
        WHERE f.lead_id = ?
        ORDER BY f.created_at DESC
      `, [req.params.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({ success: true, data: { ...lead, follow_ups: followUps } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { student_name, parent_name, phone, grade, subject, source, demands, budget, pain_points } = req.body;
    
    if (!student_name) {
      return res.status(400).json({ success: false, message: '学生姓名不能为空' });
    }
    
    const existing = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM leads WHERE phone = ? AND student_name = ?`, [phone, student_name], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: '该学生已存在，可能是重复线索' });
    }
    
    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO leads (student_name, parent_name, phone, grade, subject, source, demands, budget, pain_points, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
      `, [student_name, parent_name, phone, grade, subject, source, demands, budget, pain_points], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      });
    });
    
    res.json({ success: true, data: { id: result.lastID, message: '线索创建成功' }});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { student_name, parent_name, phone, grade, subject, source, demands, budget, pain_points, status } = req.body;
    
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE leads 
        SET student_name = ?, parent_name = ?, phone = ?, grade = ?, subject = ?, source = ?, demands = ?, budget = ?, pain_points = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [student_name, parent_name, phone, grade, subject, source, demands, budget, pain_points, status, req.params.id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({ success: true, message: '线索更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/assign', async (req, res) => {
  try {
    const { consultant_id } = req.body;
    
    if (!consultant_id) {
      return res.status(400).json({ success: false, message: '请选择顾问' });
    }
    
    const consultant = await new Promise((resolve, reject) => {
      db.get(`SELECT id, name FROM users WHERE id = ? AND role = 'consultant'`, [consultant_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!consultant) {
      return res.status(400).json({ success: false, message: '顾问不存在' });
    }
    
    await new Promise((resolve, reject) => {
      db.run(`UPDATE leads SET consultant_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [consultant_id, req.params.id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({ success: true, message: `已分配给顾问: ${consultant.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/followup', async (req, res) => {
  try {
    const { consultant_id, content, next_follow_up } = req.body;
    
    if (!consultant_id || !content) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO follow_ups (lead_id, consultant_id, content, next_follow_up)
        VALUES (?, ?, ?, ?)
      `, [req.params.id, consultant_id, content, next_follow_up], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`UPDATE leads SET status = 'following', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({ success: true, message: '跟进记录已添加' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/recycle', async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.run(`UPDATE leads SET consultant_id = NULL, status = 'new', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({ success: true, message: '线索已回收' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
