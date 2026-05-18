const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { getOne, getAll, runQuery } = require('../database');
const healthScoreService = require('../services/healthScoreService');

async function getCustomers(req, res) {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }
    
    const offset = (page - 1) * pageSize;
    
    const customers = await getAll(`
      SELECT 
        c.*,
        hs.overall_score as health_score,
        hs.risk_level,
        ct.contract_no,
        ct.subscription_version,
        ct.seats_count,
        ct.arr_amount,
        ct.end_date
      FROM customers c
      LEFT JOIN health_scores hs ON hs.customer_id = c.id
      LEFT JOIN contracts ct ON ct.customer_id = c.id AND ct.status = 'active'
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(pageSize), offset]);
    
    const totalResult = await getOne(`
      SELECT COUNT(DISTINCT c.id) as count 
      FROM customers c
      LEFT JOIN health_scores hs ON hs.customer_id = c.id
      ${whereClause}
    `, params);
    
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

async function getCustomerDetail(req, res) {
  try {
    const { id } = req.params;
    
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    const contracts = await getAll(`
      SELECT * FROM contracts 
      WHERE customer_id = ? 
      ORDER BY created_at DESC
    `, [id]);
    
    const healthScores = await getAll(`
      SELECT * FROM health_scores 
      WHERE customer_id = ? 
      ORDER BY calculated_at DESC 
      LIMIT 10
    `, [id]);
    
    const usageMetrics = await getOne(`
      SELECT * FROM usage_metrics 
      WHERE customer_id = ? 
      ORDER BY recorded_at DESC 
      LIMIT 1
    `, [id]);
    
    const tickets = await getAll(`
      SELECT * FROM tickets 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [id]);
    
    const renewalRecords = await getAll(`
      SELECT * FROM renewal_records 
      WHERE customer_id = ? 
      ORDER BY created_at DESC
    `, [id]);
    
    const followUpRecords = await getAll(`
      SELECT * FROM follow_up_records 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [id]);
    
    const riskAlerts = await getAll(`
      SELECT * FROM risk_alerts 
      WHERE customer_id = ? 
      ORDER BY created_at DESC
    `, [id]);
    
    res.json({
      success: true,
      data: {
        customer,
        contracts,
        healthScores,
        usageMetrics,
        tickets,
        renewalRecords,
        followUpRecords,
        riskAlerts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function createCustomer(req, res) {
  try {
    const {
      name,
      industry,
      contactName,
      contactEmail,
      contactPhone,
      address
    } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }
    
    const customerId = uuidv4();
    
    await runQuery(`
      INSERT INTO customers
      (id, name, industry, contact_name, contact_email, contact_phone, address, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customerId,
      name,
      industry || null,
      contactName || null,
      contactEmail || null,
      contactPhone || null,
      address || null,
      'active',
      dayjs().toISOString()
    ]);
    
    res.json({
      success: true,
      data: { id: customerId },
      message: 'Customer created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    const allowedFields = ['name', 'industry', 'contact_name', 'contact_email', 'contact_phone', 'address', 'status'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(dayjs().toISOString());
      values.push(id);
      
      await runQuery(`
        UPDATE customers 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `, values);
    }
    
    res.json({
      success: true,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function calculateHealthScore(req, res) {
  try {
    const { id } = req.params;
    
    const result = await healthScoreService.calculateCustomerHealthScore(id);
    
    res.json({
      success: true,
      data: result,
      message: 'Health score calculated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;
    
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    await runQuery('UPDATE customers SET status = ?, updated_at = ? WHERE id = ?', ['inactive', dayjs().toISOString(), id]);
    
    res.json({
      success: true,
      message: 'Customer deleted (soft deleted) successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getCustomers,
  getCustomerDetail,
  createCustomer,
  updateCustomer,
  calculateHealthScore,
  deleteCustomer
};
