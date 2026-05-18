const express = require('express');
const moment = require('moment');
const { getOne, getAll } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/overview', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
  try {
    const leadStats = await getOne(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_leads,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_leads,
        SUM(CASE WHEN status = 'calling' THEN 1 ELSE 0 END) as calling_leads,
        SUM(CASE WHEN status = 'deal' THEN 1 ELSE 0 END) as deal_leads,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_leads
      FROM leads
    `);

    const callStats = await getOne(`
      SELECT 
        COUNT(*) as total_calls,
        COALESCE(SUM(duration), 0) as total_duration,
        SUM(CASE WHEN disposition = 'deal' THEN 1 ELSE 0 END) as deals,
        SUM(CASE WHEN disposition = 'follow_up' THEN 1 ELSE 0 END) as follow_ups
      FROM call_records
      WHERE DATE(created_at) = DATE('now')
    `);

    const agentStats = await getAll(`
      SELECT u.id, u.name
      FROM users u
      WHERE u.role = 'operator' AND u.status = 'active'
    `);

    res.json({
      success: true,
      data: { leadStats, callStats, agentStats },
      message: '获取成功'
    });
  } catch (error) {
    console.error('获取概览报表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/trend', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const trendData = await getAll(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as calls,
        SUM(CASE WHEN disposition = 'deal' THEN 1 ELSE 0 END) as deals,
        SUM(CASE WHEN disposition = 'follow_up' THEN 1 ELSE 0 END) as follow_ups
      FROM call_records
      WHERE created_at >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);

    res.json({ success: true, data: trendData, message: '获取成功' });
  } catch (error) {
    console.error('获取趋势报表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/agent/:agentId', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
  try {
    const { agentId } = req.params;
    const { start_date, end_date } = req.query;

    let dateCondition = '1=1';
    const params = [agentId];
    
    if (start_date) {
      dateCondition += ' AND DATE(cr.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateCondition += ' AND DATE(cr.created_at) <= ?';
      params.push(end_date);
    }

    const agentStats = await getOne(`
      SELECT 
        u.name,
        COUNT(cr.id) as total_calls,
        SUM(cr.duration) as total_duration,
        AVG(cr.duration) as avg_duration,
        SUM(CASE WHEN cr.disposition = 'deal' THEN 1 ELSE 0 END) as deals,
        SUM(CASE WHEN cr.disposition = 'follow_up' THEN 1 ELSE 0 END) as follow_ups,
        SUM(CASE WHEN cr.disposition = 'invalid' THEN 1 ELSE 0 END) as invalid,
        SUM(CASE WHEN cr.quality_status = 'passed' THEN 1 ELSE 0 END) as quality_passed,
        SUM(CASE WHEN cr.quality_status = 'failed' THEN 1 ELSE 0 END) as quality_failed
      FROM users u
      LEFT JOIN call_records cr ON u.id = cr.agent_id
      WHERE u.id = ? AND ${dateCondition}
    `, params);

    const callHistory = await getAll(`
      SELECT cr.*, l.name, l.phone
      FROM call_records cr
      JOIN leads l ON cr.lead_id = l.id
      WHERE cr.agent_id = ?
      ORDER BY cr.created_at DESC
      LIMIT 50
    `, [agentId]);

    res.json({
      success: true,
      data: { stats: agentStats, callHistory },
      message: '获取成功'
    });
  } catch (error) {
    console.error('获取坐席报表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
