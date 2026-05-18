import axios from 'axios';
import { message } from 'antd';
import useAuthStore from '@/store/useAuthStore';

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

request.interceptors.request.use(
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

request.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data && data.success !== undefined) {
      return data;
    }
    return { success: true, data };
  },
  (error) => {
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      message.error('权限不足');
    } else if (error.response?.status === 404) {
      message.error('资源不存在');
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时，请稍后重试');
    } else if (!error.response) {
      message.error('网络连接失败，请检查后端服务');
    } else {
      message.error(error.response?.data?.message || '请求失败');
    }
    return Promise.reject(error);
  }
);

export default request;
