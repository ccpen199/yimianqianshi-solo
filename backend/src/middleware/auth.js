const jwt = require('jsonwebtoken');
const { getOne } = require('../database');

const mockUsers = [
  { id: 1, username: 'admin', name: '系统管理员', role: 'admin', skill_group: null, status: 'online' },
  { id: 2, username: 'supervisor1', name: '张主管', role: 'supervisor', skill_group: null, status: 'online' },
  { id: 3, username: 'agent1', name: '李坐席', role: 'agent', skill_group: 'general', status: 'online' },
  { id: 4, username: 'agent2', name: '王坐席', role: 'agent', skill_group: 'tech', status: 'online' },
  { id: 5, username: 'quality1', name: '刘质检', role: 'quality', skill_group: null, status: 'online' },
  { id: 6, username: 'ticket1', name: '陈工单', role: 'ticket', skill_group: null, status: 'online' },
];

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'call-center-secret-key');
    
    const mockUser = mockUsers.find(u => u.id === decoded.userId);
    if (mockUser) {
      req.user = mockUser;
      return next();
    }
    
    const result = await getOne('SELECT id, username, name, role, skill_group, status FROM users WHERE id = ?', [decoded.userId]);
    if (!result.success || !result.data) {
      return res.status(403).json({ success: false, message: '用户不存在' });
    }
    
    req.user = result.data;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(403).json({ success: false, message: '令牌无效或已过期' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole };
