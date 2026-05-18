const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const dbUser = await db.get('SELECT id, username, name, role, status FROM users WHERE id = ?', [user.id]);
    
    if (!dbUser) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    
    if (dbUser.status !== 'active') {
      return res.status(403).json({ success: false, message: '账户已被禁用' });
    }
    
    req.user = dbUser;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: '无效的认证令牌' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
