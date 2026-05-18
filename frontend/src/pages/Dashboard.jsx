import React, { useState, useEffect } from 'react';
import { reportsAPI, leadsAPI } from '../api.js';

const cardStyle = {
  background: 'white',
  borderRadius: '8px',
  padding: '1.5rem',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  marginBottom: '1rem'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1rem'
};

const statStyle = {
  textAlign: 'center',
  padding: '1rem'
};

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, leadsRes] = await Promise.all([
        reportsAPI.getDashboard(),
        leadsAPI.getAll()
      ]);
      setData(dashboardRes.data.data);
      setLeads(leadsRes.data.data || []);
      setError(null);
    } catch (err) {
      setError('加载数据失败，请稍后重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>;
  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#e74c3c' }}>
      <p>{error}</p>
      <button onClick={fetchDashboard} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
        重试
      </button>
    </div>
  );

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>仪表盘</h2>
      
      <div style={gridStyle}>
        <div style={cardStyle}>
          <div style={statStyle}>
            <h3 style={{ color: '#7f8c8d', marginBottom: '0.5rem' }}>总线索数</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db' }}>
              {leads.length}
            </p>
          </div>
        </div>
        
        <div style={cardStyle}>
          <div style={statStyle}>
            <h3 style={{ color: '#7f8c8d', marginBottom: '0.5rem' }}>进行中</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12' }}>
              {leads.filter(l => l.status === 'following').length}
            </p>
          </div>
        </div>
        
        <div style={cardStyle}>
          <div style={statStyle}>
            <h3 style={{ color: '#7f8c8d', marginBottom: '0.5rem' }}>待跟进</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e74c3c' }}>
              {leads.filter(l => l.status === 'new').length}
            </p>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={statStyle}>
            <h3 style={{ color: '#7f8c8d', marginBottom: '0.5rem' }}>顾问人数</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>
              {data?.consultant_stats?.length || 0}
            </p>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginBottom: '1rem' }}>最新线索</h3>
        {leads.length === 0 ? (
          <p style={{ color: '#7f8c8d' }}>暂无线索</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>学生姓名</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>年级</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>科目</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>来源</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>状态</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>顾问</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map(lead => (
                <tr key={lead.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{lead.student_name}</td>
                  <td style={{ padding: '0.75rem' }}>{lead.grade || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{lead.subject || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{lead.source || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      background: lead.status === 'new' ? '#fff3cd' : 
                                  lead.status === 'following' ? '#d1ecf1' : '#d4edda',
                      color: lead.status === 'new' ? '#856404' : 
                             lead.status === 'following' ? '#0c5460' : '#155724'
                    }}>
                      {lead.status === 'new' ? '新建' : 
                       lead.status === 'assigned' ? '已分配' :
                       lead.status === 'following' ? '跟进中' : '已报名'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{lead.consultant_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
