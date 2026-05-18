require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const db = require('./config/database');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 24346;

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({
  origin: ['http://localhost:43461', 'http://127.0.0.1:43461'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(morgan('combined'));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
  res.success = (data = null, message = '操作成功') => {
    res.json({ success: true, data, message });
  };
  res.error = (message = '操作失败', status = 400) => {
    res.status(status).json({ success: false, data: null, message });
  };
  next();
});

app.get('/api/health', (req, res) => {
  res.success({ status: 'ok', timestamp: new Date().toISOString() }, '服务运行正常');
});

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const datasetRoutes = require('./routes/datasets');
const taskRoutes = require('./routes/tasks');
const annotationRoutes = require('./routes/annotations');
const qualityRoutes = require('./routes/quality');
const deliveryRoutes = require('./routes/delivery');
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');

app.use('/api/auth', authRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/datasets', authenticateToken, datasetRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/annotations', authenticateToken, annotationRoutes);
app.use('/api/quality', authenticateToken, qualityRoutes);
app.use('/api/delivery', authenticateToken, deliveryRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/logs', authenticateToken, logRoutes);

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.error('服务器内部错误', 500);
});

app.use((req, res) => {
  res.error('接口不存在', 404);
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  数据标注任务分发平台 - 后端服务`);
  console.log(`  端口: ${PORT}`);
  console.log(`  访问: http://localhost:${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});

module.exports = app;
