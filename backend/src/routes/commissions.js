const express = require('express');
const { query, getOne } = require('../database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    let sql = `SELECT c.*, u.name as user_name, p.address as property_address
               FROM commissions c 
               LEFT JOIN users u ON c.user_id = u.id
               LEFT JOIN contracts ct ON c.contract_id = ct.id
               LEFT JOIN properties p ON ct.property_id = p.id
               WHERE 1=1`;
    let countSql = 'SELECT COUNT(*) as total FROM commissions WHERE 1=1';
    let params = [];
    
    if (status) {
      sql += ' AND c.status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    const listParams = [...params, parseInt(pageSize), offset];
    
    const commissions = await query(sql, listParams);
    const countResult = await getOne(countSql, params);
    
    res.json({
      success: true,
      data: {
        list: commissions,
        total: countResult?.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取佣金列表错误:', error);
    res.json({ success: false, message: '获取佣金列表失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, payment_date } = req.body;
    
    await query(
      'UPDATE commissions SET status = ?, payment_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, payment_date, req.params.id]
    );
    
    res.json({ success: true, message: '佣金更新成功' });
  } catch (error) {
    console.error('更新佣金错误:', error);
    res.json({ success: false, message: '更新佣金失败' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalCommissions = await getOne('SELECT SUM(amount) as total FROM commissions WHERE status = "paid"');
    const pendingCommissions = await getOne('SELECT SUM(amount) as total FROM commissions WHERE status = "pending"');
    const monthlyCommissions = await getOne(`
      SELECT SUM(amount) as total 
      FROM commissions 
      WHERE status = "paid" AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `);
    
    res.json({
      success: true,
      data: {
        total: totalCommissions?.total || 0,
        pending: pendingCommissions?.total || 0,
        monthly: monthlyCommissions?.total || 0
      }
    });
  } catch (error) {
    console.error('获取佣金统计错误:', error);
    res.json({ success: false, message: '获取佣金统计失败' });
  }
});

module.exports = router;
