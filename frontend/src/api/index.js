import request from '@/utils/request'

export const dashboardAPI = {
  getStats: () => request.get('/dashboard/stats'),
  getHighRiskCustomers: (params) => request.get('/dashboard/high-risk-customers', { params }),
  getChurnedCustomers: (params) => request.get('/dashboard/churned-customers', { params }),
  getUpsellOpportunities: (params) => request.get('/dashboard/upsell-opportunities', { params })
}

export const customerAPI = {
  getList: (params) => request.get('/customers', { params }),
  getDetail: (id) => request.get(`/customers/${id}`),
  create: (data) => request.post('/customers', data),
  update: (id, data) => request.put(`/customers/${id}`, data),
  calculateHealthScore: (customerId) => request.post(`/customers/${customerId}/calculate-health`)
}

export const renewalAPI = {
  getTasks: (params) => request.get('/renewal-tasks', { params }),
  createTask: (data) => request.post('/renewal-tasks', data),
  updateTask: (id, data) => request.put(`/renewal-tasks/${id}`, data),
  generateTasks: () => request.post('/renewal-tasks/generate'),
  getCalendar: () => request.get('/renewal-calendar')
}

export const riskAlertAPI = {
  getList: (params) => request.get('/risk-alerts', { params }),
  resolve: (id, data) => request.put(`/risk-alerts/${id}/resolve`, data)
}

export const renewalRecordAPI = {
  getList: (params) => request.get('/renewal-records', { params }),
  create: (data) => request.post('/renewal-records', data),
  verify: (id, data) => request.put(`/renewal-records/${id}/verify`, data)
}

export const followUpAPI = {
  create: (data) => request.post('/follow-ups', data)
}
