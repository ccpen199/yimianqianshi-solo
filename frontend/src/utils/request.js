import axios from 'axios'
import { message } from 'antd'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true
})

let retryCount = 0
const MAX_RETRY = 1

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    retryCount = 0
    const res = response.data
    if (res.success === false) {
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res
  },
  async (error) => {
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      if (retryCount < MAX_RETRY) {
        retryCount++
        message.info('请求超时，正在重试...')
        return request(error.config)
      }
    }

    const status = error.response?.status
    switch (status) {
      case 401:
        message.error('登录已过期，请重新登录')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        break
      case 403:
        message.error('没有权限访问此资源')
        break
      case 404:
        message.error('请求的资源不存在')
        break
      case 500:
        message.error('服务器错误，请稍后重试')
        break
      default:
        if (!window.navigator.onLine) {
          message.error('网络连接已断开，请检查网络')
        } else if (!error.response) {
          message.error('网络请求失败，请检查服务器是否启动')
        }
    }
    return Promise.reject(error)
  }
)

export default request
