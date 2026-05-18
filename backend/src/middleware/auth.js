const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '无效的认证令牌' });
    }
    req.user = user;
    next();
  });
};

const requireRoles = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    next();
  };
};

const maskPhone = (phone) => {
  if (!phone) return '';
  if (phone.length <= 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
};

const maskCustomerData = (userRole, customer) => {
  if (!customer) return null;
  
  const masked = { ...customer };
  
  if (userRole !== 'admin' && userRole !== 'doctor') {
    masked.phone = maskPhone(customer.phone);
  }
  
  return masked;
};

module.exports = {
  authenticateToken,
  requireRoles,
  maskPhone,
  maskCustomerData
};
