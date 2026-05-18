const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { getOne, getAll, runQuery } = require('../database');

function calculateUsageScore(usageMetrics, contract) {
  if (!usageMetrics || !contract) return 50;
  
  let score = 0;
  
  const seatsUsageRate = contract.seats_count > 0 
    ? (usageMetrics.active_users || 0) / contract.seats_count 
    : 0;
  score += Math.min(seatsUsageRate * 40, 40);
  
  const loginScore = Math.min((usageMetrics.login_count_30d || 0) / 100 * 30, 30);
  score += loginScore;
  
  const adoptionScore = (usageMetrics.feature_adoption_rate || 0) * 30;
  score += adoptionScore;
  
  if (usageMetrics.last_activity_date) {
    const daysSinceLastActivity = dayjs().diff(dayjs(usageMetrics.last_activity_date), 'day');
    if (daysSinceLastActivity <= 7) {
      score += 0;
    } else if (daysSinceLastActivity <= 14) {
      score -= 10;
    } else if (daysSinceLastActivity <= 30) {
      score -= 20;
    } else {
      score -= 40;
    }
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function calculateSatisfactionScore(customerId) {
  const tickets = await getAll(`
    SELECT satisfaction_score 
    FROM tickets 
    WHERE customer_id = ? AND satisfaction_score IS NOT NULL
    LIMIT 10
  `, [customerId]);
  
  if (tickets.length === 0) return 70;
  
  const avgScore = tickets.reduce((sum, t) => sum + t.satisfaction_score, 0) / tickets.length;
  return Math.round((avgScore / 5) * 100);
}

async function calculateEngagementScore(customerId) {
  const followUps = await getAll(`
    SELECT created_at 
    FROM follow_up_records 
    WHERE customer_id = ? 
    ORDER BY created_at DESC 
    LIMIT 5
  `, [customerId]);
  
  if (followUps.length === 0) return 50;
  
  let score = 30 + (followUps.length * 14);
  
  const recentFollowUp = followUps[0];
  if (recentFollowUp && recentFollowUp.created_at) {
    const daysSinceFollowUp = dayjs().diff(dayjs(recentFollowUp.created_at), 'day');
    if (daysSinceFollowUp <= 7) {
      score += 20;
    } else if (daysSinceFollowUp <= 14) {
      score += 10;
    }
  }
  
  return Math.min(100, score);
}

function calculatePaymentScore(contract) {
  if (!contract) return 70;
  return 100;
}

function calculateOverallHealth(usageScore, satisfactionScore, engagementScore, paymentScore) {
  const weights = {
    usage: 0.35,
    satisfaction: 0.25,
    engagement: 0.20,
    payment: 0.20
  };
  
  const overall = Math.round(
    usageScore * weights.usage +
    satisfactionScore * weights.satisfaction +
    engagementScore * weights.engagement +
    paymentScore * weights.payment
  );
  
  return overall;
}

function getRiskLevel(overallScore) {
  if (overallScore >= 80) return 'low';
  if (overallScore >= 60) return 'medium';
  if (overallScore >= 40) return 'high';
  return 'critical';
}

async function calculateCustomerHealthScore(customerId, contractId = null) {
  try {
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    let contract;
    if (contractId) {
      contract = await getOne('SELECT * FROM contracts WHERE id = ?', [contractId]);
    } else {
      contract = await getOne('SELECT * FROM contracts WHERE customer_id = ? AND status = ? LIMIT 1', [customerId, 'active']);
    }
    
    const usageMetrics = await getOne(`
      SELECT * FROM usage_metrics 
      WHERE customer_id = ? 
      ORDER BY recorded_at DESC 
      LIMIT 1
    `, [customerId]);
    
    const usageScore = calculateUsageScore(usageMetrics, contract);
    const satisfactionScore = await calculateSatisfactionScore(customerId);
    const engagementScore = await calculateEngagementScore(customerId);
    const paymentScore = calculatePaymentScore(contract);
    const overallScore = calculateOverallHealth(usageScore, satisfactionScore, engagementScore, paymentScore);
    const riskLevel = getRiskLevel(overallScore);
    
    const scoreId = uuidv4();
    
    await runQuery(`
      INSERT INTO health_scores 
      (id, customer_id, contract_id, overall_score, usage_score, satisfaction_score, 
       engagement_score, payment_score, risk_level, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      scoreId,
      customerId,
      contract?.id || null,
      overallScore,
      usageScore,
      satisfactionScore,
      engagementScore,
      paymentScore,
      riskLevel,
      dayjs().toISOString()
    ]);
    
    await generateRiskAlerts(customerId, contract, overallScore, usageScore, usageMetrics);
    
    return {
      id: scoreId,
      overallScore,
      usageScore,
      satisfactionScore,
      engagementScore,
      paymentScore,
      riskLevel
    };
  } catch (error) {
    console.error('Error calculating health score:', error);
    throw error;
  }
}

async function generateRiskAlerts(customerId, contract, overallScore, usageScore, usageMetrics) {
  const existingAlerts = await getAll(`
    SELECT type FROM risk_alerts 
    WHERE customer_id = ? AND status = 'open'
  `, [customerId]);
  
  const existingTypes = new Set(existingAlerts.map(a => a.type));
  
  const alertsToCreate = [];
  
  if (usageScore < 40 && !existingTypes.has('low_usage')) {
    alertsToCreate.push({
      type: 'low_usage',
      severity: 'high',
      title: '产品使用率过低',
      description: `客户产品使用健康度得分仅为 ${usageScore} 分，需关注用户活跃度`
    });
  }
  
  if (usageMetrics && usageMetrics.last_activity_date) {
    const daysSinceActivity = dayjs().diff(dayjs(usageMetrics.last_activity_date), 'day');
    if (daysSinceActivity > 30 && !existingTypes.has('inactivity')) {
      alertsToCreate.push({
        type: 'inactivity',
        severity: 'critical',
        title: '客户长期不活跃',
        description: `客户已超过 ${daysSinceActivity} 天未登录使用产品`
      });
    }
  }
  
  if (contract && contract.end_date) {
    const daysUntilExpiry = dayjs(contract.end_date).diff(dayjs(), 'day');
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0 && !existingTypes.has('contract_expiring')) {
      alertsToCreate.push({
        type: 'contract_expiring',
        severity: daysUntilExpiry <= 15 ? 'critical' : 'high',
        title: '合同即将到期',
        description: `合同将在 ${daysUntilExpiry} 天后到期，ARR: ¥${contract.arr_amount}`
      });
    }
  }
  
  const recentTickets = await getAll(`
    SELECT COUNT(*) as count FROM tickets 
    WHERE customer_id = ? 
    AND created_at >= ?
    AND status IN ('open', 'pending')
  `, [customerId, dayjs().subtract(30, 'day').toISOString()]);
  
  if (recentTickets[0]?.count >= 3 && !existingTypes.has('high_tickets')) {
    alertsToCreate.push({
      type: 'high_tickets',
      severity: 'medium',
      title: '工单数量异常升高',
      description: `近30天新增 ${recentTickets[0].count} 个工单，需关注客户满意度`
    });
  }
  
  for (const alert of alertsToCreate) {
    await runQuery(`
      INSERT INTO risk_alerts 
      (id, customer_id, contract_id, type, severity, title, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uuidv4(),
      customerId,
      contract?.id || null,
      alert.type,
      alert.severity,
      alert.title,
      alert.description,
      'open',
      dayjs().toISOString()
    ]);
  }
}

module.exports = {
  calculateCustomerHealthScore,
  calculateUsageScore,
  calculateSatisfactionScore,
  calculateEngagementScore,
  calculatePaymentScore,
  calculateOverallHealth,
  getRiskLevel,
  generateRiskAlerts
};
