const express = require('express');
const db = require('../database/init');
const { maskCustomerData, requireRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { status, channel, consultant_id } = req.query;
    let query = `
      SELECT l.*, c.name as customer_name, c.phone as customer_phone, 
             u.name as consultant_name
      FROM leads l
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN users u ON l.consultant_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (channel) {
      query += ' AND l.channel = ?';
      params.push(channel);
    }
    if (consultant_id) {
      query += ' AND l.consultant_id = ?';
      params.push(consultant_id);
    }

    query += ' ORDER BY l.created_at DESC';

    db.all(query, params, (err, leads) => {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库错误' });
      }

      const maskedLeads = leads.map(lead => {
        const masked = { ...lead };
        if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
          masked.customer_phone = masked.customer_phone?.substring(0, 3) + '****' + masked.customer_phone?.substring(masked.customer_phone?.length - 4);
        }
        return masked;
      });

      res.json({ success: true, data: maskedLeads });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', requireRoles(['consultant', 'admin']), (req, res) => {
  try {
    const { customer_name, customer_phone, customer_gender, customer_age, channel, consultant_id, consultation_items, budget, source_notes } = req.body;

    if (!customer_name || !customer_phone || !channel) {
      return res.status(400).json({ success: false, message: '客户姓名、手机号和渠道不能为空' });
    }

    db.get("SELECT id FROM customers WHERE phone = ?", [customer_phone], (err, existingCustomer) => {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库错误' });
      }

      const createLead = (customerId) => {
        const stmt = db.prepare(`
          INSERT INTO leads (customer_id, channel, consultant_id, consultation_items, budget, source_notes, status)
          VALUES (?, ?, ?, ?, ?, ?, 'new')
        `);
        
        stmt.run(customerId, channel, consultant_id || req.user.id, consultation_items, budget, source_notes, function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: '创建线索失败' });
          }

          res.json({ 
            success: true, 
            data: { id: this.lastID, customer_id: customerId },
            message: '线索创建成功' 
          });
        });
        stmt.finalize();
      };

      if (existingCustomer) {
        createLead(existingCustomer.id);
      } else {
        const customerStmt = db.prepare(`
          INSERT INTO customers (name, phone, gender, age, channel, consultant_id, consultation_items, budget)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        customerStmt.run(customer_name, customer_phone, customer_gender, customer_age, channel, consultant_id || req.user.id, consultation_items, budget, function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: '创建客户失败' });
          }
          createLead(this.lastID);
        });
        customerStmt.finalize();
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', requireRoles(['consultant', 'admin']), (req, res) => {
  try {
    const { id } = req.params;
    const { status, consultation_items, budget } = req.body;

    db.run(`
      UPDATE leads 
      SET status = ?, consultation_items = ?, budget = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, consultation_items, budget, id], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '更新线索失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: '线索不存在' });
      }

      res.json({ success: true, message: '线索更新成功' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
