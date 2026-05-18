const express = require('express');
const router = express.Router();

const customerController = require('./controllers/customerController');
const renewalController = require('./controllers/renewalController');
const dashboardController = require('./controllers/dashboardController');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

router.get('/customers', customerController.getCustomers);
router.get('/customers/:id', customerController.getCustomerDetail);
router.post('/customers', customerController.createCustomer);
router.put('/customers/:id', customerController.updateCustomer);
router.delete('/customers/:id', customerController.deleteCustomer);
router.post('/customers/:id/calculate-health', customerController.calculateHealthScore);

router.get('/renewal-tasks', renewalController.getRenewalTasks);
router.post('/renewal-tasks', renewalController.createRenewalTask);
router.put('/renewal-tasks/:id', renewalController.updateRenewalTask);
router.post('/renewal-tasks/generate', renewalController.generateRenewalTasks);

router.get('/risk-alerts', renewalController.getRiskAlerts);
router.put('/risk-alerts/:id/resolve', renewalController.resolveRiskAlert);

router.get('/renewal-records', renewalController.getRenewalRecords);
router.post('/renewal-records', renewalController.processRenewal);
router.put('/renewal-records/:id/verify', renewalController.verifyRenewal);

router.get('/renewal-calendar', renewalController.getRenewalCalendar);

router.post('/follow-ups', renewalController.recordFollowUp);

router.get('/dashboard/stats', dashboardController.getDashboardStats);
router.get('/dashboard/high-risk-customers', dashboardController.getHighRiskCustomers);
router.get('/dashboard/churned-customers', dashboardController.getChurnedCustomers);
router.get('/dashboard/upsell-opportunities', dashboardController.getUpsellOpportunities);

module.exports = router;
