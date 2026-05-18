import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      if (response.success) {
        setData(response.data);
      }
    } catch (err) {
      setError('获取看板数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-message">{error}</div>
        <button className="btn btn-primary" onClick={fetchDashboard}>重试</button>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-grid">
        <div className="stat-card">
          <h4>总线索数</h4>
          <div className="value">{data?.total_leads || 0}</div>
        </div>
        <div className="stat-card">
          <h4>今日预约</h4>
          <div className="value">{data?.today_appointments || 0}</div>
        </div>
        <div className="stat-card">
          <h4>总订单数</h4>
          <div className="value">{data?.total_orders || 0}</div>
        </div>
        <div className="stat-card">
          <h4>总客户数</h4>
          <div className="value">{data?.total_customers || 0}</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-box">
          <h4>渠道分布</h4>
          {data?.channels?.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>渠道</th>
                  <th>数量</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((item, index) => (
                  <tr key={index}>
                    <td>{item.channel || '未知'}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">暂无数据</div>
          )}
        </div>

        <div className="chart-box">
          <h4>预约状态统计</h4>
          {data?.appointments_status?.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>状态</th>
                  <th>数量</th>
                </tr>
              </thead>
              <tbody>
                {data.appointments_status.map((item, index) => (
                  <tr key={index}>
                    <td>{item.status || '未知'}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
