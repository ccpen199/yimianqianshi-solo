import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import dayjs from 'dayjs';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      if (response.success) {
        setOrders(response.data || []);
      }
    } catch (err) {
      setError('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'badge-pending',
      'partial_paid': 'badge-pending',
      'paid': 'badge-confirmed',
      'cancelled': 'badge-cancelled',
      'refunded': 'badge-cancelled'
    };
    return badges[status] || 'badge-pending';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': '待支付',
      'partial_paid': '部分支付',
      'paid': '已支付',
      'cancelled': '已取消',
      'refunded': '已退款'
    };
    return texts[status] || status;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h3>订单管理</h3>
      </div>

      {error && <div className="error-message">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty-state">暂无订单数据</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>客户姓名</th>
              <th>顾问</th>
              <th>项目</th>
              <th>总金额</th>
              <th>已支付</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.order_no || '-'}</td>
                <td>{order.customer_name || '-'}</td>
                <td>{order.consultant_name || '-'}</td>
                <td>{order.items || '-'}</td>
                <td>¥{order.total_amount || 0}</td>
                <td>¥{order.paid_amount || 0}</td>
                <td><span className={`badge ${getStatusBadge(order.status)}`}>{getStatusText(order.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Orders;
