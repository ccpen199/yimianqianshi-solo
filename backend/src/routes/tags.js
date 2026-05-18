const express = require('express');
const db = require('../database');

const router = express.Router();

router.get('/versions', (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM tag_versions';
    let params = [];
    
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, data: rows });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/versions', (req, res) => {
  try {
    const { version, name, description } = req.body;
    
    if (!version || !name) {
      return res.status(400).json({ success: false, message: '版本号和名称不能为空' });
    }

    db.run(
      'INSERT INTO tag_versions (version, name, description, status) VALUES (?, ?, ?, ?)',
      [version, name, description || '', 'draft'],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ 
          success: true, 
          data: { id: this.lastID, version, name, description, status: 'draft' },
          message: '版本创建成功'
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/versions/:id/publish', (req, res) => {
  try {
    const { id } = req.params;
    
    db.run(
      'UPDATE tag_versions SET status = ?, published_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['published', id],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: '版本发布成功' });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/versions/:versionId/tags', (req, res) => {
  try {
    const { versionId } = req.params;
    
    db.all(
      'SELECT * FROM tags WHERE version_id = ? ORDER BY sort_order ASC, id ASC',
      [versionId],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        
        const buildTree = (parentId = null) => {
          return rows
            .filter(tag => tag.parent_id === parentId)
            .map(tag => ({
              ...tag,
              children: buildTree(tag.id)
            }));
        };
        
        res.json({ success: true, data: buildTree() });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/versions/:versionId/tags', (req, res) => {
  try {
    const { versionId } = req.params;
    const { parent_id, name, code, description, example, color, rule_type, sort_order } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ success: false, message: '标签名称和编码不能为空' });
    }

    db.run(
      `INSERT INTO tags (version_id, parent_id, name, code, description, example, color, rule_type, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [versionId, parent_id || null, name, code, description || '', example || '', color || '#1890ff', rule_type || 'multiple', sort_order || 0],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ 
          success: true, 
          data: { id: this.lastID },
          message: '标签创建成功'
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    db.run('DELETE FROM tags WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, message: '标签删除成功' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
