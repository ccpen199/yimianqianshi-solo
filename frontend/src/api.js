import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:24344/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.code === 'ERR_NETWORK' || error.response?.status >= 500) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        console.log('请求失败，正在重试...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return api(originalRequest);
      }
    }
    
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  assign: (id, consultantId) => api.post(`/leads/${id}/assign`, { consultant_id: consultantId }),
  addFollowUp: (id, data) => api.post(`/leads/${id}/followup`, data),
  recycle: (id) => api.post(`/leads/${id}/recycle`)
};

export const trialsAPI = {
  getAll: () => api.get('/trials'),
  create: (data) => api.post('/trials', data),
  cancel: (id, reason) => api.post(`/trials/${id}/cancel`, { cancel_reason: reason })
};

export const enrollmentsAPI = {
  getAll: () => api.get('/enrollments'),
  create: (data) => api.post('/enrollments', data)
};

export const classesAPI = {
  getAll: () => api.get('/classes'),
  create: (data) => api.post('/classes', data),
  getStudents: (id) => api.get(`/classes/${id}/students`),
  addStudent: (id, data) => api.post(`/classes/${id}/students`, data)
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params })
};

export const classroomsAPI = {
  getAll: () => api.get('/classrooms')
};

export const coursePackagesAPI = {
  getAll: () => api.get('/course-packages')
};

export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getConversion: () => api.get('/reports/conversion')
};

export default api;
