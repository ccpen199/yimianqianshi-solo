const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const tasksRoutes = require('./routes/tasks');
const callsRoutes = require('./routes/calls');
const qualityRoutes = require('./routes/quality');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 24340;

app.use(cors({
  origin: ['http://localhost:24342', 'http://127.0.0.1:24342'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/reports', reportsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务运行正常', timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    await initDatabase();
    console.log('数据库初始化完成');
    
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`API 地址: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

startServer();
