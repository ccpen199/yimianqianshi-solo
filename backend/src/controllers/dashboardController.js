const { getAll, getOne } = require('../database');
const dayjs = require('dayjs');

async function getDashboardStats(req, res) {
  try {
    const totalCustomers = await getOne('SELECT COUNT(*) as count FROM customers WHERE status = ?', ['active']);
    const totalContracts = await getOne('SELECT COUNT(*) as count FROM contracts WHERE status = ?', ['active']);
    const totalARR = await getOne('SELECT SUM(arr_amount) as total FROM contracts WHERE status = ?', ['active']);
    const pendingRenewals = await getOne('SELECT COUNT(*) as count FROM renewal_tasks WHERE status IN (?, ?)', ['pending', 'in_progress']);
    const openRiskAlerts = await getOne('SELECT COUNT(*) as count FROM risk_alerts WHERE status = ?', ['open']);
    const criticalRisks = await getOne('SELECT COUNT(*) as count FROM risk_alerts WHERE status = ? AND severity = ?', ['open', 'critical']);
    const pendingVerification = await getOne('SELECT COUNT(*) as count FROM renewal_records WHERE status = ?', ['pending_verification']);
    
    const expiring30Days = await getOne(`
      SELECT COUNT(*) as count, SUM(arr_amount) as arr 
      FROM contracts 
      WHERE status = ? 
      AND end_date >= ? 
      AND end_date <= ?
    `, ['active', dayjs().toISOString(), dayjs().add(30, 'day').toISOString()]);
    
    const expiring60Days = await getOne(`
      SELECT COUNT(*) as count, SUM(arr_amount) as arr 
      FROM contracts 
      WHERE status = ? 
      AND end_date > ? 
      AND end_date <= ?
    `, ['active', dayjs().add(30, 'day').toISOString(), dayjs().add(60, 'day').toISOString()]);
    
    const expiring90Days = await getOne(`
      SELECT COUNT(*) as count, SUM(arr_amount) as arr 
      FROM contracts 
      WHERE status = ? 
      AND end_date > ? 
      AND end_date <= ?
    `, ['active', dayjs().add(60, 'day').toISOString(), dayjs().add(90, 'day').toISOString()]);
    
    const healthDistribution = await getAll(`
      SELECT 
        risk_level,
        COUNT(*) as count
      FROM (
        SELECT DISTINCT c.id, COALESCE(hs.risk_level, 'medium') as risk_level
        FROM customers c
        LEFT JOIN health_scores hs ON hs.customer_id = c.id
        WHERE c.status = 'active'
      ) sub
      GROUP BY risk_level
    `);
    
    const riskTypeDistribution = await getAll(`
      SELECT 
        type,
        COUNT(*) as count
      FROM risk_alerts
      WHERE status = 'open'
      GROUP BY type
      ORDER BY count DESC
    `);
    
    const recentRenewals = await getAll(`
      SELECT 
        rr.*,
        c.name as customer_name,
        ct.contract_no
      FROM renewal_records rr
      JOIN customers c ON rr.customer_id = c.id
      LEFT JOIN contracts ct ON rr.contract_id = ct.id
      ORDER BY rr.created_at DESC
      LIMIT 10
    `);
    
    const topRiskCustomers = await getAll(`
      SELECT 
        c.id,
        c.name,
        hs.overall_score as health_score,
        hs.risk_level,
        COUNT(ra.id) as alert_count
      FROM customers c
      LEFT JOIN health_scores hs ON hs.customer_id = c.id
      LEFT JOIN risk_alerts ra ON ra.customer_id = c.id AND ra.status = 'open'
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY 
        CASE COALESCE(hs.risk_level, 'medium')
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        alert_count DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalCustomers: totalCustomers?.count || 0,
          totalContracts: totalContracts?.count || 0,
          totalARR: totalARR?.total || 0,
          pendingRenewals: pendingRenewals?.count || 0,
          openRiskAlerts: openRiskAlerts?.count || 0,
          criticalRisks: criticalRisks?.count || 0,
          pendingVerification: pendingVerification?.count || 0
        },
        expiringByPeriod: {
          '0_30_days': { count: expiring30Days?.count || 0, arr: expiring30Days?.arr || 0 },
          '31_60_days': { count: expiring60Days?.count || 0, arr: expiring60Days?.arr || 0 },
          '61_90_days': { count: expiring90Days?.count || 0, arr: expiring90Days?.arr || 0 }
        },
        healthDistribution: healthDistribution.reduce((acc, item) => {
          acc[item.risk_level] = item.count;
          return acc;
        }, {}),
        riskTypeDistribution,
        recentRenewals,
        topRiskCustomers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function getHighRiskCustomers(req, res) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const customers = await getAll(`
      SELECT 
        c.*,
        hs.overall_score as health_score,
        hs.risk_level,
        ct.contract_no,
        ct.arr_amount,
        ct.end_date,
        COUNT(ra.id) as alert_count
      FROM customers c
      LEFT JOIN health_scores hs ON hs.customer_id = c.id
      LEFT JOIN contracts ct ON ct.customer_id = c.id AND ct.status = 'active'
      LEFT JOIN risk_alerts ra ON ra.customer_id = c.id AND ra.status = 'open'
      WHERE c.status = 'active'
      AND hs.risk_level IN ('critical', 'high')
      GROUP BY c.id
      ORDER BY 
        CASE hs.risk_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
        END,
        alert_count DESC
      LIMIT ? OFFSET ?
    `, [parseInt(pageSize), offset]);
    
    const totalResult = await getOne(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM customers c
      LEFT JOIN health_scores hs ON hs.customer_id = c.id
      WHERE c.status = 'active'
      AND hs.risk_level IN ('critical', 'high')
    `);
    
    res.json({
      success: true,
      data: customers,
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

async function getChurnedCustomers(req, res) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const churned = await getAll(`
      SELECT 
        c.*,
        rr.churn_reason,
        rr.renewal_amount as last_arr,
        ct.end_date as churn_date
      FROM customers c
      LEFT JOIN renewal_records rr ON rr.customer_id = c.id
      LEFT JOIN contracts ct ON ct.customer_id = c.id
      WHERE c.status = 'inactive'
      GROUP BY c.id
      ORDER BY rr.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(pageSize), offset]);
    
    const totalResult = await getOne(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM customers c
      WHERE c.status = 'inactive'
    `);
    
    res.json({
      success: true,
      data: churned,
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

async function getUpsellOpportunities(req, res) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const opportunities = await getAll(`
      SELECT 
        c.*,
        ct.contract_no,
        ct.arr_amount,
        ct.seats_count,
        ct.subscription_version,
        ct.end_date,
        hs.overall_score as health_score,
        hs.risk_level
      FROM customers c
      LEFT JOIN contracts ct ON ct.customer_id = c.id AND ct.status = 'active'
      LEFT JOIN health_scores hs ON hs.customer_id = c.id
      WHERE c.status = 'active'
      AND hs.risk_level IN ('low', 'medium')
      AND ct.arr_amount > 0
      ORDER BY ct.arr_amount DESC
      LIMIT ? OFFSET ?
    `, [parseInt(pageSize), offset]);
    
    const totalResult = await getOne(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM customers c
      LEFT JOIN contracts ct ON ct.customer_id = c.id AND ct.status = 'active'
      LEFT JOIN health_scores hs ON hs.customer_id = c.id
      WHERE c.status = 'active'
      AND hs.risk_level IN ('low', 'medium')
      AND ct.arr_amount > 0
    `);
    
    res.json({
      success: true,
      data: opportunities,
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

module.exports = {
  getDashboardStats,
  getHighRiskCustomers,
  getChurnedCustomers,
  getUpsellOpportunities
};
