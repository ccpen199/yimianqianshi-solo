require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./database');
const authRoutes = require('./routes/auth');
const tagRoutes = require('./routes/tags');
const textRoutes = require('./routes/texts');
const annotationRoutes = require('./routes/annotations');
const reviewRoutes = require('./routes/reviews');
const exportRoutes = require('./routes/exports');

const app = express();
const PORT = process.env.PORT || 43471;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:43472',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/texts', textRoutes);
app.use('/api/annotations', annotationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/exports', exportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error',
    data: null
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
