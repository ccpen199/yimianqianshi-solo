const { getOne, getAll, runQuery } = require('../database');
const renewalService = require('../services/renewalService');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

async function getRenewalTasks(req, res) {
  try {
    const { status, priority, csmId, page = 1, pageSize = 20 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND rt.status = ?';
      params.push(status);
    }
    if (priority) {
      whereClause += ' AND rt.priority = ?';
      params.push(priority);
    }
    if (csmId) {
      whereClause += ' AND rt.csm_id = ?';
      params.push(csmId);
    }
    
    const offset = (page - 1) * pageSize;
    
    const tasks = await getAll(`
      SELECT 
        rt.*,
        c.name as customer_name,
        ct.contract_no,
        ct.arr_amount,
        ct.end_date,
        cu.name as csm_name,
        hs.risk_level,
        hs.overall_score as health_score
      FROM renewal_tasks rt
      JOIN customers c ON rt.customer_id = c.id
      LEFT JOIN contracts ct ON rt.contract_id = ct.id
      LEFT JOIN csm_users cu ON rt.csm_id = cu.id
      LEFT JOIN health_scores hs ON hs.customer_id = c.id
      ${whereClause}
      GROUP BY rt.id
      ORDER BY rt.due_date ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(pageSize), offset]);
    
    const totalResult = await getOne(`
      SELECT COUNT(*) as count FROM renewal_tasks rt
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: totalResult?.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function createRenewalTask(req, res) {
  try {
    const {
      contractId,
      customerId,
      csmId,
      taskType,
      dueDate,
      priority
    } = req.body;
    
    if (!contractId || !customerId) {
      return res.status(400).json({
        success: false,
        message: 'Contract ID and Customer ID are required'
      });
    }
    
    const taskId = uuidv4();
    
    await runQuery(`
      INSERT INTO renewal_tasks
      (id, contract_id, customer_id, csm_id, task_type, due_date, priority, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      taskId,
      contractId,
      customerId,
      csmId || null,
      taskType || 'renewal_followup',
      dueDate || dayjs().add(15, 'day').toISOString(),
      priority || 'medium',
      'pending',
      dayjs().toISOString()
    ]);
    
    res.json({
      success: true,
      data: { id: taskId },
      message: 'Renewal task created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function updateRenewalTask(req, res) {
  try {
    const { id } = req.params;
    const { touchContent, nextCommitment, status, csmId } = req.body;
    
    const task = await getOne('SELECT * FROM renewal_tasks WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Renewal task not found'
      });
    }
    
    const updates = [];
    const values = [];
    
    if (touchContent !== undefined) {
      updates.push('touch_content = ?');
      values.push(touchContent);
    }
    if (nextCommitment !== undefined) {
      updates.push('next_commitment = ?');
      values.push(nextCommitment);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
      if (status === 'completed') {
        updates.push('completed_at = ?');
        values.push(dayjs().toISOString());
      }
    }
    if (csmId !== undefined) {
      updates.push('csm_id = ?');
      values.push(csmId);
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(dayjs().toISOString());
      values.push(id);
      
      await runQuery(`
        UPDATE renewal_tasks 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `, values);
    }
    
    res.json({
      success: true,
      message: 'Renewal task updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function getRiskAlerts(req, res) {
  try {
    const { status, severity, customerId, page = 1, pageSize = 20 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND ra.status = ?';
      params.push(status);
    }
    if (severity) {
      whereClause += ' AND ra.severity = ?';
      params.push(severity);
    }
    if (customerId) {
      whereClause += ' AND ra.customer_id = ?';
      params.push(customerId);
    }
    
    const offset = (page - 1) * pageSize;
    
    const alerts = await getAll(`
      SELECT 
        ra.*,
        c.name as customer_name,
        ct.contract_no
      FROM risk_alerts ra
      JOIN customers c ON ra.customer_id = c.id
      LEFT JOIN contracts ct ON ra.contract_id = ct.id
      ${whereClause}
      ORDER BY 
        CASE ra.severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        ra.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(pageSize), offset]);
    
    const totalResult = await getOne(`
      SELECT COUNT(*) as count FROM risk_alerts ra
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: totalResult?.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function resolveRiskAlert(req, res) {
  try {
    const { id } = req.params;
    const { resolutionNotes, assignedTo } = req.body;
    
    const alert = await getOne('SELECT * FROM risk_alerts WHERE id = ?', [id]);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Risk alert not found'
      });
    }
    
    await runQuery(`
      UPDATE risk_alerts 
      SET status = 'resolved', 
          resolved_at = ?,
          resolution_notes = ?,
          assigned_to = COALESCE(?, assigned_to)
      WHERE id = ?
    `, [dayjs().toISOString(), resolutionNotes || null, assignedTo || null, id]);
    
    res.json({
      success: true,
      message: 'Risk alert resolved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function getRenewalRecords(req, res) {
  try {
    const { status, customerId, financeVerified, page = 1, pageSize = 20 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND rr.status = ?';
      params.push(status);
    }
    if (customerId) {
      whereClause += ' AND rr.customer_id = ?';
      params.push(customerId);
    }
    if (financeVerified !== undefined) {
      whereClause += ' AND rr.finance_verified = ?';
      params.push(financeVerified === 'true' ? 1 : 0);
    }
    
    const offset = (page - 1) * pageSize;
    
    const records = await getAll(`
      SELECT 
        rr.*,
        c.name as customer_name,
        ct.contract_no,
        cu.name as csm_name
      FROM renewal_records rr
      JOIN customers c ON rr.customer_id = c.id
      LEFT JOIN contracts ct ON rr.contract_id = ct.id
      LEFT JOIN csm_users cu ON rr.csm_id = cu.id
      ${whereClause}
      ORDER BY rr.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(pageSize), offset]);
    
    const totalResult = await getOne(`
      SELECT COUNT(*) as count FROM renewal_records rr
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: totalResult?.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function generateRenewalTasks(req, res) {
  try {
    const result = await renewalService.generateRenewalTasks();
    
    res.json({
      success: true,
      data: result,
      message: `Generated ${result.length} renewal tasks`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function processRenewal(req, res) {
  try {
    const result = await renewalService.processRenewal(req.body);
    
    res.json({
      success: true,
      data: result,
      message: 'Renewal processed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function verifyRenewal(req, res) {
  try {
    const { id } = req.params;
    const { verified, notes } = req.body;
    
    const result = await renewalService.verifyRenewal(id, verified, notes);
    
    res.json({
      success: true,
      data: result,
      message: verified ? 'Renewal verified successfully' : 'Renewal rejected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function recordFollowUp(req, res) {
  try {
    const result = await renewalService.recordFollowUp(req.body);
    
    res.json({
      success: true,
      data: result,
      message: 'Follow up recorded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function getRenewalCalendar(req, res) {
  try {
    const result = await renewalService.getRenewalCalendarData();
    
    const grouped = {
      '0_30_days': result.filter(r => r.timeGroup === '0_30'),
      '31_60_days': result.filter(r => r.timeGroup === '31_60'),
      '61_90_days': result.filter(r => r.timeGroup === '61_90'),
      'other': result.filter(r => r.timeGroup === 'other')
    };
    
    res.json({
      success: true,
      data: {
        grouped,
        all: result
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getRenewalTasks,
  createRenewalTask,
  updateRenewalTask,
  getRiskAlerts,
  resolveRiskAlert,
  getRenewalRecords,
  generateRenewalTasks,
  processRenewal,
  verifyRenewal,
  recordFollowUp,
  getRenewalCalendar
};
