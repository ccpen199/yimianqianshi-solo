const express = require('express');
const moment = require('moment');
const { getOne, getAll, runQuery } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

const canTransitionStatus = (currentStatus, newStatus) => {
  const validTransitions = {
    'new': ['assigned'],
    'assigned': ['calling'],
    'calling': ['deal', 'invalid', 'rejected', 'follow_up', 'lost'],
    'follow_up': ['calling', 'deal', 'lost'],
    'deal': [],
    'invalid': [],
    'rejected': [],
    'lost': []
  };
  
  if (newStatus === 'deal' && !['supervisor', 'admin'].includes(req?.user?.role)) {
    return false;
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

router.post('/:taskId/start', authenticateToken, requireRole('operator'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await getOne('SELECT * FROM tasks WHERE id = ? AND agent_id = ?', [taskId, req.user.id]);
    
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    const lead = await getOne('SELECT * FROM leads WHERE id = ?', [task.lead_id]);
    if (!lead) {
      return res.status(404).json({ success: false, message: '线索不存在' });
    }

    await runQuery('UPDATE tasks SET status = ? WHERE id = ?', ['in_progress', taskId]);
    await runQuery('UPDATE leads SET status = ?, last_called_at = CURRENT_TIMESTAMP, total_calls = total_calls + 1 WHERE id = ?', 
      ['calling', task.lead_id]);

    res.json({ success: true, data: { task, lead }, message: '开始通话' });
  } catch (error) {
    console.error('开始通话错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:taskId/end', authenticateToken, requireRole('operator'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { callResult, disposition, intent_level, notes, next_follow_up_at, duration } = req.body;

    if (!callResult) {
      return res.status(400).json({ success: false, message: '请选择通话结果' });
    }

    const task = await getOne('SELECT * FROM tasks WHERE id = ? AND agent_id = ?', [taskId, req.user.id]);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    const lead = await getOne('SELECT * FROM leads WHERE id = ?', [task.lead_id]);
    if (!lead) {
      return res.status(404).json({ success: false, message: '线索不存在' });
    }

    let leadStatus = lead.status;
    if (disposition === 'deal') {
      if (!['supervisor', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: '没有权限标记为成交' });
      }
      leadStatus = 'deal';
    } else if (disposition === 'invalid') {
      leadStatus = 'invalid';
    } else if (disposition === 'rejected') {
      leadStatus = 'rejected';
    } else if (disposition === 'follow_up') {
      leadStatus = 'follow_up';
    } else if (disposition === 'lost') {
      leadStatus = 'lost';
    }

    const callRecord = await runQuery(
      `INSERT INTO call_records 
       (lead_id, agent_id, task_id, call_result, disposition, intent_level, notes, next_follow_up_at, duration, quality_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [task.lead_id, req.user.id, taskId, callResult, disposition, intent_level, notes, next_follow_up_at, duration, 'pending']
    );

    await runQuery(
      'UPDATE leads SET status = ?, intent_level = ?, next_follow_up_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [leadStatus, intent_level, next_follow_up_at, task.lead_id]
    );

    await runQuery('UPDATE tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', ['completed', taskId]);

    const today = moment().format('YYYY-MM-DD');
    const dailyGoal = await getOne('SELECT * FROM daily_goals WHERE agent_id = ? AND goal_date = ?', [req.user.id, today]);
    
    if (dailyGoal) {
      const updateData = ['completed_calls = completed_calls + 1'];
      const params = [];
      
      if (disposition === 'deal') {
        updateData.push('completed_deals = completed_deals + 1');
      }
      
      await runQuery(
        `UPDATE daily_goals SET ${updateData.join(', ')} WHERE id = ?`,
        [...params, dailyGoal.id]
      );
    }

    await runQuery('UPDATE users SET current_task_count = MAX(0, current_task_count - 1) WHERE id = ?', [req.user.id]);

    res.json({
      success: true,
      data: { callRecordId: callRecord.lastID, leadStatus },
      message: '通话结束'
    });
  } catch (error) {
    console.error('结束通话错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/records', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, agent_id, start_date, end_date, quality_status, disposition } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT cr.*, l.name, l.phone, u.name as agent_name, u2.name as inspector_name
      FROM call_records cr
      JOIN leads l ON cr.lead_id = l.id
      JOIN users u ON cr.agent_id = u.id
      LEFT JOIN users u2 ON cr.quality_inspector_id = u2.id
      WHERE 1=1
    `;
    const params = [];

    if (agent_id) {
      query += ' AND cr.agent_id = ?';
      params.push(agent_id);
    }
    if (start_date) {
      query += ' AND DATE(cr.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(cr.created_at) <= ?';
      params.push(end_date);
    }
    if (quality_status) {
      query += ' AND cr.quality_status = ?';
      params.push(quality_status);
    }
    if (disposition) {
      query += ' AND cr.disposition = ?';
      params.push(disposition);
    }

    if (req.user.role === 'operator') {
      query += ' AND cr.agent_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY cr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const records = await getAll(query, params);

    res.json({
      success: true,
      data: { records, pagination: { page: parseInt(page), limit: parseInt(limit) } },
      message: '获取成功'
    });
  } catch (error) {
    console.error('获取通话记录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
