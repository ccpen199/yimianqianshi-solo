import axios from 'axios';
import { message } from 'antd';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (response.data.success === false) {
      message.error(response.data.message || '请求失败');
      return Promise.reject(response.data);
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.code === 'ECONNABORTED' && !originalRequest._retry) {
      originalRequest._retry = true;
      return api(originalRequest);
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      message.error('登录已过期，请重新登录');
    } else if (error.response?.status === 403) {
      message.error('没有权限执行此操作');
    } else if (error.response?.status === 404) {
      message.error('资源不存在');
    } else if (error.response?.status >= 500) {
      message.error('服务器错误，请稍后重试');
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时，请稍后重试');
    } else if (!error.response) {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error(error.response?.data?.message || '请求失败');
    }
    return Promise.reject(error);
  }
);

export default api;
