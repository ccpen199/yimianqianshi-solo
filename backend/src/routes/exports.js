const express = require('express');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const db = require('../database');

const router = express.Router();

router.post('/', (req, res) => {
  try {
    const { task_name, version_id, sample_ids, statuses } = req.body;
    
    if (!task_name || !version_id) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    db.run(
      'INSERT INTO export_tasks (task_name, version_id, sample_ids, status) VALUES (?, ?, ?, ?)',
      [task_name, version_id, sample_ids ? JSON.stringify(sample_ids) : null, 'processing'],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        
        const exportId = this.lastID;
        
        processExport(exportId, version_id, sample_ids, statuses, task_name, res);
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function processExport(exportId, versionId, sampleIds, statuses, taskName, res) {
  let sql = `
    SELECT s.*, a.tags as annotation_tags
    FROM text_samples s
    LEFT JOIN annotations a ON s.id = a.sample_id AND a.is_draft = 0
    WHERE 1=1
  `;
  let params = [];

  if (sampleIds && sampleIds.length > 0) {
    sql += ` AND s.id IN (${sampleIds.map(() => '?').join(',')})`;
    params = params.concat(sampleIds);
  }
  if (statuses && statuses.length > 0) {
    sql += ` AND s.status IN (${statuses.map(() => '?').join(',')})`;
    params = params.concat(statuses);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      db.run('UPDATE export_tasks SET status = ? WHERE id = ?', ['failed', exportId]);
      return res.status(500).json({ success: false, message: err.message });
    }

    const exportData = rows.map(row => ({
      id: row.id,
      content: row.content,
      source: row.source,
      language: row.language,
      status: row.status,
      tags: row.annotation_tags ? JSON.parse(row.annotation_tags).join(', ') : ''
    }));

    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `${taskName}_${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '数据');
    xlsx.writeFile(wb, filePath);

    db.run(
      'UPDATE export_tasks SET status = ?, file_path = ? WHERE id = ?',
      ['completed', filePath, exportId],
      () => {
        res.json({
          success: true,
          data: { id: exportId, file_name: fileName, file_path: filePath },
          message: '导出成功'
        });
      }
    );
  });
}

router.get('/', (req, res) => {
  try {
    db.all('SELECT * FROM export_tasks ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, data: rows });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/download/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    db.get('SELECT * FROM export_tasks WHERE id = ?', [id], (err, row) => {
      if (err || !row) {
        return res.status(404).json({ success: false, message: '导出任务不存在' });
      }
      
      if (row.status !== 'completed' || !row.file_path) {
        return res.status(400).json({ success: false, message: '导出未完成' });
      }
      
      if (fs.existsSync(row.file_path)) {
        res.download(row.file_path, path.basename(row.file_path));
      } else {
        res.status(404).json({ success: false, message: '文件不存在' });
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
