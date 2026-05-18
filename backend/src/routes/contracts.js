const express = require('express');
const { query, getOne, getDb } = require('../database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    let sql = `SELECT c.*, cust.name as customer_name, p.address as property_address
               FROM contracts c 
               LEFT JOIN customers cust ON c.customer_id = cust.id
               LEFT JOIN properties p ON c.property_id = p.id
               WHERE 1=1`;
    let countSql = 'SELECT COUNT(*) as total FROM contracts WHERE 1=1';
    let params = [];
    
    if (status) {
      sql += ' AND c.status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    const listParams = [...params, parseInt(pageSize), offset];
    
    const contracts = await query(sql, listParams);
    const countResult = await getOne(countSql, params);
    
    res.json({
      success: true,
      data: {
        list: contracts,
        total: countResult?.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取合同列表错误:', error);
    res.json({ success: false, message: '获取合同列表失败' });
  }
});

router.post('/', async (req, res) => {
  const db = getDb();
  try {
    const { negotiation_id, customer_id, property_id, total_price, commission_amount, sign_date } = req.body;
    
    if (!customer_id || !property_id || !total_price) {
      return res.json({ success: false, message: '必填项不能为空' });
    }

    const contract_no = 'HT' + Date.now();
    const result = await query(
      'INSERT INTO contracts (negotiation_id, customer_id, property_id, contract_no, total_price, commission_amount, sign_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [negotiation_id, customer_id, property_id, contract_no, total_price, commission_amount, sign_date, 'signed']
    );

    if (negotiation_id) {
      await query('UPDATE negotiations SET status = ? WHERE id = ?', ['signed', negotiation_id]);
    }

    await query('UPDATE properties SET status = ? WHERE id = ?', ['sold', property_id]);

    if (commission_amount && commission_amount > 0) {
      const commissionRate = 0.7;
      const managerRate = 0.2;
      
      await query('INSERT INTO commissions (contract_id, user_id, amount, percentage, status) VALUES (?, ?, ?, ?, ?)',
        [result.lastInsertRowid, req.user.id, Math.floor(commission_amount * commissionRate), commissionRate, 'pending']);
      
      const managers = await query('SELECT id FROM users WHERE role = ?', ['manager']);
      if (managers.length > 0) {
        await query('INSERT INTO commissions (contract_id, user_id, amount, percentage, status) VALUES (?, ?, ?, ?, ?)',
          [result.lastInsertRowid, managers[0].id, Math.floor(commission_amount * managerRate), managerRate, 'pending']);
      }
    }
    
    res.json({ success: true, data: { id: result.lastInsertRowid, contract_no }, message: '合同创建成功' });
  } catch (error) {
    console.error('创建合同错误:', error);
    res.json({ success: false, message: '创建合同失败' });
  }
});

module.exports = router;
