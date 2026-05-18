const express = require('express');
const { dbAll, dbGet } = require('../database/db');

const router = express.Router();

const convertToCSV = (data, columns) => {
  const header = columns.map(c => c.title).join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      let value = row[col.dataIndex] || '';
      if (typeof value === 'string' && value.includes(',')) {
        value = `"${value}"`;
      }
      return value;
    }).join(',');
  });
  return [header, ...rows].join('\n');
};

router.get('/dashboard', async (req, res) => {
  try {
    const leadStats = await dbGet(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) as new_count,
        COALESCE(SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END), 0) as assigned_count,
        COALESCE(SUM(CASE WHEN status = 'pool' THEN 1 ELSE 0 END), 0) as pool_count,
        COALESCE(SUM(CASE WHEN heat_level = 'hot' THEN 1 ELSE 0 END), 0) as hot_count,
        COALESCE(SUM(CASE WHEN heat_level = 'warm' THEN 1 ELSE 0 END), 0) as warm_count,
        COALESCE(SUM(CASE WHEN heat_level = 'cold' THEN 1 ELSE 0 END), 0) as cold_count,
        COALESCE(AVG(total_score), 0) as avg_score
      FROM leads
      WHERE is_merged = 0
    `);

    const activityStats = await dbAll(`
      SELECT 
        activity_type,
        COUNT(*) as count
      FROM activities
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY activity_type
      ORDER BY count DESC
    `);

    const topIndustries = await dbAll(`
      SELECT 
        c.industry,
        COUNT(*) as count,
        AVG(l.total_score) as avg_score
      FROM leads l
      JOIN companies c ON l.company_id = c.id
      WHERE l.is_merged = 0 AND c.industry IS NOT NULL
      GROUP BY c.industry
      ORDER BY count DESC
      LIMIT 10
    `);

    const sourceStats = await dbAll(`
      SELECT 
        source,
        COUNT(*) as count,
        AVG(total_score) as avg_score
      FROM leads
      WHERE is_merged = 0 AND source IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        leads: leadStats,
        activities: activityStats,
        top_industries: topIndustries,
        sources: sourceStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/quality', async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const qualityByScore = await dbAll(`
      SELECT 
        CASE 
          WHEN total_score >= 80 THEN 'High'
          WHEN total_score >= 50 THEN 'Medium'
          WHEN total_score >= 20 THEN 'Low'
          ELSE 'Poor'
        END as quality_band,
        COUNT(*) as count
      FROM leads
      WHERE is_merged = 0
      GROUP BY quality_band
      ORDER BY MIN(total_score) DESC
    `);

    const feedbackStats = await dbAll(`
      SELECT 
        feedback_score,
        COUNT(*) as count,
        l.heat_level
      FROM assignments a
      JOIN leads l ON a.lead_id = l.id
      WHERE a.feedback_score IS NOT NULL
      GROUP BY feedback_score, l.heat_level
      ORDER BY feedback_score DESC
    `);

    const ruleAccuracy = await dbAll(`
      SELECT 
        r.version,
        r.name,
        COUNT(*) as total_leads,
        SUM(CASE WHEN a.feedback_score >= 4 THEN 1 ELSE 0 END) as high_quality_count,
        ROUND(SUM(CASE WHEN a.feedback_score >= 4 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as accuracy_rate
      FROM leads l
      JOIN scoring_rules r ON l.scoring_version = r.version
      JOIN assignments a ON l.id = a.lead_id
      WHERE l.is_merged = 0 AND a.feedback_score IS NOT NULL
      GROUP BY r.version, r.name
      ORDER BY accuracy_rate DESC
    `);

    res.json({
      success: true,
      data: {
        quality_by_score: qualityByScore,
        feedback_stats: feedbackStats,
        rule_accuracy: ruleAccuracy
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/conversion-funnel', async (req, res) => {
  try {
    const stages = await dbAll(`
      SELECT 
        status,
        COUNT(*) as count
      FROM leads
      WHERE is_merged = 0
      GROUP BY status
    `);

    const conversions = await dbGet(`
      SELECT 
        COUNT(*) as total_with_activities,
        SUM(CASE WHEN EXISTS (SELECT 1 FROM activities WHERE lead_id = l.id AND activity_type = 'page_view') THEN 1 ELSE 0 END) as viewed,
        SUM(CASE WHEN EXISTS (SELECT 1 FROM activities WHERE lead_id = l.id AND activity_type = 'download') THEN 1 ELSE 0 END) as downloaded,
        SUM(CASE WHEN EXISTS (SELECT 1 FROM activities WHERE lead_id = l.id AND activity_type = 'webinar') THEN 1 ELSE 0 END) as webinar,
        SUM(CASE WHEN EXISTS (SELECT 1 FROM activities WHERE lead_id = l.id AND activity_type = 'conversion') THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN l.status = 'assigned' THEN 1 ELSE 0 END) as assigned
      FROM leads l
      WHERE l.is_merged = 0
    `);

    res.json({
      success: true,
      data: {
        stages,
        conversions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/import-history', async (req, res) => {
  try {
    const batches = await dbAll(`
      SELECT * FROM import_batches
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: batches.map(b => ({
        ...b,
        errors: JSON.parse(b.errors || '[]')
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/export/leads', async (req, res) => {
  try {
    const { status, region, industry, min_score, max_score } = req.query;
    
    let query = `
      SELECT 
        l.id,
        l.email,
        l.name,
        l.phone,
        l.job_title,
        l.job_level,
        l.department,
        l.region,
        l.source,
        l.status,
        l.total_score,
        l.profile_score,
        l.behavior_score,
        l.heat_level,
        l.priority,
        l.created_at,
        c.name as company_name,
        c.industry,
        c.size as company_size,
        s.name as assigned_sales_name
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
    if (min_score) {
      query += ' AND l.total_score >= ?';
      params.push(parseInt(min_score));
    }
    if (max_score) {
      query += ' AND l.total_score <= ?';
      params.push(parseInt(max_score));
    }

    query += ' ORDER BY l.priority DESC, l.total_score DESC, l.created_at DESC';

    const leads = await dbAll(query, params);

    const columns = [
      { title: 'ID', dataIndex: 'id' },
      { title: '邮箱', dataIndex: 'email' },
      { title: '姓名', dataIndex: 'name' },
      { title: '电话', dataIndex: 'phone' },
      { title: '职位', dataIndex: 'job_title' },
      { title: '级别', dataIndex: 'job_level' },
      { title: '部门', dataIndex: 'department' },
      { title: '区域', dataIndex: 'region' },
      { title: '来源', dataIndex: 'source' },
      { title: '状态', dataIndex: 'status' },
      { title: '总分', dataIndex: 'total_score' },
      { title: '画像分', dataIndex: 'profile_score' },
      { title: '行为分', dataIndex: 'behavior_score' },
      { title: '热度', dataIndex: 'heat_level' },
      { title: '优先级', dataIndex: 'priority' },
      { title: '公司', dataIndex: 'company_name' },
      { title: '行业', dataIndex: 'industry' },
      { title: '公司规模', dataIndex: 'company_size' },
      { title: '分配销售', dataIndex: 'assigned_sales_name' },
      { title: '创建时间', dataIndex: 'created_at' }
    ];

    const csv = convertToCSV(leads, columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads_report_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/export/sales', async (req, res) => {
  try {
    const sales = await dbAll(`
      SELECT 
        s.id,
        s.name,
        s.email,
        s.phone,
        s.max_capacity,
        s.current_load,
        s.is_active,
        COUNT(DISTINCT l.id) as assigned_leads_count,
        COUNT(DISTINCT CASE WHEN l.heat_level = 'hot' THEN l.id END) as hot_leads_count,
        AVG(l.total_score) as avg_lead_score
      FROM sales_reps s
      LEFT JOIN leads l ON s.id = l.assigned_sales_id AND l.is_merged = 0
      GROUP BY s.id
      ORDER BY s.name
    `);

    const columns = [
      { title: 'ID', dataIndex: 'id' },
      { title: '姓名', dataIndex: 'name' },
      { title: '邮箱', dataIndex: 'email' },
      { title: '电话', dataIndex: 'phone' },
      { title: '最大容量', dataIndex: 'max_capacity' },
      { title: '当前负载', dataIndex: 'current_load' },
      { title: '状态', dataIndex: 'is_active' },
      { title: '分配线索数', dataIndex: 'assigned_leads_count' },
      { title: '高价值线索数', dataIndex: 'hot_leads_count' },
      { title: '平均线索分', dataIndex: 'avg_lead_score' }
    ];

    const csv = convertToCSV(sales, columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sales_report_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/export/full', async (req, res) => {
  try {
    const leadStats = await dbGet(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_leads,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_leads,
        SUM(CASE WHEN heat_level = 'hot' THEN 1 ELSE 0 END) as hot_leads,
        SUM(CASE WHEN heat_level = 'warm' THEN 1 ELSE 0 END) as warm_leads,
        SUM(CASE WHEN heat_level = 'cold' THEN 1 ELSE 0 END) as cold_leads,
        AVG(total_score) as avg_score
      FROM leads
      WHERE is_merged = 0
    `);

    const industryStats = await dbAll(`
      SELECT 
        c.industry,
        COUNT(*) as count,
        AVG(l.total_score) as avg_score
      FROM leads l
      JOIN companies c ON l.company_id = c.id
      WHERE l.is_merged = 0 AND c.industry IS NOT NULL
      GROUP BY c.industry
      ORDER BY count DESC
    `);

    const sourceStats = await dbAll(`
      SELECT 
        source,
        COUNT(*) as count,
        AVG(total_score) as avg_score
      FROM leads
      WHERE is_merged = 0 AND source IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
    `);

    const summaryData = [
      { metric: '总线索数', value: leadStats.total_leads || 0 },
      { metric: '新线索', value: leadStats.new_leads || 0 },
      { metric: '已分配', value: leadStats.assigned_leads || 0 },
      { metric: '高热度', value: leadStats.hot_leads || 0 },
      { metric: '中热度', value: leadStats.warm_leads || 0 },
      { metric: '低热度', value: leadStats.cold_leads || 0 },
      { metric: '平均分数', value: (leadStats.avg_score || 0).toFixed(2) }
    ];

    const summaryCSV = convertToCSV(summaryData, [
      { title: '指标', dataIndex: 'metric' },
      { title: '数值', dataIndex: 'value' }
    ]);

    const industryCSV = convertToCSV(industryStats, [
      { title: '行业', dataIndex: 'industry' },
      { title: '数量', dataIndex: 'count' },
      { title: '平均分', dataIndex: 'avg_score' }
    ]);

    const sourceCSV = convertToCSV(sourceStats, [
      { title: '来源', dataIndex: 'source' },
      { title: '数量', dataIndex: 'count' },
      { title: '平均分', dataIndex: 'avg_score' }
    ]);

    const fullCSV = `=== 报表概览 ===\n${summaryCSV}\n\n=== 行业分布 ===\n${industryCSV}\n\n=== 来源分布 ===\n${sourceCSV}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="full_report_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + fullCSV);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
