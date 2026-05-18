const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const enrollments = await new Promise((resolve, reject) => {
      db.all(`
        SELECT e.*, cp.name as package_name
        FROM enrollments e
        LEFT JOIN course_packages cp ON e.course_package_id = cp.id
        ORDER BY e.created_at DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({ success: true, data: enrollments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { lead_id, student_name, phone, course_package_id, gifted_hours, discount, paid_amount, invoice_info } = req.body;
    
    if (!student_name || !course_package_id) {
      return res.status(400).json({ success: false, message: '必填参数不完整' });
    }
    
    const package = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM course_packages WHERE id = ?`, [course_package_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!package) {
      return res.status(400).json({ success: false, message: '课程包不存在' });
    }
    
    const total_hours = package.hours + (gifted_hours || 0);
    const total_amount = package.price - (discount || 0);
    const status = (paid_amount || 0) >= total_amount ? 'paid' : 'partial';
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO enrollments (lead_id, student_name, phone, course_package_id, total_hours, gifted_hours, discount, total_amount, paid_amount, invoice_info, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [lead_id, student_name, phone, course_package_id, total_hours, gifted_hours || 0, discount || 0, total_amount, paid_amount || 0, invoice_info, status], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    res.json({ success: true, message: '报名成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
