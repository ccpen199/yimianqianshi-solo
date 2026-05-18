const express = require('express');
const db = require('../database');

const router = express.Router();

router.get('/:sampleId', (req, res) => {
  try {
    const { sampleId } = req.params;
    const { annotator_id, is_draft } = req.query;
    
    let sql = 'SELECT * FROM annotations WHERE sample_id = ?';
    let params = [sampleId];
    
    if (annotator_id) {
      sql += ' AND annotator_id = ?';
      params.push(annotator_id);
    }
    if (is_draft !== undefined) {
      sql += ' AND is_draft = ?';
      params.push(is_draft);
    }
    sql += ' ORDER BY updated_at DESC LIMIT 1';

    db.get(sql, params, (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      if (row && row.tags) {
        row.tags = JSON.parse(row.tags);
      }
      res.json({ success: true, data: row || null });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { sample_id, version_id, annotator_id, tags, is_draft = 0 } = req.body;
    
    if (!sample_id || !version_id || !annotator_id || !tags) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const tagsJson = JSON.stringify(tags);

    db.get(
      'SELECT id FROM annotations WHERE sample_id = ? AND annotator_id = ?',
      [sample_id, annotator_id],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }

        if (existing) {
          db.run(
            'UPDATE annotations SET tags = ?, is_draft = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [tagsJson, is_draft, existing.id],
            function(err) {
              if (err) {
                return res.status(500).json({ success: false, message: err.message });
              }
              
              if (!is_draft) {
                db.run('UPDATE text_samples SET status = ? WHERE id = ?', ['annotated', sample_id]);
              }
              
              res.json({ 
                success: true, 
                data: { id: existing.id },
                message: is_draft ? '草稿保存成功' : '标注提交成功' 
              });
            }
          );
        } else {
          db.run(
            'INSERT INTO annotations (sample_id, version_id, annotator_id, tags, is_draft) VALUES (?, ?, ?, ?, ?)',
            [sample_id, version_id, annotator_id, tagsJson, is_draft],
            function(err) {
              if (err) {
                return res.status(500).json({ success: false, message: err.message });
              }
              
              if (!is_draft) {
                db.run('UPDATE text_samples SET status = ? WHERE id = ?', ['annotated', sample_id]);
              }
              
              res.json({ 
                success: true, 
                data: { id: this.lastID },
                message: is_draft ? '草稿保存成功' : '标注提交成功' 
              });
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/conflicts/:sampleId', (req, res) => {
  try {
    const { sampleId } = req.params;
    
    db.all(
      `SELECT a.*, u.username 
       FROM annotations a 
       JOIN users u ON a.annotator_id = u.id 
       WHERE a.sample_id = ? AND a.is_draft = 0`,
      [sampleId],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        
        rows.forEach(row => {
          if (row.tags) row.tags = JSON.parse(row.tags);
        });
        
        let hasConflict = false;
        if (rows.length > 1) {
          const firstTags = JSON.stringify(rows[0].tags?.sort() || []);
          hasConflict = rows.some((row, idx) => 
            idx > 0 && JSON.stringify(row.tags?.sort() || []) !== firstTags
          );
        }
        
        res.json({ 
          success: true, 
          data: { annotations: rows, has_conflict: hasConflict } 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
