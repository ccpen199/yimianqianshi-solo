const express = require('express');
const { getOne, getAll, runQuery } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/pending', authenticateToken, requireRole('quality_inspector', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const records = await getAll(`
      SELECT cr.*, l.name, l.phone, u.name as agent_name
      FROM call_records cr
      JOIN leads l ON cr.lead_id = l.id
      JOIN users u ON cr.agent_id = u.id
      WHERE cr.quality_status = 'pending'
      ORDER BY cr.created_at ASC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    const countResult = await getOne(
      "SELECT COUNT(*) as total FROM call_records WHERE quality_status = 'pending'"
    );

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total
        }
      },
      message: '获取成功'
    });
  } catch (error) {
    console.error('获取待质检记录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:recordId/audit', authenticateToken, requireRole('quality_inspector', 'admin'), async (req, res) => {
  try {
    const { recordId } = req.params;
    const { quality_status, quality_notes, reassign = false } = req.body;

    if (!['passed', 'failed'].includes(quality_status)) {
      return res.status(400).json({ success: false, message: '质检状态无效' });
    }

    const record = await getOne('SELECT * FROM call_records WHERE id = ?', [recordId]);
    if (!record) {
      return res.status(404).json({ success: false, message: '通话记录不存在' });
    }

    await runQuery(
      `UPDATE call_records 
       SET quality_checked = 1, quality_status = ?, quality_notes = ?, quality_inspector_id = ?
       WHERE id = ?`,
      [quality_status, quality_notes, req.user.id, recordId]
    );

    if (quality_status === 'failed' && reassign) {
      const lead = await getOne('SELECT * FROM leads WHERE id = ?', [record.lead_id]);
      if (lead) {
        await runQuery('UPDATE leads SET status = ? WHERE id = ?', ['new', lead.id]);
        
        await runQuery('UPDATE tasks SET status = ? WHERE id = ?', ['reassigned', record.task_id]);
      }
    }

    res.json({ success: true, message: '质检完成' });
  } catch (error) {
    console.error('质检错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN quality_status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN quality_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN quality_status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM call_records
      WHERE quality_checked = 1 OR quality_status = 'pending'
    `);

    res.json({ success: true, data: stats, message: '获取成功' });
  } catch (error) {
    console.error('获取质检统计错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
