const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    let sql = `SELECT id, name, role, username, created_at FROM users WHERE 1=1`;
    const params = [];
    
    if (role) {
      sql += ` AND role = ?`;
      params.push(role);
    }
    
    const users = await new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
