import axios from 'axios';
import { message } from 'antd';

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

client.interceptors.response.use(
  (response) => {
    if (response.data && !response.data.success) {
      message.error(response.data.error || response.data.message || '请求失败');
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        message.error('未授权，请重新登录');
      } else if (status === 403) {
        message.error('没有权限执行此操作');
      } else if (status === 404) {
        message.error('请求的资源不存在');
      } else if (status >= 500) {
        message.error('服务器错误，请稍后重试');
      } else {
        message.error(error.response.data?.error || error.response.data?.message || '请求失败');
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error('请求配置错误');
    }
    return Promise.reject(error);
  }
);

export const leadsApi = {
  getList: (params) => client.get('/leads', { params }),
  get: (id) => client.get(`/leads/${id}`),
  create: (data) => client.post('/leads', data),
  update: (id, data) => client.put(`/leads/${id}`, data),
  delete: (id) => client.delete(`/leads/${id}`),
  score: (id) => client.post(`/leads/${id}/score`),
  rescoreAll: () => client.post('/leads/rescore-all'),
  merge: (data) => client.post('/leads/merge', data),
  import: (data) => client.post('/leads/import', data),
  assign: (id, data) => client.post(`/leads/${id}/assign`, data),
  return: (id, data) => client.post(`/leads/${id}/return`, data),
  feedback: (id, data) => client.post(`/leads/${id}/feedback`, data),
  addActivity: (id, data) => client.post(`/leads/${id}/activities`, data),
};

export const rulesApi = {
  getList: () => client.get('/rules'),
  getActive: () => client.get('/rules/active'),
  create: (data) => client.post('/rules', data),
  activate: (id) => client.put(`/rules/${id}/activate`),
  delete: (id) => client.delete(`/rules/${id}`),
};

export const salesApi = {
  getList: (params) => client.get('/sales', { params }),
  get: (id) => client.get(`/sales/${id}`),
  create: (data) => client.post('/sales', data),
  update: (id, data) => client.put(`/sales/${id}`, data),
  delete: (id) => client.delete(`/sales/${id}`),
  getPerformance: (id) => client.get(`/sales/${id}/performance`),
};

export const reportsApi = {
  getDashboard: () => client.get('/reports/dashboard'),
  getQuality: () => client.get('/reports/quality'),
  getConversionFunnel: () => client.get('/reports/conversion-funnel'),
  getImportHistory: () => client.get('/reports/import-history'),
  exportLeads: (params) => client.get('/reports/export/leads', { params, responseType: 'blob' }),
  exportSales: () => client.get('/reports/export/sales', { responseType: 'blob' }),
  exportFull: () => client.get('/reports/export/full', { responseType: 'blob' }),
};

export default client;