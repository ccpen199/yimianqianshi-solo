const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const classes = await new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, u.name as teacher_name, cr.name as classroom_name
        FROM classes c
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN classrooms cr ON c.classroom_id = cr.id
        ORDER BY c.created_at DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/students', async (req, res) => {
  try {
    const students = await new Promise((resolve, reject) => {
      db.all(`
        SELECT cs.*, e.total_hours, e.used_hours
        FROM class_students cs
        LEFT JOIN enrollments e ON cs.enrollment_id = e.id
        WHERE cs.class_id = ?
        ORDER BY cs.join_date DESC
      `, [req.params.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, subject, grade, teacher_id, classroom_id, capacity, schedule, start_date, end_date } = req.body;
    
    if (!name || !subject || !teacher_id || !classroom_id) {
      return res.status(400).json({ success: false, message: '必填参数不完整' });
    }
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO classes (name, subject, grade, teacher_id, classroom_id, capacity, schedule, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `, [name, subject, grade, teacher_id, classroom_id, capacity || 20, schedule, start_date, end_date], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({ success: true, message: '班级创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/students', async (req, res) => {
  try {
    const { enrollment_id, student_name } = req.body;
    
    if (!enrollment_id || !student_name) {
      return res.status(400).json({ success: false, message: '必填参数不完整' });
    }
    
    const classInfo = await new Promise((resolve, reject) => {
      db.get(`SELECT capacity, current_students FROM classes WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!classInfo) {
      return res.status(404).json({ success: false, message: '班级不存在' });
    }
    
    if (classInfo.current_students >= classInfo.capacity) {
      return res.status(400).json({ success: false, message: '班级已满员' });
    }
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO class_students (class_id, enrollment_id, student_name, status)
        VALUES (?, ?, ?, 'active')
      `, [req.params.id, enrollment_id, student_name], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`UPDATE classes SET current_students = current_students + 1 WHERE id = ?`, [req.params.id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({ success: true, message: '学生分班成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
