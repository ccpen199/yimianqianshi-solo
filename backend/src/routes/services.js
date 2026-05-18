const express = require('express');
const db = require('../database/init');
const { requireRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { order_id, status } = req.query;
    let query = `
      SELECT s.*, c.name as customer_name, c.phone as customer_phone,
             u.name as doctor_name, n.name as nurse_name, o.order_no
      FROM service_records s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.doctor_id = u.id
      LEFT JOIN users n ON s.nurse_id = n.id
      LEFT JOIN orders o ON s.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (order_id) {
      query += ' AND s.order_id = ?';
      params.push(order_id);
    }
    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.service_date DESC';

    db.all(query, params, (err, services) => {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库错误' });
      }

      const maskedServices = services.map(service => {
        const masked = { ...service };
        if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
          masked.customer_phone = masked.customer_phone?.substring(0, 3) + '****' + masked.customer_phone?.substring(masked.customer_phone?.length - 4);
        }
        return masked;
      });

      res.json({ success: true, data: maskedServices });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', requireRoles(['doctor', 'nurse', 'admin']), (req, res) => {
  try {
    const { order_id, customer_id, item, service_date, start_time, end_time, notes } = req.body;

    if (!order_id || !customer_id || !item || !service_date) {
      return res.status(400).json({ success: false, message: '必填参数不能为空' });
    }

    const stmt = db.prepare(`
      INSERT INTO service_records (order_id, customer_id, doctor_id, nurse_id, item, service_date, start_time, end_time, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);
    
    stmt.run(order_id, customer_id, req.user.role === 'doctor' ? req.user.id : null, req.user.role === 'nurse' ? req.user.id : null, item, service_date, start_time, end_time, notes, function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '创建服务记录失败' });
      }

      res.json({ 
        success: true, 
        data: { id: this.lastID },
        message: '服务记录创建成功' 
      });
    });
    stmt.finalize();
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/status', requireRoles(['doctor', 'nurse', 'admin']), (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: '状态不能为空' });
    }

    db.run(`
      UPDATE service_records 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, id], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '更新服务记录失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: '服务记录不存在' });
      }

      res.json({ success: true, message: '服务状态更新成功' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
