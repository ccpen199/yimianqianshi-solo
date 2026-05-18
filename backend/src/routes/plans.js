const express = require('express');
const db = require('../database/init');
const { requireRoles } = require('../middleware/auth');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { customer_id, status } = req.query;
    let query = `
      SELECT p.*, c.name as customer_name, c.phone as customer_phone,
             u.name as doctor_name
      FROM treatment_plans p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN users u ON p.doctor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (customer_id) {
      query += ' AND p.customer_id = ?';
      params.push(customer_id);
    }
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    db.all(query, params, (err, plans) => {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库错误' });
      }

      const now = dayjs().format('YYYY-MM-DD');
      const updatedPlans = plans.map(plan => {
        if (plan.status === 'pending' && dayjs(plan.valid_until).isBefore(now)) {
          db.run("UPDATE treatment_plans SET status = 'expired' WHERE id = ?", [plan.id]);
          return { ...plan, status: 'expired' };
        }
        return plan;
      });

      const maskedPlans = updatedPlans.map(plan => {
        const masked = { ...plan };
        if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
          masked.customer_phone = masked.customer_phone?.substring(0, 3) + '****' + masked.customer_phone?.substring(masked.customer_phone?.length - 4);
        }
        return masked;
      });

      res.json({ success: true, data: maskedPlans });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', requireRoles(['doctor', 'admin']), (req, res) => {
  try {
    const { customer_id, appointment_id, items, contraindications, total_price, discount, final_price, consent_confirmed, valid_until, notes } = req.body;

    if (!customer_id || !items || !total_price || !valid_until) {
      return res.status(400).json({ success: false, message: '必填参数不能为空' });
    }

    const stmt = db.prepare(`
      INSERT INTO treatment_plans (customer_id, doctor_id, appointment_id, items, contraindications, total_price, discount, final_price, consent_confirmed, valid_until, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);
    
    stmt.run(customer_id, req.user.id, appointment_id, items, contraindications, total_price, discount || 0, final_price, consent_confirmed ? 1 : 0, valid_until, notes, function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '创建方案失败' });
      }

      res.json({ 
        success: true, 
        data: { id: this.lastID },
        message: '治疗方案创建成功' 
      });
    });
    stmt.finalize();
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/status', requireRoles(['doctor', 'admin']), (req, res) => {
  try {
    const { id } = req.params;
    const { status, consent_confirmed } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: '状态不能为空' });
    }

    db.run(`
      UPDATE treatment_plans 
      SET status = ?, consent_confirmed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, consent_confirmed ? 1 : 0, id], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '更新方案失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: '方案不存在' });
      }

      res.json({ success: true, message: '方案状态更新成功' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
