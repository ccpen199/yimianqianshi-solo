import axios from 'axios';
import { message } from 'antd';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let retryCount = 0;
const MAX_RETRIES = 1;

api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    retryCount = 0;
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      message.error('请求超时，请稍后重试');
      return Promise.reject(error);
    }
    
    if (!error.response) {
      message.error('网络连接失败，请检查网络');
      return Promise.reject(error);
    }
    
    const { status } = error.response;
    
    if (status === 500 && retryCount < MAX_RETRIES) {
      retryCount++;
      return api(originalRequest);
    }
    
    switch (status) {
      case 400:
        message.error(error.response.data?.message || '参数错误');
        break;
      case 401:
        message.error('未授权，请重新登录');
        break;
      case 403:
        message.error('没有权限');
        break;
      case 404:
        message.error('资源不存在');
        break;
      case 408:
        message.error('请求超时');
        break;
      case 500:
        message.error('服务器错误');
        break;
      default:
        message.error(`请求失败: ${status}`);
    }
    
    return Promise.reject(error);
  }
);

export default api;