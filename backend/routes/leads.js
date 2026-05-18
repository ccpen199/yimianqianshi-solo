const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { getOne, getAll, runQuery } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const validatePhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

router.post('/import', authenticateToken, requireRole('supervisor', 'admin'), upload.single('file'), async (req, res) => {
  try {
    const { source } = req.body;
    if (!source) {
      return res.status(400).json({ success: false, message: '请提供线索来源' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: '文件中没有数据' });
    }

    const importLog = await runQuery(
      'INSERT INTO lead_import_logs (file_name, total_count, created_by) VALUES (?, ?, ?)',
      [req.file.originalname, rows.length, req.user.id]
    );
    const importLogId = importLog.lastID;

    let successCount = 0;
    let duplicateCount = 0;
    let blacklistCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;
      const { name, phone, email, region, product, customer_level } = row;
      const cleanPhone = phone ? phone.toString().replace(/\s/g, '') : '';

      if (!name || !cleanPhone) {
        errorCount++;
        errors.push({ importLogId, rowNumber, phone: cleanPhone, errorType: 'missing_field', errorMessage: '姓名和手机号不能为空', rowData: JSON.stringify(row) });
        continue;
      }

      if (!validatePhone(cleanPhone)) {
        errorCount++;
        errors.push({ importLogId, rowNumber, phone: cleanPhone, errorType: 'invalid_phone', errorMessage: '手机号格式不正确', rowData: JSON.stringify(row) });
        continue;
      }

      const blacklisted = await getOne('SELECT id FROM blacklist WHERE phone = ?', [cleanPhone]);
      if (blacklisted) {
        blacklistCount++;
        errors.push({ importLogId, rowNumber, phone: cleanPhone, errorType: 'blacklisted', errorMessage: '号码在黑名单中', rowData: JSON.stringify(row) });
        continue;
      }

      const existing = await getOne('SELECT id FROM leads WHERE phone = ?', [cleanPhone]);
      if (existing) {
        duplicateCount++;
        errors.push({ importLogId, rowNumber, phone: cleanPhone, errorType: 'duplicate', errorMessage: '手机号已存在', rowData: JSON.stringify(row) });
        continue;
      }

      try {
        await runQuery(
          `INSERT INTO leads (name, phone, email, region, product, customer_level, source) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [name, cleanPhone, email || '', region || '', product || '', customer_level || null, source]
        );
        successCount++;
      } catch (dbError) {
        errorCount++;
        errors.push({ importLogId, rowNumber, phone: cleanPhone, errorType: 'database_error', errorMessage: dbError.message, rowData: JSON.stringify(row) });
      }
    }

    for (const error of errors) {
      await runQuery(
        'INSERT INTO lead_import_errors (import_log_id, row_number, phone, error_type, error_message, row_data) VALUES (?, ?, ?, ?, ?, ?)',
        [error.importLogId, error.rowNumber, error.phone, error.errorType, error.errorMessage, error.rowData]
      );
    }

    await runQuery(
      'UPDATE lead_import_logs SET success_count = ?, duplicate_count = ?, blacklist_count = ?, error_count = ? WHERE id = ?',
      [successCount, duplicateCount, blacklistCount, errorCount, importLogId]
    );

    res.json({
      success: true,
      data: {
        importLogId,
        total: rows.length,
        success: successCount,
        duplicate: duplicateCount,
        blacklist: blacklistCount,
        error: errorCount
      },
      message: '导入完成'
    });
  } catch (error) {
    console.error('导入线索错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, region, product, assigned_to, keyword } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT l.*, u.name as agent_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (region) {
      query += ' AND l.region = ?';
      params.push(region);
    }
    if (product) {
      query += ' AND l.product = ?';
      params.push(product);
    }
    if (assigned_to) {
      query += ' AND l.assigned_to = ?';
      params.push(assigned_to);
    }
    if (keyword) {
      query += ' AND (l.name LIKE ? OR l.phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const leads = await getAll(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM leads l WHERE 1=1';
    const countParams = params.slice(0, -2);
    const countResult = await getOne(countQuery, countParams);

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total
        }
      },
      message: '获取成功'
    });
  } catch (error) {
    console.error('获取线索列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await getOne('SELECT l.*, u.name as agent_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = ?', [req.params.id]);
    
    if (!lead) {
      return res.status(404).json({ success: false, message: '线索不存在' });
    }

    const callRecords = await getAll('SELECT cr.*, u.name as agent_name FROM call_records cr LEFT JOIN users u ON cr.agent_id = u.id WHERE cr.lead_id = ? ORDER BY cr.created_at DESC', [req.params.id]);

    res.json({
      success: true,
      data: { ...lead, callRecords },
      message: '获取成功'
    });
  } catch (error) {
    console.error('获取线索详情错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/import/:id/errors', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
  try {
    const errors = await getAll('SELECT * FROM lead_import_errors WHERE import_log_id = ? ORDER BY row_number', [req.params.id]);
    res.json({ success: true, data: errors, message: '获取成功' });
  } catch (error) {
    console.error('获取导入错误列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/import/logs', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
  try {
    const logs = await getAll(`
      SELECT lil.*, u.name as created_by_name 
      FROM lead_import_logs lil 
      LEFT JOIN users u ON lil.created_by = u.id 
      ORDER BY lil.created_at DESC 
      LIMIT 20
    `);
    res.json({ success: true, data: logs, message: '获取成功' });
  } catch (error) {
    console.error('获取导入日志错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
