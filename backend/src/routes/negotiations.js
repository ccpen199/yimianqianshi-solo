const express = require('express');
const { query, getOne } = require('../database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    let sql = `SELECT n.*, c.name as customer_name, p.address as property_address, u.name as agent_name
               FROM negotiations n 
               LEFT JOIN customers c ON n.customer_id = c.id
               LEFT JOIN properties p ON n.property_id = p.id
               LEFT JOIN users u ON n.agent_id = u.id
               WHERE 1=1`;
    let countSql = 'SELECT COUNT(*) as total FROM negotiations WHERE 1=1';
    let params = [];
    
    if (status) {
      sql += ' AND n.status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    const listParams = [...params, parseInt(pageSize), offset];
    
    const negotiations = await query(sql, listParams);
    const countResult = await getOne(countSql, params);
    
    res.json({
      success: true,
      data: {
        list: negotiations,
        total: countResult?.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取谈判列表错误:', error);
    res.json({ success: false, message: '获取谈判列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const negotiation = await getOne(`SELECT n.*, c.name as customer_name, p.address as property_address, u.name as agent_name
                                 FROM negotiations n 
                                 LEFT JOIN customers c ON n.customer_id = c.id
                                 LEFT JOIN properties p ON n.property_id = p.id
                                 LEFT JOIN users u ON n.agent_id = u.id
                                 WHERE n.id = ?`, [req.params.id]);
    
    if (!negotiation) {
      return res.json({ success: false, message: '谈判记录不存在' });
    }
    
    res.json({ success: true, data: negotiation });
  } catch (error) {
    console.error('获取谈判详情错误:', error);
    res.json({ success: false, message: '获取谈判详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, property_id, initial_offer } = req.body;
    
    if (!customer_id || !property_id) {
      return res.json({ success: false, message: '必填项不能为空' });
    }

    const result = await query(
      'INSERT INTO negotiations (customer_id, property_id, agent_id, initial_offer) VALUES (?, ?, ?, ?)',
      [customer_id, property_id, req.user.id, initial_offer]
    );
    
    res.json({ success: true, data: { id: result.lastInsertRowid }, message: '谈判记录创建成功' });
  } catch (error) {
    console.error('创建谈判错误:', error);
    res.json({ success: false, message: '创建谈判失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { counter_offer, final_price, owner_feedback, loan_progress, contract_nodes, status } = req.body;
    
    await query(
      `UPDATE negotiations 
       SET counter_offer = ?, final_price = ?, owner_feedback = ?, loan_progress = ?, contract_nodes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [counter_offer, final_price, owner_feedback, loan_progress, contract_nodes, status, req.params.id]
    );
    
    res.json({ success: true, message: '谈判更新成功' });
  } catch (error) {
    console.error('更新谈判错误:', error);
    res.json({ success: false, message: '更新谈判失败' });
  }
});

module.exports = router;
