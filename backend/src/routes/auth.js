const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne } = require('../database');

const router = express.Router();

const mockUsers = [
  { id: 1, username: 'admin', password: 'admin123', name: '系统管理员', role: 'admin', skill_group: null },
  { id: 2, username: 'supervisor1', password: '123456', name: '张主管', role: 'supervisor', skill_group: null },
  { id: 3, username: 'agent1', password: '123456', name: '李坐席', role: 'agent', skill_group: 'general' },
  { id: 4, username: 'agent2', password: '123456', name: '王坐席', role: 'agent', skill_group: 'tech' },
  { id: 5, username: 'quality1', password: '123456', name: '刘质检', role: 'quality', skill_group: null },
  { id: 6, username: 'ticket1', password: '123456', name: '陈工单', role: 'ticket', skill_group: null },
];

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Received:', { username, password });
    console.log('Username type:', typeof username, 'length:', username?.length);
    console.log('Password type:', typeof password, 'length:', password?.length);
    
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    console.log('Trimmed:', { trimmedUsername, trimmedPassword });
    
    console.log('Available mock users:');
    mockUsers.forEach(u => {
      console.log(`  - ${u.username} (pass: ${u.password})`);
    });
    
    const mockUser = mockUsers.find(u => {
      const match = u.username.trim() === trimmedUsername && u.password.trim() === trimmedPassword;
      console.log(`Checking ${u.username}:`, match);
      return match;
    });
    
    console.log('Final match result:', mockUser ? mockUser.username : 'NOT FOUND');
    
    if (mockUser) {
      const token = jwt.sign(
        { userId: mockUser.id, username: mockUser.username, role: mockUser.role, name: mockUser.name },
        process.env.JWT_SECRET || 'call-center-secret-key',
        { expiresIn: '24h' }
      );

      console.log('=== LOGIN SUCCESSFUL ===');
      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: mockUser.id,
            username: mockUser.username,
            name: mockUser.name,
            role: mockUser.role,
            skill_group: mockUser.skill_group
          }
        }
      });
    }

    console.log('=== LOGIN FAILED: invalid credentials ===');
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: '已退出登录' });
});

module.exports = router;
