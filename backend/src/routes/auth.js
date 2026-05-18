const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/init');

const router = express.Router();

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: '数据库错误' });
      }

      if (!user) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            phone: user.phone,
            department: user.department
          }
        },
        message: '登录成功'
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/me', (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

module.exports = router;
