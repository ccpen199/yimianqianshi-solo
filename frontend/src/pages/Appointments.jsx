import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import dayjs from 'dayjs';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments');
      if (response.success) {
        setAppointments(response.data || []);
      }
    } catch (err) {
      setError('获取预约列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'scheduled': 'badge-pending',
      'confirmed': 'badge-confirmed',
      'completed': 'badge-confirmed',
      'cancelled': 'badge-cancelled',
      'no_show': 'badge-cancelled',
      'late': 'badge-pending'
    };
    return badges[status] || 'badge-pending';
  };

  const getStatusText = (status) => {
    const texts = {
      'scheduled': '已预约',
      'confirmed': '已确认',
      'completed': '已完成',
      'cancelled': '已取消',
      'no_show': '未到店',
      'late': '迟到'
    };
    return texts[status] || status;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h3>预约管理</h3>
      </div>

      {error && <div className="error-message">{error}</div>}

      {appointments.length === 0 ? (
        <div className="empty-state">暂无预约数据</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>客户姓名</th>
              <th>客户电话</th>
              <th>医生</th>
              <th>预约日期</th>
              <th>时间</th>
              <th>类型</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((apt) => (
              <tr key={apt.id}>
                <td>{apt.customer_name || '-'}</td>
                <td>{apt.customer_phone || '-'}</td>
                <td>{apt.doctor_name || '-'}</td>
                <td>{apt.appointment_date}</td>
                <td>{apt.start_time} - {apt.end_time}</td>
                <td>{apt.type === 'consultation' ? '面诊' : apt.type === 'treatment' ? '治疗' : '复诊'}</td>
                <td><span className={`badge ${getStatusBadge(apt.status)}`}>{getStatusText(apt.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Appointments;
