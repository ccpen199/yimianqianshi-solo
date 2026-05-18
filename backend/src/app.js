require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const propertyRoutes = require('./routes/properties');
const viewingRoutes = require('./routes/viewings');
const negotiationRoutes = require('./routes/negotiations');
const contractRoutes = require('./routes/contracts');
const commissionRoutes = require('./routes/commissions');

const app = express();
const PORT = process.env.PORT || 24345;

app.use(cors({
  origin: ['http://localhost:12434', 'http://127.0.0.1:12434'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log('Request:', req.method, req.url);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务运行正常', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/properties', authMiddleware, propertyRoutes);
app.use('/api/viewings', authMiddleware, viewingRoutes);
app.use('/api/negotiations', authMiddleware, negotiationRoutes);
app.use('/api/contracts', authMiddleware, contractRoutes);
app.use('/api/commissions', authMiddleware, commissionRoutes);

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log('后端服务启动成功，端口: ' + PORT);
  console.log('健康检查: http://localhost:' + PORT + '/api/health');
});
