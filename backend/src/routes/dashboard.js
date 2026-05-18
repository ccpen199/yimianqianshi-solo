const express = require('express');
const db = require('../database/init');
const { requireRoles } = require('../middleware/auth');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/', requireRoles(['admin', 'doctor']), (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    
    db.get("SELECT COUNT(*) as total FROM leads", (err, leadsResult) => {
      db.get("SELECT COUNT(*) as today FROM appointments WHERE appointment_date = ?", [today], (err, aptsResult) => {
        db.get("SELECT COUNT(*) as total FROM orders", (err, ordersResult) => {
          db.get("SELECT COUNT(*) as total FROM customers", (err, customersResult) => {
            db.get("SELECT SUM(final_price) as revenue FROM treatment_plans WHERE status = 'approved'", (err, revenueResult) => {
              db.all(`
                SELECT channel, COUNT(*) as count 
                FROM leads 
                GROUP BY channel 
                ORDER BY count DESC 
                LIMIT 5
              `, (err, channelsResult) => {
                db.all(`
                  SELECT status, COUNT(*) as count 
                  FROM appointments 
                  GROUP BY status
                `, (err, aptsStatusResult) => {
                  res.json({
                    success: true,
                    data: {
                      total_leads: leadsResult?.total || 0,
                      today_appointments: aptsResult?.today || 0,
                      total_orders: ordersResult?.total || 0,
                      total_customers: customersResult?.total || 0,
                      total_revenue: revenueResult?.revenue || 0,
                      channels: channelsResult || [],
                      appointments_status: aptsStatusResult || []
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
