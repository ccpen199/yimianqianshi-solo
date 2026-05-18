import React, { useState, useEffect } from 'react';
import { trialsAPI, usersAPI, classroomsAPI, leadsAPI } from '../api.js';

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

function Trials() {
  const [loading, setLoading] = useState(true);
  const [trials, setTrials] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelId, setCancelId] = useState(null);
  const [formData, setFormData] = useState({
    lead_id: '',
    student_name: '',
    phone: '',
    subject: '',
    grade: '',
    teacher_id: '',
    classroom_id: '',
    trial_time: '',
    duration: '60'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [trialsRes, teachersRes, classroomsRes, leadsRes] = await Promise.all([
        trialsAPI.getAll(),
        usersAPI.getAll({ role: 'teacher' }),
        classroomsAPI.getAll(),
        leadsAPI.getAll()
      ]);
      setTrials(trialsRes.data.data || []);
      setTeachers(teachersRes.data.data || []);
      setClassrooms(classroomsRes.data.data || []);
      setLeads(leadsRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadChange = (e) => {
    const leadId = e.target.value;
    if (leadId) {
      const lead = leads.find(l => l.id === parseInt(leadId));
      if (lead) {
        setFormData({
          ...formData,
          lead_id: lead.id,
          student_name: lead.student_name,
          phone: lead.phone || '',
          subject: lead.subject || '',
          grade: lead.grade || ''
        });
      }
    } else {
      setFormData({
        ...formData,
        lead_id: '',
        student_name: '',
        phone: '',
        subject: '',
        grade: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await trialsAPI.create(formData);
      setShowForm(false);
      setFormData({
        lead_id: '', student_name: '', phone: '', subject: '', grade: '',
        teacher_id: '', classroom_id: '', trial_time: '', duration: '60'
      });
      fetchData();
      alert('试听预约成功！');
    } catch (err) {
      alert(err.response?.data?.message || '预约失败');
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('请填写取消原因');
      return;
    }
    try {
      await trialsAPI.cancel(cancelId, cancelReason);
      setCancelId(null);
      setCancelReason('');
      fetchData();
      alert('已取消，名额已释放！');
    } catch (err) {
      alert('取消失败');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>试听预约</h2>
        <button onClick={() => setShowForm(!showForm)} style={buttonStyle}>
          {showForm ? '取消' : '新建预约'}
        </button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '1rem' }}>新建试听预约</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>选择线索</label>
              <select
                style={{ ...inputStyle, width: '100%' }}
                value={formData.lead_id}
                onChange={handleLeadChange}
              >
                <option value="">直接填写</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.student_name} - {l.subject || '未设置科目'}</option>
                ))}
              </select>
            </div>
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
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>联系电话</label>
              <input
                style={{ ...inputStyle, width: '100%' }}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>科目 *</label>
              <select
                required
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
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>授课老师 *</label>
              <select
                required
                style={{ ...inputStyle, width: '100%' }}
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
              >
                <option value="">请选择</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>教室 *</label>
              <select
                required
                style={{ ...inputStyle, width: '100%' }}
                value={formData.classroom_id}
                onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
              >
                <option value="">请选择</option>
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.location})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>试听时间 *</label>
              <input
                required
                type="datetime-local"
                style={{ ...inputStyle, width: '100%' }}
                value={formData.trial_time}
                onChange={(e) => setFormData({ ...formData, trial_time: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>时长（分钟）</label>
              <input
                type="number"
                style={{ ...inputStyle, width: '100%' }}
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={buttonStyle}>创建预约</button>
            </div>
          </form>
        </div>
      )}

      {cancelId && (
        <div style={cardStyle}>
          <h4>取消试听预约</h4>
          <div style={{ margin: '1rem 0' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>取消原因 *</label>
            <textarea
              style={{ ...inputStyle, width: '100%', minHeight: '80px' }}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="请填写取消原因，以便释放名额"
            />
          </div>
          <button onClick={handleCancel} style={{ ...buttonStyle, background: '#e74c3c' }}>确认取消</button>
          <button onClick={() => { setCancelId(null); setCancelReason(''); }} style={buttonStyle}>返回</button>
        </div>
      )}

      <div style={cardStyle}>
        {trials.length === 0 ? (
          <p style={{ color: '#7f8c8d' }}>暂无试听预约</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>学生</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>科目</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>老师</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>教室</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>时间</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>时长</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>状态</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {trials.map(trial => (
                <tr key={trial.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{trial.student_name}</td>
                  <td style={{ padding: '0.75rem' }}>{trial.subject}</td>
                  <td style={{ padding: '0.75rem' }}>{trial.teacher_name}</td>
                  <td style={{ padding: '0.75rem' }}>{trial.classroom_name}</td>
                  <td style={{ padding: '0.75rem' }}>{new Date(trial.trial_time).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem' }}>{trial.duration}分钟</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      background: trial.status === 'scheduled' ? '#d1ecf1' : '#f8d7da',
                      color: trial.status === 'scheduled' ? '#0c5460' : '#721c24'
                    }}>
                      {trial.status === 'scheduled' ? '已预约' : '已取消'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {trial.status === 'scheduled' && (
                      <button 
                        onClick={() => setCancelId(trial.id)} 
                        style={{ ...buttonStyle, background: '#e74c3c', fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                      >
                        取消
                      </button>
                    )}
                    {trial.cancel_reason && (
                      <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                        原因：{trial.cancel_reason}
                      </p>
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

export default Trials;
