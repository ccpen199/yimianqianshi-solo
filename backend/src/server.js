require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { initDatabase } = require('./database/init');

const leadsRouter = require('./routes/leads');
const rulesRouter = require('./routes/rules');
const salesRouter = require('./routes/sales');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 24342;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: ['http://localhost:24343', 'http://127.0.0.1:24343'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

initDatabase();

app.use('/api/leads', leadsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/reports', reportsRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Lead Scoring API is running', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Lead Scoring Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;