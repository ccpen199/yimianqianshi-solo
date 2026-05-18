const express = require('express');
const db = require('../database/init');
const { requireRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { assigned_to, status } = req.query;
    let query = `
      SELECT f.*, c.name as customer_name, c.phone as customer_phone,
             u.name as assigned_name
      FROM followup_plans f
      LEFT JOIN customers c ON f.customer_id = c.id
      LEFT JOIN users u ON f.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];

    if (assigned_to) {
      query += ' AND f.assigned_to = ?';
      params.push(assigned_to);
    }
    if (status) {
      query += ' AND f.status = ?';
      params.push(status);
    }

    query += ' ORDER BY f.planned_date ASC';

    db.all(query, params, (err, followups) => {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库错误' });
      }

      const maskedFollowups = followups.map(followup => {
        const masked = { ...followup };
        if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
          masked.customer_phone = masked.customer_phone?.substring(0, 3) + '****' + masked.customer_phone?.substring(masked.customer_phone?.length - 4);
        }
        return masked;
      });

      res.json({ success: true, data: maskedFollowups });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', requireRoles(['doctor', 'nurse', 'consultant', 'admin']), (req, res) => {
  try {
    const { customer_id, service_id, planned_date, content } = req.body;

    if (!customer_id || !planned_date) {
      return res.status(400).json({ success: false, message: '必填参数不能为空' });
    }

    const stmt = db.prepare(`
      INSERT INTO followup_plans (customer_id, service_id, planned_date, assigned_to, status, content)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);
    
    stmt.run(customer_id, service_id, planned_date, req.user.id, content, function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '创建复诊计划失败' });
      }

      db.prepare(`
        INSERT INTO todo_items (user_id, type, related_id, title, description, priority, due_date, status)
        VALUES (?, 'followup', ?, ?, ?, 'medium', ?, 'pending')
      `).run(req.user.id, this.lastID, '客户复诊提醒', content || '请按时完成客户复诊', planned_date);

      res.json({ 
        success: true, 
        data: { id: this.lastID },
        message: '复诊计划创建成功' 
      });
    });
    stmt.finalize();
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/complete', requireRoles(['doctor', 'nurse', 'consultant', 'admin']), (req, res) => {
  try {
    const { id } = req.params;
    const { result } = req.body;

    db.run(`
      UPDATE followup_plans 
      SET status = 'completed', result = ?, followup_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [result, id], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '更新复诊计划失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: '复诊计划不存在' });
      }

      res.json({ success: true, message: '复诊完成' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
