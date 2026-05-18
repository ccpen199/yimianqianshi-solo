import express from 'express';
import cors from 'cors';
import authRoutes from './src/routes/auth.js';
import promptRoutes from './src/routes/prompts.js';
import testCaseRoutes from './src/routes/testCases.js';
import evaluationRoutes from './src/routes/evaluations.js';
import releaseRoutes from './src/routes/releases.js';
import monitoringRoutes from './src/routes/monitoring.js';
import userRoutes from './src/routes/users.js';
import './src/db.js';

const app = express();
const PORT = 24350;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Prompt 版本管理平台 API 运行正常' });
});

app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/test-cases', testCaseRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`API 健康检查: http://localhost:${PORT}/api/health`);
});
