const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const scoringEngine = require('../services/scoringEngine');
const assignmentService = require('../services/assignmentService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sanitizeString = (str, maxLength = 255) => {
  if (!str) return null;
  const trimmed = str.trim().substring(0, maxLength);
  return trimmed || null;
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

router.get('/', async (req, res) => {
  try {
    const { status, region, industry, heat_level, min_score, max_score, page = 1, limit = 20 } = req.query;
    
    let query = `
      SELECT l.*, c.name as company_name, c.industry, c.size, s.name as assigned_sales_name
      FROM leads l
      LEFT JOIN companies c ON l.company_id = c.id
      LEFT JOIN sales_reps s ON l.assigned_sales_id = s.id
      WHERE l.is_merged = 0
    `;
    const params = [];

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (region) {
      query += ' AND (l.region = ? OR c.region = ?)';
      params.push(region, region);
    }
    if (industry) {
      query += ' AND c.industry = ?';
      params.push(industry);
    }
    if (heat_level) {
      query += ' AND l.heat_level = ?';
      params.push(heat_level);
    }
    if (min_score) {
      query += ' AND l.total_score >= ?';
      params.push(parseInt(min_score));
    }
    if (max_score) {
      query += ' AND l.total_score <= ?';
      params.push(parseInt(max_score));
    }

    query += ' ORDER BY l.priority DESC, l.total_score DESC, l.created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const leads = await dbAll(query, params);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM leads l
      LEFT JOIN companies c ON l.company_id = c.id
      WHERE l.is_merged = 0
    `;
    const { total } = await dbGet(countQuery);

    res.json({
      success: true,
      data: leads.map(lead => ({
        ...lead,
        scoring_details: lead.scoring_details ? JSON.parse(lead.scoring_details) : []
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lead = await dbGet(`
      SELECT l.*, c.name as company_name, c.industry, c.size, c.domain, c.revenue,
             s.name as assigned_sales_name, s.email as assigned_sales_email
      FROM leads l
      LEFT JOIN companies c ON l.company_id = c.id
      LEFT JOIN sales_reps s ON l.assigned_sales_id = s.id
      WHERE l.id = ?
    `, [req.params.id]);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const activities = await dbAll(`
      SELECT * FROM activities 
      WHERE lead_id = ? 
      ORDER BY created_at DESC
    `, [req.params.id]);

    const assignments = await dbAll(`
      SELECT a.*, s.name as sales_name
      FROM assignments a
      JOIN sales_reps s ON a.sales_id = s.id
      WHERE a.lead_id = ?
      ORDER BY a.assigned_at DESC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...lead,
        scoring_details: lead.scoring_details ? JSON.parse(lead.scoring_details) : [],
        activities,
        assignments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', [
  body('email').isEmail().normalizeEmail(),
  body('name').optional(),
  body('phone').optional(),
  body('job_title').optional(),
  body('job_level').optional(),
  body('department').optional(),
  body('location').optional(),
  body('region').optional(),
  body('source').optional(),
  body('utm_source').optional(),
  body('utm_medium').optional(),
  body('utm_campaign').optional(),
  body('company_name').optional(),
  body('company_domain').optional(),
  body('industry').optional(),
  body('size').optional(),
], validate, async (req, res) => {
  try {
    const { company_name, company_domain, industry, size, ...leadData } = req.body;

    let companyId = null;
    if (company_domain) {
      let company = await dbGet('SELECT * FROM companies WHERE domain = ?', [company_domain]);
      
      if (!company) {
        const result = await dbRun(`
          INSERT INTO companies (name, domain, industry, size)
          VALUES (?, ?, ?, ?)
        `, [company_name || 'Unknown', company_domain, industry, size]);
        companyId = result.lastID;
      } else {
        companyId = company.id;
      }
    }

    const leadUuid = uuidv4();
    const result = await dbRun(`
      INSERT INTO leads (uuid, company_id, email, name, phone, job_title, job_level, 
                         department, location, region, source, utm_source, utm_medium, 
                         utm_campaign, utm_term, utm_content, form_data, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      leadUuid,
      companyId,
      leadData.email,
      leadData.name,
      leadData.phone,
      leadData.job_title,
      leadData.job_level,
      leadData.department,
      leadData.location,
      leadData.region,
      leadData.source || 'manual',
      leadData.utm_source,
      leadData.utm_medium,
      leadData.utm_campaign,
      leadData.utm_term,
      leadData.utm_content,
      leadData.form_data ? JSON.stringify(leadData.form_data) : null,
      'new'
    ]);

    const leadId = result.lastID;
    const scoreResult = await scoringEngine.scoreLead(leadId);

    res.status(201).json({
      success: true,
      data: {
        id: leadId,
        uuid: leadUuid,
        ...scoreResult
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', [
  body('email').optional().isEmail().normalizeEmail(),
], validate, async (req, res) => {
  try {
    const lead = await dbGet('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const { company_name, company_domain, industry, size, ...leadData } = req.body;

    if (company_domain) {
      let company = await dbGet('SELECT * FROM companies WHERE domain = ?', [company_domain]);
      
      if (!company) {
        const result = await dbRun(`
          INSERT INTO companies (name, domain, industry, size)
          VALUES (?, ?, ?, ?)
        `, [company_name || 'Unknown', company_domain, industry, size]);
        leadData.company_id = result.lastID;
      } else {
        leadData.company_id = company.id;
      }
    }

    const updateFields = Object.keys(leadData)
      .filter(k => leadData[k] !== undefined)
      .map(k => `${k} = ?`)
      .join(', ');

    if (updateFields) {
      const values = Object.keys(leadData)
        .filter(k => leadData[k] !== undefined)
        .map(k => leadData[k]);
      
      await dbRun(`UPDATE leads SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, req.params.id]);

      await scoringEngine.scoreLead(req.params.id);
    }

    res.json({ success: true, message: 'Lead updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/activities', async (req, res) => {
  try {
    const { activity_type, activity_title, activity_data, page_url, referrer, ip_address } = req.body;
    
    await dbRun(`
      INSERT INTO activities (lead_id, activity_type, activity_title, activity_data, 
                              page_url, referrer, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.params.id,
      activity_type,
      activity_title,
      activity_data ? JSON.stringify(activity_data) : null,
      page_url,
      referrer,
      ip_address,
      req.headers['user-agent']
    ]);

    await scoringEngine.scoreLead(req.params.id);

    res.json({ success: true, message: 'Activity recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/score', async (req, res) => {
  try {
    const result = await scoringEngine.scoreLead(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/rescore-all', async (req, res) => {
  try {
    const results = await scoringEngine.recalculateAll();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/merge', async (req, res) => {
  try {
    const { lead_ids, target_lead_id } = req.body;
    
    if (!lead_ids || lead_ids.length < 2 || !target_lead_id) {
      return res.status(400).json({ 
        success: false, 
        error: '需要至少2个线索ID和一个目标线索ID' 
      });
    }

    const sourceLeads = lead_ids.filter(id => id !== target_lead_id);
    
    for (const sourceId of sourceLeads) {
      const activities = await dbAll('SELECT * FROM activities WHERE lead_id = ?', [sourceId]);
      
      for (const activity of activities) {
        await dbRun(`
          INSERT INTO activities (lead_id, activity_type, activity_title, activity_data, 
                                  page_url, referrer, ip_address, user_agent, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          target_lead_id,
          activity.activity_type,
          activity.activity_title,
          activity.activity_data,
          activity.page_url,
          activity.referrer,
          activity.ip_address,
          activity.user_agent,
          activity.created_at
        ]);
      }

      await dbRun(`
        UPDATE leads 
        SET is_merged = 1, merged_to_lead_id = ?, status = 'merged', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [target_lead_id, sourceId]);
    }

    await scoringEngine.scoreLead(target_lead_id);

    res.json({ 
      success: true, 
      message: `成功合并 ${sourceLeads.length} 个线索到目标线索` 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/import', async (req, res) => {
  const { leads, batch_name } = req.body;
  const batchUuid = uuidv4();
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要导入的线索数据'
      });
    }

    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i];
      
      try {
        if (!leadData.email || !validateEmail(leadData.email)) {
          throw new Error('邮箱格式不正确');
        }

        const sanitizedEmail = leadData.email.toLowerCase().trim();
        const existingLead = await dbGet('SELECT id FROM leads WHERE email = ? AND is_merged = 0', [sanitizedEmail]);
        if (existingLead) {
          throw new Error('该邮箱已存在');
        }

        let companyId = null;
        const sanitizedCompanyDomain = sanitizeString(leadData.company_domain, 100);
        if (sanitizedCompanyDomain) {
          let company = await dbGet('SELECT * FROM companies WHERE domain = ?', [sanitizedCompanyDomain]);
          
          if (!company) {
            const result = await dbRun(`
              INSERT INTO companies (name, domain, industry, size)
              VALUES (?, ?, ?, ?)
            `, [
              sanitizeString(leadData.company_name, 100) || 'Unknown',
              sanitizedCompanyDomain,
              sanitizeString(leadData.industry, 50),
              sanitizeString(leadData.size, 50)
            ]);
            companyId = result.lastID;
          } else {
            companyId = company.id;
          }
        }

        const leadUuid = uuidv4();
        const result = await dbRun(`
          INSERT INTO leads (uuid, company_id, email, name, phone, job_title, job_level, 
                             department, location, region, source, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          leadUuid,
          companyId,
          sanitizedEmail,
          sanitizeString(leadData.name, 100),
          sanitizeString(leadData.phone, 50),
          sanitizeString(leadData.job_title, 100),
          sanitizeString(leadData.job_level, 50),
          sanitizeString(leadData.department, 50),
          sanitizeString(leadData.location, 100),
          sanitizeString(leadData.region, 50),
          sanitizeString(leadData.source, 50) || 'import',
          'new'
        ]);

        await scoringEngine.scoreLead(result.lastID);
        successCount++;
        
        results.push({
          row: i + 1,
          success: true,
          lead_id: result.lastID,
          email: leadData.email
        });
      } catch (error) {
        errorCount++;
        errors.push({
          row: i + 1,
          email: leadData.email,
          error: error.message
        });
        results.push({
          row: i + 1,
          success: false,
          email: leadData.email,
          error: error.message
        });
      }
    }

    await dbRun(`
      INSERT INTO import_batches (batch_uuid, filename, total_count, success_count, error_count, errors, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      batchUuid,
      batch_name || 'bulk_import',
      leads.length,
      successCount,
      errorCount,
      JSON.stringify(errors),
      'completed'
    ]);

    res.json({
      success: true,
      data: {
        batch_uuid: batchUuid,
        total: leads.length,
        success_count: successCount,
        error_count: errorCount,
        errors,
        results
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/assign', async (req, res) => {
  try {
    const { sales_id, reason } = req.body;
    
    let result;
    if (sales_id) {
      result = await assignmentService.manualAssignLead(req.params.id, sales_id, reason);
    } else {
      result = await assignmentService.autoAssignLead(req.params.id);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/return', async (req, res) => {
  try {
    const { sales_id, reason, feedback } = req.body;
    const result = await assignmentService.returnLead(req.params.id, sales_id, reason, feedback);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/feedback', async (req, res) => {
  try {
    const { sales_id, score, note } = req.body;
    const result = await assignmentService.provideFeedback(req.params.id, sales_id, score, note);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const lead = await dbGet('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (lead.assigned_sales_id) {
      await dbRun(`
        UPDATE sales_reps 
        SET current_load = current_load - 1 
        WHERE id = ?
      `, [lead.assigned_sales_id]);
    }

    await dbRun('DELETE FROM leads WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
