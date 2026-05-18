import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import dayjs from 'dayjs';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/plans');
      if (response.success) {
        setPlans(response.data || []);
      }
    } catch (err) {
      setError('获取方案列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'badge-pending',
      'approved': 'badge-confirmed',
      'expired': 'badge-cancelled',
      'cancelled': 'badge-cancelled'
    };
    return badges[status] || 'badge-pending';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': '待审批',
      'approved': '已通过',
      'expired': '已过期',
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
        <h3>治疗方案</h3>
      </div>

      {error && <div className="error-message">{error}</div>}

      {plans.length === 0 ? (
        <div className="empty-state">暂无治疗方案</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>客户姓名</th>
              <th>医生</th>
              <th>项目</th>
              <th>总价</th>
              <th>有效期至</th>
              <th>知情确认</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>{plan.customer_name || '-'}</td>
                <td>{plan.doctor_name || '-'}</td>
                <td>{plan.items || '-'}</td>
                <td>¥{plan.total_price || 0}</td>
                <td>{plan.valid_until}</td>
                <td>{plan.consent_confirmed ? '是' : '否'}</td>
                <td><span className={`badge ${getStatusBadge(plan.status)}`}>{getStatusText(plan.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Plans;
