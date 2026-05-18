import React, { useState, useEffect } from 'react';
import { leadsAPI, usersAPI } from '../api.js';

const cardStyle = {
  background: 'white',
  borderRadius: '8px',
  padding: '1.5rem',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  marginBottom: '1rem'
};

const buttonStyle = {
  padding: '0.5rem 1rem',
  background: '#3498db',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  marginRight: '0.5rem'
};

const inputStyle = {
  padding: '0.5rem',
  border: '1px solid #ddd',
  borderRadius: '4px',
  marginRight: '0.5rem'
};

const formStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem',
  marginBottom: '1rem'
};

function Leads() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadDetail, setLeadDetail] = useState(null);
  const [formData, setFormData] = useState({
    student_name: '',
    parent_name: '',
    phone: '',
    grade: '',
    subject: '',
    source: '',
    demands: '',
    budget: '',
    pain_points: ''
  });
  const [followUpForm, setFollowUpForm] = useState({
    consultant_id: '',
    content: '',
    next_follow_up: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsRes, usersRes] = await Promise.all([
        leadsAPI.getAll(),
        usersAPI.getAll({ role: 'consultant' })
      ]);
      setLeads(leadsRes.data.data || []);
      setConsultants(usersRes.data.data || []);
      setError(null);
    } catch (err) {
      setError('加载数据失败，请稍后重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await leadsAPI.create(formData);
      setShowForm(false);
      setFormData({
        student_name: '', parent_name: '', phone: '', grade: '',
        subject: '', source: '', demands: '', budget: '', pain_points: ''
      });
      fetchData();
      alert('线索创建成功！');
    } catch (err) {
      alert(err.response?.data?.message || '创建失败');
    }
  };

  const handleAssign = async (leadId, consultantId) => {
    try {
      await leadsAPI.assign(leadId, consultantId);
      fetchData();
      alert('分配成功！');
    } catch (err) {
      alert('分配失败');
    }
  };

  const handleFollowUp = async (e) => {
    e.preventDefault();
    try {
      await leadsAPI.addFollowUp(selectedLead.id, followUpForm);
      setFollowUpForm({ consultant_id: '', content: '', next_follow_up: '' });
      fetchLeadDetail(selectedLead.id);
      fetchData();
      alert('跟进记录添加成功！');
    } catch (err) {
      alert('添加失败');
    }
  };

  const handleRecycle = async (leadId) => {
    if (!confirm('确定要回收这个线索吗？')) return;
    try {
      await leadsAPI.recycle(leadId);
      fetchData();
      alert('回收成功！');
    } catch (err) {
      alert('回收失败');
    }
  };

  const fetchLeadDetail = async (id) => {
    try {
      const res = await leadsAPI.getById(id);
      setLeadDetail(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewDetail = (lead) => {
    setSelectedLead(lead);
    fetchLeadDetail(lead.id);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>线索管理</h2>
        <button onClick={() => setShowForm(!showForm)} style={buttonStyle}>
          {showForm ? '取消' : '新建线索'}
        </button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '1rem' }}>新建线索</h3>
          <form onSubmit={handleSubmit} style={formStyle}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>学生姓名 *</label>
              <input
                required
                style={{ ...inputStyle, width: '100%' }}
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>家长姓名</label>
              <input
                style={{ ...inputStyle, width: '100%' }}
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>联系电话</label>
              <input
                style={{ ...inputStyle, width: '100%' }}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>年级</label>
              <select
                style={{ ...inputStyle, width: '100%' }}
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              >
                <option value="">请选择</option>
                <option value="初一">初一</option>
                <option value="初二">初二</option>
                <option value="初三">初三</option>
                <option value="高一">高一</option>
                <option value="高二">高二</option>
                <option value="高三">高三</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>科目</label>
              <select
                style={{ ...inputStyle, width: '100%' }}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              >
                <option value="">请选择</option>
                <option value="数学">数学</option>
                <option value="英语">英语</option>
                <option value="语文">语文</option>
                <option value="物理">物理</option>
                <option value="化学">化学</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>来源</label>
              <select
                style={{ ...inputStyle, width: '100%' }}
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              >
                <option value="">请选择</option>
                <option value="转介绍">转介绍</option>
                <option value="地推">地推</option>
                <option value="线上广告">线上广告</option>
                <option value="线下活动">线下活动</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>预算</label>
              <input
                type="number"
                style={{ ...inputStyle, width: '100%' }}
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>家长诉求</label>
              <textarea
                style={{ ...inputStyle, width: '100%', minHeight: '80px' }}
                value={formData.demands}
                onChange={(e) => setFormData({ ...formData, demands: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>学习痛点</label>
              <textarea
                style={{ ...inputStyle, width: '100%', minHeight: '80px' }}
                value={formData.pain_points}
                onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={buttonStyle}>创建线索</button>
            </div>
          </form>
        </div>
      )}

      {selectedLead && leadDetail && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>线索详情 - {leadDetail.student_name}</h3>
            <button onClick={() => { setSelectedLead(null); setLeadDetail(null); }} style={{ background: '#95a5a6', ...buttonStyle }}>
              关闭
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', margin: '1rem 0' }}>
            <p><strong>家长：</strong>{leadDetail.parent_name || '-'}</p>
            <p><strong>电话：</strong>{leadDetail.phone || '-'}</p>
            <p><strong>年级：</strong>{leadDetail.grade || '-'}</p>
            <p><strong>科目：</strong>{leadDetail.subject || '-'}</p>
            <p><strong>来源：</strong>{leadDetail.source || '-'}</p>
            <p><strong>预算：</strong>{leadDetail.budget || '-'}</p>
          </div>
          
          {leadDetail.demands && <p><strong>家长诉求：</strong>{leadDetail.demands}</p>}
          {leadDetail.pain_points && <p><strong>学习痛点：</strong>{leadDetail.pain_points}</p>}

          <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>添加跟进记录</h4>
          <form onSubmit={handleFollowUp} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>顾问 *</label>
                <select
                  required
                  style={{ ...inputStyle, width: '100%' }}
                  value={followUpForm.consultant_id}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, consultant_id: e.target.value })}
                >
                  <option value="">请选择</option>
                  {consultants.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>下次跟进时间</label>
                <input
                  type="datetime-local"
                  style={{ ...inputStyle, width: '100%' }}
                  value={followUpForm.next_follow_up}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up: e.target.value })}
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>跟进内容 *</label>
              <textarea
                required
                style={{ ...inputStyle, width: '100%', minHeight: '80px' }}
                value={followUpForm.content}
                onChange={(e) => setFollowUpForm({ ...followUpForm, content: e.target.value })}
              />
            </div>
            <button type="submit" style={buttonStyle}>添加跟进</button>
          </form>

          <h4 style={{ marginBottom: '1rem' }}>跟进记录</h4>
          {leadDetail.follow_ups && leadDetail.follow_ups.length > 0 ? (
            <div>
              {leadDetail.follow_ups.map(fu => (
                <div key={fu.id} style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '4px', marginBottom: '0.5rem' }}>
                  <p style={{ marginBottom: '0.5rem' }}>{fu.content}</p>
                  <small style={{ color: '#666' }}>
                    {fu.consultant_name} - {new Date(fu.created_at).toLocaleString()}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#7f8c8d' }}>暂无跟进记录</p>
          )}
        </div>
      )}

      <div style={cardStyle}>
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
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
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
                  <td style={{ padding: '0.75rem' }}>
                    {lead.consultant_name || (
                      <select
                        style={{ ...inputStyle, fontSize: '0.875rem' }}
                        onChange={(e) => e.target.value && handleAssign(lead.id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="">分配顾问</option>
                        {consultants.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button onClick={() => handleViewDetail(lead)} style={{ ...buttonStyle, fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>
                      详情
                    </button>
                    {lead.consultant_id && (
                      <button onClick={() => handleRecycle(lead.id)} style={{ ...buttonStyle, background: '#e74c3c', fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>
                        回收
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Leads;
