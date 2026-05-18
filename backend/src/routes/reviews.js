const express = require('express');
const db = require('../database');

const router = express.Router();

router.get('/pending', (req, res) => {
  try {
    const { page = 1, page_size = 20 } = req.query;
    
    const sql = `
      SELECT s.*, b.batch_no, b.source 
      FROM text_samples s 
      LEFT JOIN text_batches b ON s.batch_id = b.id 
      WHERE s.status = 'annotated' 
      ORDER BY s.id ASC 
      LIMIT ? OFFSET ?
    `;
    
    db.all(sql, [parseInt(page_size), (parseInt(page) - 1) * parseInt(page_size)], (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      
      db.get("SELECT COUNT(*) as total FROM text_samples WHERE status = 'annotated'", (err, countResult) => {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        res.json({
          success: true,
          data: {
            list: rows,
            total: countResult.total
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { sample_id, reviewer_id, annotation_id, tags, status, reject_reason } = req.body;
    
    if (!sample_id || !reviewer_id || !status) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const tagsJson = tags ? JSON.stringify(tags) : null;

    db.run(
      `INSERT INTO reviews (sample_id, reviewer_id, annotation_id, tags, status, reject_reason) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sample_id, reviewer_id, annotation_id || null, tagsJson, status, reject_reason || ''],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }

        const sampleStatus = status === 'approved' ? 'reviewed' : 
                            status === 'rejected' ? 'rejected' : 'reviewing';
        
        db.run('UPDATE text_samples SET status = ? WHERE id = ?', [sampleStatus, sample_id]);
        
        res.json({ 
          success: true, 
          data: { id: this.lastID },
          message: status === 'approved' ? '审核通过' : status === 'rejected' ? '已退回' : '标记冲突'
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    db.all(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'conflict' THEN 1 ELSE 0 END) as conflict
      FROM reviews
    `, (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      
      const stats = rows[0];
      const agreementRate = stats.total > 0 
        ? ((stats.approved / stats.total) * 100).toFixed(2) 
        : 0;
      
      res.json({
        success: true,
        data: {
          ...stats,
          agreement_rate: parseFloat(agreementRate)
        }
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
