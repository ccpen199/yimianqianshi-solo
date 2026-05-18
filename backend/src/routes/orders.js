const express = require('express');
const db = require('../database/init');
const { requireRoles } = require('../middleware/auth');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { customer_id, status } = req.query;
    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
             u.name as consultant_name, p.status as plan_status
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.consultant_id = u.id
      LEFT JOIN treatment_plans p ON o.plan_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (customer_id) {
      query += ' AND o.customer_id = ?';
      params.push(customer_id);
    }
    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    db.all(query, params, (err, orders) => {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库错误' });
      }

      const maskedOrders = orders.map(order => {
        const masked = { ...order };
        if (req.user.role !== 'admin' && req.user.role !== 'cashier') {
          masked.customer_phone = masked.customer_phone?.substring(0, 3) + '****' + masked.customer_phone?.substring(masked.customer_phone?.length - 4);
        }
        return masked;
      });

      res.json({ success: true, data: maskedOrders });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', requireRoles(['consultant', 'admin']), (req, res) => {
  try {
    const { customer_id, plan_id, items, total_amount, discount, notes } = req.body;

    if (!customer_id || !items || !total_amount) {
      return res.status(400).json({ success: false, message: '必填参数不能为空' });
    }

    if (plan_id) {
      db.get("SELECT status FROM treatment_plans WHERE id = ?", [plan_id], (err, plan) => {
        if (err || !plan) {
          return res.status(400).json({ success: false, message: '方案不存在' });
        }
        if (plan.status !== 'approved') {
          return res.status(400).json({ success: false, message: '方案未审批，不能创建订单' });
        }
        createOrder();
      });
    } else {
      return res.status(400).json({ success: false, message: '必须关联治疗方案' });
    }

    const createOrder = () => {
      const orderNo = 'ORD' + Date.now();
      const stmt = db.prepare(`
        INSERT INTO orders (order_no, customer_id, plan_id, consultant_id, items, total_amount, discount, paid_amount, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?)
      `);
      
      stmt.run(orderNo, customer_id, plan_id, req.user.id, items, total_amount, discount || 0, notes, function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '创建订单失败' });
        }

        res.json({ 
          success: true, 
          data: { id: this.lastID, order_no: orderNo },
          message: '订单创建成功' 
        });
      });
      stmt.finalize();
    };
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id/pay', requireRoles(['cashier', 'admin']), (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method } = req.body;

    if (!amount || !payment_method) {
      return res.status(400).json({ success: false, message: '金额和支付方式不能为空' });
    }

    db.get("SELECT total_amount, discount, paid_amount, status FROM orders WHERE id = ?", [id], (err, order) => {
      if (err || !order) {
        return res.status(404).json({ success: false, message: '订单不存在' });
      }

      if (order.status === 'paid') {
        return res.status(400).json({ success: false, message: '订单已支付' });
      }

      const newPaidAmount = order.paid_amount + parseFloat(amount);
      const finalTotal = order.total_amount - order.discount;
      const newStatus = newPaidAmount >= finalTotal ? 'paid' : 'partial_paid';

      db.run(`
        UPDATE orders 
        SET paid_amount = ?, status = ?, payment_method = ?, payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newPaidAmount, newStatus, payment_method, id], function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '支付失败' });
        }

        res.json({ success: true, message: '支付成功' });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
