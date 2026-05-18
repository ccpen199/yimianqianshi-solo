const express = require('express');
const { query, getOne } = require('../database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, date } = req.query;
    const offset = (page - 1) * pageSize;
    
    let sql = `SELECT v.*, c.name as customer_name, c.phone as customer_phone, 
               p.address as property_address, u.name as agent_name
               FROM viewings v 
               LEFT JOIN customers c ON v.customer_id = c.id
               LEFT JOIN properties p ON v.property_id = p.id
               LEFT JOIN users u ON v.agent_id = u.id
               WHERE 1=1`;
    let countSql = 'SELECT COUNT(*) as total FROM viewings WHERE 1=1';
    let params = [];
    
    if (status) {
      sql += ' AND v.status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }
    
    if (date) {
      sql += ` AND DATE(v.viewing_time) = DATE(?)`;
      countSql += ` AND DATE(viewing_time) = DATE(?)`;
      params.push(date);
    }
    
    sql += ' ORDER BY v.viewing_time DESC LIMIT ? OFFSET ?';
    const listParams = [...params, parseInt(pageSize), offset];
    
    const viewings = await query(sql, listParams);
    const countResult = await getOne(countSql, params);
    
    res.json({
      success: true,
      data: {
        list: viewings,
        total: countResult?.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取带看列表错误:', error);
    res.json({ success: false, message: '获取带看列表失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, property_id, viewing_time } = req.body;
    
    if (!customer_id || !property_id || !viewing_time) {
      return res.json({ success: false, message: '必填项不能为空' });
    }

    const property = await getOne('SELECT status FROM properties WHERE id = ?', [property_id]);
    
    if (!property) {
      return res.json({ success: false, message: '房源不存在' });
    }
    
    if (property.status !== 'available') {
      return res.json({ success: false, message: '房源不可带看' });
    }

    const conflicts = await getOne(
      `SELECT COUNT(*) as count FROM viewings WHERE agent_id = ? AND DATE(viewing_time) = DATE(?) AND status != 'cancelled'`,
      [req.user.id, viewing_time]
    );
    
    if (conflicts && conflicts.count > 0) {
      return res.json({ success: false, message: '该时间段已有带看安排' });
    }

    const result = await query(
      'INSERT INTO viewings (customer_id, property_id, agent_id, viewing_time) VALUES (?, ?, ?, ?)',
      [customer_id, property_id, req.user.id, viewing_time]
    );
    
    res.json({ success: true, data: { id: result.lastInsertRowid }, message: '带看安排成功' });
  } catch (error) {
    console.error('创建带看错误:', error);
    res.json({ success: false, message: '创建带看失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, customer_feedback, agent_notes } = req.body;
    
    await query(
      'UPDATE viewings SET status = ?, customer_feedback = ?, agent_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, customer_feedback, agent_notes, req.params.id]
    );
    
    res.json({ success: true, message: '带看更新成功' });
  } catch (error) {
    console.error('更新带看错误:', error);
    res.json({ success: false, message: '更新带看失败' });
  }
});

module.exports = router;
