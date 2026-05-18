import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import dayjs from 'dayjs';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      if (response.success) {
        setServices(response.data || []);
      }
    } catch (err) {
      setError('获取服务记录失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'badge-pending',
      'in_progress': 'badge-pending',
      'completed': 'badge-confirmed',
      'cancelled': 'badge-cancelled'
    };
    return badges[status] || 'badge-pending';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': '待服务',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return texts[status] || status;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h3>服务记录</h3>
      </div>

      {error && <div className="error-message">{error}</div>}

      {services.length === 0 ? (
        <div className="empty-state">暂无服务记录</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>客户姓名</th>
              <th>服务项目</th>
              <th>医生</th>
              <th>护士</th>
              <th>服务日期</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>{service.customer_name || '-'}</td>
                <td>{service.item || '-'}</td>
                <td>{service.doctor_name || '-'}</td>
                <td>{service.nurse_name || '-'}</td>
                <td>{service.service_date}</td>
                <td><span className={`badge ${getStatusBadge(service.status)}`}>{getStatusText(service.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Services;
