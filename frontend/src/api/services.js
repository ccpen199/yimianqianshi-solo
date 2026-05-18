import api from './index';

export const batchApi = {
  getList: (params) => api.get('/batches', { params }),
  getDetail: (id) => api.get(`/batches/${id}`),
  create: (data) => api.post('/batches', data),
  update: (id, data) => api.put(`/batches/${id}`, data),
  delete: (id) => api.delete(`/batches/${id}`)
};

export const audioApi = {
  getList: (params) => api.get('/audio-files', { params }),
  getDetail: (id) => api.get(`/audio-files/${id}`),
  upload: (formData, onProgress) => api.post('/audio-files/upload', formData, {
    onUploadProgress: onProgress
  }),
  delete: (id) => api.delete(`/audio-files/${id}`)
};

export const segmentApi = {
  getList: (params) => api.get('/segments', { params }),
  getDetail: (id) => api.get(`/segments/${id}`),
  create: (data) => api.post('/segments', data),
  update: (id, data) => api.put(`/segments/${id}`, data),
  autoSplit: (data) => api.post('/segments/auto-split', data)
};

export const speakerApi = {
  getList: (params) => api.get('/speakers', { params }),
  create: (data) => api.post('/speakers', data),
  update: (id, data) => api.put(`/speakers/${id}`, data),
  delete: (id) => api.delete(`/speakers/${id}`)
};

export const qualityApi = {
  getList: (params) => api.get('/quality-checks', { params }),
  create: (data) => api.post('/quality-checks', data),
  getStats: (params) => api.get('/quality-stats', { params })
};

export const exportApi = {
  exportData: (data) => api.post('/export', data, {
    responseType: 'blob'
  })
};