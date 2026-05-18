require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database/init');
const { authenticateToken } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const appointmentsRoutes = require('./routes/appointments');
const plansRoutes = require('./routes/plans');
const ordersRoutes = require('./routes/orders');
const servicesRoutes = require('./routes/services');
const followupsRoutes = require('./routes/followups');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 24343;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/leads', authenticateToken, leadsRoutes);
app.use('/api/appointments', authenticateToken, appointmentsRoutes);
app.use('/api/plans', authenticateToken, plansRoutes);
app.use('/api/orders', authenticateToken, ordersRoutes);
app.use('/api/services', authenticateToken, servicesRoutes);
app.use('/api/followups', authenticateToken, followupsRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Medical CRM API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
