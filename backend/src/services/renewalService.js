const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { getOne, getAll, runQuery } = require('../database');
const healthScoreService = require('./healthScoreService');

async function generateRenewalTasks() {
  try {
    const expiringContracts = await getAll(`
      SELECT c.*, cu.name as customer_name 
      FROM contracts c
      JOIN customers cu ON c.customer_id = cu.id
      WHERE c.status = ? 
      AND c.end_date IS NOT NULL
    `, ['active']);
    
    const tasksCreated = [];
    
    for (const contract of expiringContracts) {
      const endDate = dayjs(contract.end_date);
      const daysUntilExpiry = endDate.diff(dayjs(), 'day');
      
      if (daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
        const existingTask = await getOne(`
          SELECT id FROM renewal_tasks 
          WHERE contract_id = ? AND status IN ('pending', 'in_progress')
        `, [contract.id]);
        
        if (!existingTask) {
          const healthScore = await getOne(`
            SELECT overall_score, risk_level FROM health_scores 
            WHERE customer_id = ? 
            ORDER BY calculated_at DESC 
            LIMIT 1
          `, [contract.customer_id]);
          
          const priority = getPriorityByRiskAndDays(
            healthScore?.risk_level || 'medium', 
            daysUntilExpiry
          );
          
          const csm = await assignCSM();
          
          const taskId = uuidv4();
          await runQuery(`
            INSERT INTO renewal_tasks 
            (id, contract_id, customer_id, csm_id, task_type, due_date, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            taskId,
            contract.id,
            contract.customer_id,
            csm?.id || null,
            'renewal_followup',
            endDate.subtract(15, 'day').toISOString(),
            priority,
            'pending',
            dayjs().toISOString()
          ]);
          
          tasksCreated.push({
            id: taskId,
            contractId: contract.id,
            customerName: contract.customer_name,
            daysUntilExpiry
          });
        }
      }
    }
    
    return tasksCreated;
  } catch (error) {
    console.error('Error generating renewal tasks:', error);
    throw error;
  }
}

function getPriorityByRiskAndDays(riskLevel, daysUntilExpiry) {
  if (daysUntilExpiry <= 15 || riskLevel === 'critical') {
    return 'critical';
  }
  if (daysUntilExpiry <= 30 || riskLevel === 'high') {
    return 'high';
  }
  if (daysUntilExpiry <= 60 || riskLevel === 'medium') {
    return 'medium';
  }
  return 'low';
}

async function assignCSM() {
  const activeCSMs = await getAll(`
    SELECT id, name FROM csm_users WHERE status = 'active'
  `);
  
  if (activeCSMs.length === 0) {
    return null;
  }
  
  const csmWorkload = [];
  for (const csm of activeCSMs) {
    const taskCount = await getOne(`
      SELECT COUNT(*) as count FROM renewal_tasks 
      WHERE csm_id = ? AND status IN ('pending', 'in_progress')
    `, [csm.id]);
    csmWorkload.push({
      ...csm,
      taskCount: taskCount.count
    });
  }
  
  csmWorkload.sort((a, b) => a.taskCount - b.taskCount);
  return csmWorkload[0];
}

async function processRenewal(renewalData) {
  const {
    contractId,
    customerId,
    renewalAmount,
    discountRate = 0,
    renewalType,
    churnReason,
    notes,
    csmId,
    newEndDate
  } = renewalData;
  
  try {
    const contract = await getOne('SELECT * FROM contracts WHERE id = ?', [contractId]);
    if (!contract) {
      throw new Error('Contract not found');
    }
    
    const renewalId = uuidv4();
    
    await runQuery(`
      INSERT INTO renewal_records
      (id, contract_id, customer_id, previous_end_date, new_end_date, 
       renewal_amount, discount_rate, status, renewal_type, churn_reason, notes, csm_id, finance_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      renewalId,
      contractId,
      customerId,
      contract.end_date,
      newEndDate,
      renewalAmount,
      discountRate,
      'pending_verification',
      renewalType,
      churnReason || null,
      notes || null,
      csmId || null,
      0
    ]);
    
    return {
      id: renewalId,
      status: 'pending_verification',
      message: '续费记录已创建，等待财务确认'
    };
  } catch (error) {
    console.error('Error processing renewal:', error);
    throw error;
  }
}

async function verifyRenewal(renewalId, verified, verifiedNotes = '') {
  try {
    const renewal = await getOne('SELECT * FROM renewal_records WHERE id = ?', [renewalId]);
    if (!renewal) {
      throw new Error('Renewal record not found');
    }
    
    if (verified) {
      await runQuery(`
        UPDATE renewal_records 
        SET status = 'completed', finance_verified = 1, updated_at = ?
        WHERE id = ?
      `, [dayjs().toISOString(), renewalId]);
      
      if (renewal.new_end_date) {
        await runQuery(`
          UPDATE contracts 
          SET end_date = ?, updated_at = ?
          WHERE id = ?
        `, [renewal.new_end_date, dayjs().toISOString(), renewal.contract_id]);
      }
      
      await runQuery(`
        UPDATE renewal_tasks 
        SET status = 'completed', completed_at = ?
        WHERE contract_id = ? AND status IN ('pending', 'in_progress')
      `, [dayjs().toISOString(), renewal.contract_id]);
      
    } else {
      await runQuery(`
        UPDATE renewal_records 
        SET status = 'rejected', notes = COALESCE(notes, '') || ?
        WHERE id = ?
      `, ['\n财务驳回原因：' + verifiedNotes, renewalId]);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error verifying renewal:', error);
    throw error;
  }
}

async function recordFollowUp(followUpData) {
  const {
    customerId,
    contractId,
    renewalTaskId,
    contactType,
    content,
    outcome,
    nextStep,
    followUpDate,
    createdBy
  } = followUpData;
  
  try {
    const followUpId = uuidv4();
    
    await runQuery(`
      INSERT INTO follow_up_records
      (id, customer_id, contract_id, renewal_task_id, contact_type, content, 
       outcome, next_step, follow_up_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      followUpId,
      customerId,
      contractId || null,
      renewalTaskId || null,
      contactType,
      content,
      outcome || null,
      nextStep || null,
      followUpDate || dayjs().toISOString(),
      createdBy || null
    ]);
    
    return { id: followUpId, success: true };
  } catch (error) {
    console.error('Error recording follow up:', error);
    throw error;
  }
}

async function getRenewalCalendarData() {
  try {
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
      WHERE rt.status IN ('pending', 'in_progress')
      ORDER BY rt.due_date ASC
    `);
    
    const withGrouping = tasks.map(task => {
      const daysUntilExpiry = task.end_date 
        ? dayjs(task.end_date).diff(dayjs(), 'day') 
        : null;
      
      let timeGroup = 'other';
      if (daysUntilExpiry !== null) {
        if (daysUntilExpiry <= 30) timeGroup = '0_30';
        else if (daysUntilExpiry <= 60) timeGroup = '31_60';
        else if (daysUntilExpiry <= 90) timeGroup = '61_90';
      }
      
      return {
        ...task,
        daysUntilExpiry,
        timeGroup
      };
    });
    
    return withGrouping;
  } catch (error) {
    console.error('Error getting renewal calendar data:', error);
    throw error;
  }
}

module.exports = {
  generateRenewalTasks,
  processRenewal,
  verifyRenewal,
  recordFollowUp,
  getRenewalCalendarData,
  assignCSM
};
