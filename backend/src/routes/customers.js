const express = require('express');
const { query, getOne } = require('../database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    const offset = (page - 1) * pageSize;
    
    let sql = 'SELECT c.*, u.name as agent_name FROM customers c LEFT JOIN users u ON c.agent_id = u.id WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM customers WHERE 1=1';
    let params = [];
    
    if (keyword) {
      sql += ' AND (c.name LIKE ? OR c.phone LIKE ?)';
      countSql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    const listParams = [...params, parseInt(pageSize), offset];
    
    const customers = await query(sql, listParams);
    const countResult = await getOne(countSql, params);
    
    res.json({
      success: true,
      data: {
        list: customers,
        total: countResult?.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取客户列表错误:', error);
    res.json({ success: false, message: '获取客户列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await getOne('SELECT c.*, u.name as agent_name FROM customers c LEFT JOIN users u ON c.agent_id = u.id WHERE c.id = ?', [req.params.id]);
    
    if (!customer) {
      return res.json({ success: false, message: '客户不存在' });
    }
    
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('获取客户详情错误:', error);
    res.json({ success: false, message: '获取客户详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, budget_min, budget_max, areas, house_types, school_district, loan_ability, purchase_stage, privacy_authorized, agent_id } = req.body;
    
    if (!name || !phone) {
      return res.json({ success: false, message: '姓名和电话不能为空' });
    }

    const existing = await getOne('SELECT * FROM customers WHERE phone = ?', [phone]);
    
    if (existing) {
      await query('INSERT INTO customer_conflicts (customer_id, existing_agent_id, new_agent_id) VALUES (?, ?, ?)', 
        [existing.id, existing.agent_id, agent_id || req.user.id]);
      
      return res.json({ 
        success: false, 
        message: '该手机号已存在客户记录',
        conflict: true,
        existingCustomer: existing
      });
    }

    const result = await query(
      `INSERT INTO customers (name, phone, budget_min, budget_max, areas, house_types, school_district, loan_ability, purchase_stage, privacy_authorized, agent_id, store_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, budget_min, budget_max, areas, house_types, school_district, loan_ability, purchase_stage, privacy_authorized ? 1 : 0, agent_id || req.user.id, req.user.store_id]
    );
    
    res.json({ success: true, data: { id: result.lastInsertRowid }, message: '客户创建成功' });
  } catch (error) {
    console.error('创建客户错误:', error);
    res.json({ success: false, message: '创建客户失败: ' + error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, budget_min, budget_max, areas, house_types, school_district, loan_ability, purchase_stage, privacy_authorized, agent_id, status } = req.body;
    
    await query(
      `UPDATE customers 
       SET name = ?, phone = ?, budget_min = ?, budget_max = ?, areas = ?, house_types = ?, school_district = ?, loan_ability = ?, purchase_stage = ?, privacy_authorized = ?, agent_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, phone, budget_min, budget_max, areas, house_types, school_district, loan_ability, purchase_stage, privacy_authorized ? 1 : 0, agent_id, status, req.params.id]
    );
    
    res.json({ success: true, message: '客户更新成功' });
  } catch (error) {
    console.error('更新客户错误:', error);
    res.json({ success: false, message: '更新客户失败' });
  }
});

router.get('/:id/matches', async (req, res) => {
  try {
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    
    if (!customer) {
      return res.json({ success: false, message: '客户不存在' });
    }

    let sql = `SELECT p.*, u.name as agent_name FROM properties p 
               LEFT JOIN users u ON p.agent_id = u.id 
               WHERE p.status = 'available'`;
    let params = [];

    if (customer.budget_min) {
      sql += ' AND p.price >= ?';
      params.push(customer.budget_min);
    }
    if (customer.budget_max) {
      sql += ' AND p.price <= ?';
      params.push(customer.budget_max);
    }

    const properties = await query(sql, params);
    
    res.json({ success: true, data: properties });
  } catch (error) {
    console.error('获取匹配房源错误:', error);
    res.json({ success: false, message: '获取匹配房源失败' });
  }
});

module.exports = router;
