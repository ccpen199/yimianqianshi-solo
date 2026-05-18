const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne } = require('../database');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.json({ success: false, message: '用户名和密码不能为空' });
    }

    const user = await getOne('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return res.json({ success: false, message: '用户名或密码错误' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    
    if (!isValid) {
      return res.json({ success: false, message: '用户名或密码错误' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          store_id: user.store_id,
          phone: user.phone
        }
      },
      message: '登录成功'
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.json({ success: false, message: '登录失败: ' + error.message });
  }
});

router.get('/profile', (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

module.exports = router;
