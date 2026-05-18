require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./database');

const routes = require('./routes');
const { errorHandler, notFoundHandler, timeoutHandler } = require('./middleware/error');

const app = express();
const PORT = process.env.PORT || 24348;

app.use(timeoutHandler(10000));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:43480',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', routes);

const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

app.use(errorHandler);
app.use(notFoundHandler);

app.listen(PORT, () => {
  console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
  console.log(`📁 数据库路径: ${process.env.DATABASE_PATH}`);
  console.log(`📤 上传目录: ${uploadsDir}`);
});

module.exports = app;