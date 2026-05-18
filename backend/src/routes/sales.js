const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let query = 'SELECT * FROM sales_reps';
    if (active_only === 'true') {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY name';

    const reps = await dbAll(query);

    res.json({
      success: true,
      data: reps.map(r => ({
        ...r,
        regions: JSON.parse(r.regions || '[]'),
        industries: JSON.parse(r.industries || '[]')
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rep = await dbGet('SELECT * FROM sales_reps WHERE id = ?', [req.params.id]);
    
    if (!rep) {
      return res.status(404).json({ success: false, error: 'Sales rep not found' });
    }

    const assignments = await dbAll(`
      SELECT a.*, l.name as lead_name, l.email, l.total_score, l.heat_level
      FROM assignments a
      JOIN leads l ON a.lead_id = l.id
      WHERE a.sales_id = ? AND a.status = 'active'
      ORDER BY a.assigned_at DESC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...rep,
        regions: JSON.parse(rep.regions || '[]'),
        industries: JSON.parse(rep.industries || '[]'),
        assignments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, avatar, regions, industries, max_capacity } = req.body;

    const existing = await dbGet('SELECT * FROM sales_reps WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ success: false, error: '邮箱已存在' });
    }

    const result = await dbRun(`
      INSERT INTO sales_reps (name, email, phone, avatar, regions, industries, max_capacity, current_load)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      name,
      email,
      phone,
      avatar,
      JSON.stringify(regions || []),
      JSON.stringify(industries || []),
      max_capacity || 50
    ]);

    res.status(201).json({
      success: true,
      data: {
        id: result.lastID,
        name,
        email
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const rep = await dbGet('SELECT * FROM sales_reps WHERE id = ?', [req.params.id]);
    
    if (!rep) {
      return res.status(404).json({ success: false, error: 'Sales rep not found' });
    }

    const { name, email, phone, avatar, regions, industries, max_capacity, is_active } = req.body;

    if (email && email !== rep.email) {
      const existing = await dbGet('SELECT * FROM sales_reps WHERE email = ? AND id != ?', [email, req.params.id]);
      if (existing) {
        return res.status(400).json({ success: false, error: '邮箱已存在' });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (regions !== undefined) updateData.regions = JSON.stringify(regions);
    if (industries !== undefined) updateData.industries = JSON.stringify(industries);
    if (max_capacity !== undefined) updateData.max_capacity = max_capacity;
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;

    const setClauses = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updateData), req.params.id];

    if (Object.keys(updateData).length > 0) {
      await dbRun(`UPDATE sales_reps SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    }

    res.json({ success: true, message: '销售代表已更新' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const rep = await dbGet('SELECT * FROM sales_reps WHERE id = ?', [req.params.id]);
    
    if (!rep) {
      return res.status(404).json({ success: false, error: 'Sales rep not found' });
    }

    if (rep.current_load > 0) {
      return res.status(400).json({ success: false, error: '该销售仍有分配的线索，无法删除' });
    }

    await dbRun('DELETE FROM sales_reps WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: '销售代表已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/performance', async (req, res) => {
  try {
    const stats = await dbGet(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN feedback_score >= 4 THEN 1 ELSE 0 END) as high_quality,
        SUM(CASE WHEN feedback_score = 1 THEN 1 ELSE 0 END) as low_quality,
        AVG(feedback_score) as avg_feedback
      FROM assignments
      WHERE sales_id = ? AND feedback_score IS NOT NULL
    `, [req.params.id]);

    const returnRate = await dbGet(`
      SELECT COUNT(*) as returned
      FROM assignments
      WHERE sales_id = ? AND status = 'returned'
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...stats,
        returned: returnRate.returned,
        return_rate: stats.total_leads > 0 
          ? (returnRate.returned / stats.total_leads * 100).toFixed(1) 
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
