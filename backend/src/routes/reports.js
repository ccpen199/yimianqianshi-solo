const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/dashboard', async (req, res) => {
  try {
    const leadStats = await new Promise((resolve, reject) => {
      db.all(`SELECT status, COUNT(*) as count FROM leads GROUP BY status`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const consultantStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT u.id, u.name, COUNT(l.id) as lead_count
        FROM users u 
        LEFT JOIN leads l ON u.id = l.consultant_id
        WHERE u.role = 'consultant'
        GROUP BY u.id, u.name
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const renewalAlerts = await new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM renewal_alerts 
        WHERE status = 'pending'
        ORDER BY alert_date ASC
        LIMIT 10
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({ 
      success: true, 
      data: { 
        lead_stats: leadStats,
        consultant_stats: consultantStats,
        renewal_alerts: renewalAlerts
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/conversion', async (req, res) => {
  try {
    const conversion = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          (SELECT COUNT(*) FROM leads) as total_leads,
          (SELECT COUNT(*) FROM trial_bookings WHERE status = 'scheduled') as trial_count,
          (SELECT COUNT(*) FROM enrollments) as enrollment_count
      `, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json({ success: true, data: conversion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
