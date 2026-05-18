import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import dayjs from 'dayjs';

const Followups = () => {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFollowups();
  }, []);

  const fetchFollowups = async () => {
    try {
      const response = await api.get('/followups');
      if (response.success) {
        setFollowups(response.data || []);
      }
    } catch (err) {
      setError('获取复诊计划失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'badge-pending',
      'completed': 'badge-confirmed',
      'missed': 'badge-cancelled'
    };
    return badges[status] || 'badge-pending';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': '待复诊',
      'completed': '已完成',
      'missed': '已错过'
    };
    return texts[status] || status;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h3>复诊回访</h3>
      </div>

      {error && <div className="error-message">{error}</div>}

      {followups.length === 0 ? (
        <div className="empty-state">暂无复诊计划</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>客户姓名</th>
              <th>客户电话</th>
              <th>负责人</th>
              <th>复诊日期</th>
              <th>内容</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {followups.map((followup) => (
              <tr key={followup.id}>
                <td>{followup.customer_name || '-'}</td>
                <td>{followup.customer_phone || '-'}</td>
                <td>{followup.assigned_name || '-'}</td>
                <td>{followup.planned_date}</td>
                <td>{followup.content || '-'}</td>
                <td><span className={`badge ${getStatusBadge(followup.status)}`}>{getStatusText(followup.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Followups;
