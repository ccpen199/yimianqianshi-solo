const express = require('express');
const moment = require('moment');
const { getOne, getAll, runQuery } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

router.post('/assign', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
  try {
    const { leadIds, agentId, priority = 'normal' } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要分配的线索' });
    }
    if (!agentId) {
      return res.status(400).json({ success: false, message: '请选择坐席' });
    }

    const agent = await getOne('SELECT * FROM users WHERE id = ? AND role = ?', [agentId, 'operator']);
    if (!agent) {
      return res.status(404).json({ success: false, message: '坐席不存在' });
    }

    const today = moment().format('YYYY-MM-DD');
    let assignedCount = 0;

    for (const leadId of leadIds) {
      const lead = await getOne('SELECT * FROM leads WHERE id = ?', [leadId]);
      if (!lead) continue;

      await runQuery('UPDATE leads SET status = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['assigned', agentId, leadId]);

      await runQuery(
        `INSERT INTO tasks (lead_id, agent_id, supervisor_id, priority, daily_goal_date) 
         VALUES (?, ?, ?, ?, ?)`,
        [leadId, agentId, req.user.id, priority, today]
      );

      assignedCount++;
    }

    const dailyGoal = await getOne('SELECT * FROM daily_goals WHERE agent_id = ? AND goal_date = ?', [agentId, today]);
    if (!dailyGoal) {
      await runQuery('INSERT INTO daily_goals (agent_id, goal_date, target_calls) VALUES (?, ?, ?)',
        [agentId, today, agent.max_daily_tasks || 50]);
    }

    await runQuery('UPDATE users SET current_task_count = current_task_count + ? WHERE id = ?',
      [assignedCount, agentId]);

    res.json({
      success: true,
      data: { assignedCount, agentName: agent.name },
      message: `成功分配 ${assignedCount} 条线索`
    });
  } catch (error) {
    console.error('分配任务错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/my-tasks', authenticateToken, requireRole('operator'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const offset = (page - 1) * limit;

    const tasks = await getAll(`
      SELECT t.*, l.name, l.phone, l.region, l.product, l.customer_level, l.status as lead_status, l.intent_level, l.next_follow_up_at
      FROM tasks t
      JOIN leads l ON t.lead_id = l.id
      WHERE t.agent_id = ? AND t.status = ?
      ORDER BY t.priority = 'high' DESC, t.priority = 'normal' DESC, t.assigned_at ASC
      LIMIT ? OFFSET ?
    `, [req.user.id, status, parseInt(limit), parseInt(offset)]);

    const countResult = await getOne(
      'SELECT COUNT(*) as total FROM tasks WHERE agent_id = ? AND status = ?',
      [req.user.id, status]
    );

    const today = moment().format('YYYY-MM-DD');
    const dailyGoal = await getOne('SELECT * FROM daily_goals WHERE agent_id = ? AND goal_date = ?', [req.user.id, today]);

    const followUpExpired = await getAll(`
      SELECT t.*, l.name, l.phone, l.next_follow_up_at
      FROM tasks t
      JOIN leads l ON t.lead_id = l.id
      WHERE t.agent_id = ? AND t.status = 'pending' AND l.next_follow_up_at < CURRENT_TIMESTAMP AND l.next_follow_up_at IS NOT NULL
      ORDER BY l.next_follow_up_at ASC
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total
        },
        dailyGoal,
        followUpExpired
      },
      message: '获取成功'
    });
  } catch (error) {
    console.error('获取我的任务错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await getAll(`
      SELECT u.*, 
        COUNT(t.id) as pending_tasks
      FROM users u
      LEFT JOIN tasks t ON u.id = t.agent_id AND t.status = 'pending'
      WHERE u.role = 'operator' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY pending_tasks ASC
    `);

    res.json({ success: true, data: agents, message: '获取成功' });
  } catch (error) {
    console.error('获取坐席列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
