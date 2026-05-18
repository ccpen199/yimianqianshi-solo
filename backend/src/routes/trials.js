const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const bookings = await new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, u.name as teacher_name, c.name as classroom_name
        FROM trial_bookings t
        LEFT JOIN users u ON t.teacher_id = u.id
        LEFT JOIN classrooms c ON t.classroom_id = c.id
        ORDER BY t.trial_time DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { lead_id, student_name, phone, subject, grade, teacher_id, classroom_id, trial_time, duration } = req.body;
    
    if (!student_name || !subject || !teacher_id || !classroom_id || !trial_time) {
      return res.status(400).json({ success: false, message: '必填参数不完整' });
    }
    
    const teacherConflict = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id FROM trial_bookings 
        WHERE teacher_id = ? AND trial_time = ? AND status = 'scheduled'
      `, [teacher_id, trial_time], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (teacherConflict) {
      return res.status(400).json({ success: false, message: '该老师此时间段已有试听安排' });
    }
    
    const classroomConflict = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id FROM trial_bookings 
        WHERE classroom_id = ? AND trial_time = ? AND status = 'scheduled'
      `, [classroom_id, trial_time], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (classroomConflict) {
      return res.status(400).json({ success: false, message: '该教室此时间段已有试听安排' });
    }
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO trial_bookings (lead_id, student_name, phone, subject, grade, teacher_id, classroom_id, trial_time, duration, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
      `, [lead_id, student_name, phone, subject, grade, teacher_id, classroom_id, trial_time, duration || 60], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({ success: true, message: '试听预约成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const { cancel_reason } = req.body;
    if (!cancel_reason) {
      return res.status(400).json({ success: false, message: '请填写取消原因' });
    }
    
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE trial_bookings SET status = 'cancelled', cancel_reason = ? WHERE id = ?
      `, [cancel_reason, req.params.id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({ success: true, message: '试听已取消，名额已释放' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
