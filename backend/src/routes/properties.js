const express = require('express');
const { query, getOne } = require('../database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, status, minPrice, maxPrice } = req.query;
    const offset = (page - 1) * pageSize;
    
    let sql = `SELECT p.*, u.name as agent_name, s.name as store_name 
               FROM properties p 
               LEFT JOIN users u ON p.agent_id = u.id 
               LEFT JOIN stores s ON p.store_id = s.id 
               WHERE 1=1`;
    let countSql = 'SELECT COUNT(*) as total FROM properties WHERE 1=1';
    let params = [];
    
    if (keyword) {
      sql += ' AND (p.address LIKE ? OR p.owner_name LIKE ?)';
      countSql += ' AND (address LIKE ? OR owner_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    if (status) {
      sql += ' AND p.status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }
    
    if (minPrice) {
      sql += ' AND p.price >= ?';
      countSql += ' AND price >= ?';
      params.push(parseInt(minPrice));
    }
    
    if (maxPrice) {
      sql += ' AND p.price <= ?';
      countSql += ' AND price <= ?';
      params.push(parseInt(maxPrice));
    }

    if (req.user.role === 'agent' && req.user.store_id) {
      sql += ' AND (p.is_sensitive = 0 OR p.store_id = ?)';
      countSql += ' AND (is_sensitive = 0 OR store_id = ?)';
      params.push(req.user.store_id);
    }
    
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    const listParams = [...params, parseInt(pageSize), offset];
    
    const properties = await query(sql, listParams);
    const countResult = await getOne(countSql, params);
    
    res.json({
      success: true,
      data: {
        list: properties,
        total: countResult?.total || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取房源列表错误:', error);
    res.json({ success: false, message: '获取房源列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const property = await getOne(`SELECT p.*, u.name as agent_name, s.name as store_name 
                             FROM properties p 
                             LEFT JOIN users u ON p.agent_id = u.id 
                             LEFT JOIN stores s ON p.store_id = s.id 
                             WHERE p.id = ?`, [req.params.id]);
    
    if (!property) {
      return res.json({ success: false, message: '房源不存在' });
    }

    const photos = await query('SELECT * FROM property_photos WHERE property_id = ?', [req.params.id]);
    const priceHistory = await query('SELECT * FROM price_history WHERE property_id = ? ORDER BY changed_at DESC', [req.params.id]);
    
    res.json({ success: true, data: { ...property, photos, priceHistory } });
  } catch (error) {
    console.error('获取房源详情错误:', error);
    res.json({ success: false, message: '获取房源详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { owner_name, owner_phone, address, price, area, house_type, floor, orientation, has_key, viewing_restrictions, is_sensitive } = req.body;
    
    if (!owner_name || !owner_phone || !address || !price) {
      return res.json({ success: false, message: '必填项不能为空' });
    }

    const result = await query(
      `INSERT INTO properties (owner_name, owner_phone, address, price, area, house_type, floor, orientation, has_key, viewing_restrictions, is_sensitive, agent_id, store_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [owner_name, owner_phone, address, price, area, house_type, floor, orientation, has_key ? 1 : 0, viewing_restrictions, is_sensitive ? 1 : 0, req.user.id, req.user.store_id]
    );

    await query('INSERT INTO price_history (property_id, new_price, changed_by) VALUES (?, ?, ?)',
      [result.lastInsertRowid, price, req.user.id]);
    
    res.json({ success: true, data: { id: result.lastInsertRowid }, message: '房源创建成功' });
  } catch (error) {
    console.error('创建房源错误:', error);
    res.json({ success: false, message: '创建房源失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { owner_name, owner_phone, address, price, area, house_type, floor, orientation, has_key, viewing_restrictions, status, is_sensitive } = req.body;
    
    const oldProperty = await getOne('SELECT price FROM properties WHERE id = ?', [req.params.id]);
    
    await query(
      `UPDATE properties 
       SET owner_name = ?, owner_phone = ?, address = ?, price = ?, area = ?, house_type = ?, floor = ?, orientation = ?, has_key = ?, viewing_restrictions = ?, status = ?, is_sensitive = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [owner_name, owner_phone, address, price, area, house_type, floor, orientation, has_key ? 1 : 0, viewing_restrictions, status, is_sensitive ? 1 : 0, req.params.id]
    );

    if (oldProperty && oldProperty.price !== price) {
      await query('INSERT INTO price_history (property_id, old_price, new_price, changed_by) VALUES (?, ?, ?, ?)',
        [req.params.id, oldProperty.price, price, req.user.id]);
    }
    
    res.json({ success: true, message: '房源更新成功' });
  } catch (error) {
    console.error('更新房源错误:', error);
    res.json({ success: false, message: '更新房源失败' });
  }
});

module.exports = router;
