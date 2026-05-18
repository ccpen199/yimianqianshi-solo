const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const db = require('../database');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

router.get('/batches', (req, res) => {
  try {
    db.all('SELECT * FROM text_batches ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, data: rows });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/import', upload.single('file'), (req, res) => {
  try {
    const { source, language } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ success: false, message: '请选择文件' });
    }

    const batchNo = 'BATCH-' + Date.now();
    const results = [];

    if (file.originalname.endsWith('.csv')) {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => processImport(results, batchNo, source, language, file.path, res));
    } else if (file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      processImport(data, batchNo, source, language, file.path, res);
    } else {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: '不支持的文件格式，请上传CSV或Excel文件' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function processImport(data, batchNo, source, language, filePath, res) {
  const batchId = null;
  let successCount = 0;
  let failedCount = 0;

  db.run(
    'INSERT INTO text_batches (batch_no, source, language, total_count) VALUES (?, ?, ?, ?)',
    [batchNo, source || 'import', language || 'zh-CN', data.length],
    function(err) {
      if (err) {
        fs.unlinkSync(filePath);
        return res.status(500).json({ success: false, message: err.message });
      }
      
      const batchId = this.lastID;
      const stmt = db.prepare(`INSERT INTO text_samples 
        (batch_id, content, source, language, has_sensitive_word, clean_status, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);

      let pending = data.length;
      
      data.forEach((row) => {
        const content = row.content || row.text || row.文本 || '';
        
        if (!content || content.trim().length === 0) {
          failedCount++;
          pending--;
          checkComplete();
          return;
        }

        const hasSensitiveWord = /敏感|色情|暴力|赌博/.test(content) ? 1 : 0;
        const cleanStatus = hasSensitiveWord ? 'abnormal' : 'raw';
        const status = hasSensitiveWord ? 'pending' : 'pending';

        stmt.run([batchId, content.trim(), source || 'import', language || 'zh-CN', hasSensitiveWord, cleanStatus, status], function(err) {
          if (err) {
            failedCount++;
          } else {
            successCount++;
          }
          pending--;
          checkComplete();
        });
      });

      function checkComplete() {
        if (pending === 0) {
          stmt.finalize();
          db.run(
            'UPDATE text_batches SET success_count = ?, failed_count = ?, status = ? WHERE id = ?',
            [successCount, failedCount, 'completed', batchId],
            () => {
              fs.unlinkSync(filePath);
              res.json({
                success: true,
                data: { batch_no: batchNo, success_count: successCount, failed_count: failedCount },
                message: '导入完成'
              });
            }
          );
        }
      }
    }
  );
}

router.get('/samples', (req, res) => {
  try {
    const { batch_id, status, clean_status, page = 1, page_size = 20 } = req.query;
    let sql = 'SELECT * FROM text_samples WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM text_samples WHERE 1=1';
    let params = [];
    let countParams = [];

    if (batch_id) {
      sql += ' AND batch_id = ?';
      countSql += ' AND batch_id = ?';
      params.push(batch_id);
      countParams.push(batch_id);
    }
    if (status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }
    if (clean_status) {
      sql += ' AND clean_status = ?';
      countSql += ' AND clean_status = ?';
      params.push(clean_status);
      countParams.push(clean_status);
    }

    sql += ' ORDER BY id ASC LIMIT ? OFFSET ?';
    params.push(parseInt(page_size), (parseInt(page) - 1) * parseInt(page_size));

    db.get(countSql, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        res.json({
          success: true,
          data: {
            list: rows,
            total: countResult.total,
            page: parseInt(page),
            page_size: parseInt(page_size)
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/samples/next', (req, res) => {
  try {
    const { current_id, status } = req.query;
    let sql = 'SELECT * FROM text_samples WHERE id > ?';
    let params = [current_id || 0];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY id ASC LIMIT 1';

    db.get(sql, params, (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, data: row || null });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/samples/prev', (req, res) => {
  try {
    const { current_id, status } = req.query;
    let sql = 'SELECT * FROM text_samples WHERE id < ?';
    let params = [current_id || 999999999];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY id DESC LIMIT 1';

    db.get(sql, params, (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, data: row || null });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/samples/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    db.get('SELECT * FROM text_samples WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      if (!row) {
        return res.status(404).json({ success: false, message: '样本不存在' });
      }
      res.json({ success: true, data: row });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
