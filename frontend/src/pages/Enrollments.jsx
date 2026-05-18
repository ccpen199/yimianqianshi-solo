import React, { useState, useEffect } from 'react';
import { enrollmentsAPI, coursePackagesAPI, leadsAPI } from '../api.js';

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

function Enrollments() {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    lead_id: '',
    student_name: '',
    phone: '',
    course_package_id: '',
    gifted_hours: '0',
    discount: '0',
    paid_amount: '',
    invoice_info: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [enrollRes, pkgRes, leadsRes] = await Promise.all([
        enrollmentsAPI.getAll(),
        coursePackagesAPI.getAll(),
        leadsAPI.getAll()
      ]);
      setEnrollments(enrollRes.data.data || []);
      setPackages(pkgRes.data.data || []);
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
          phone: lead.phone || ''
        });
      }
    } else {
      setFormData({
        ...formData,
        lead_id: '',
        student_name: '',
        phone: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await enrollmentsAPI.create(formData);
      setShowForm(false);
      setFormData({
        lead_id: '', student_name: '', phone: '', course_package_id: '',
        gifted_hours: '0', discount: '0', paid_amount: '', invoice_info: ''
      });
      fetchData();
      alert('报名成功！');
    } catch (err) {
      alert(err.response?.data?.message || '报名失败');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>报名缴费</h2>
        <button onClick={() => setShowForm(!showForm)} style={buttonStyle}>
          {showForm ? '取消' : '新建报名'}
        </button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '1rem' }}>新建报名</h3>
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
                  <option key={l.id} value={l.id}>{l.student_name}</option>
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
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>课程包 *</label>
              <select
                required
                style={{ ...inputStyle, width: '100%' }}
                value={formData.course_package_id}
                onChange={(e) => setFormData({ ...formData, course_package_id: e.target.value })}
              >
                <option value="">请选择</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.hours}课时 - ￥{p.price}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>赠送课时</label>
              <input
                type="number"
                style={{ ...inputStyle, width: '100%' }}
                value={formData.gifted_hours}
                onChange={(e) => setFormData({ ...formData, gifted_hours: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>优惠金额（元）</label>
              <input
                type="number"
                style={{ ...inputStyle, width: '100%' }}
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>实缴金额（元）</label>
              <input
                type="number"
                style={{ ...inputStyle, width: '100%' }}
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>发票信息</label>
              <textarea
                style={{ ...inputStyle, width: '100%', minHeight: '60px' }}
                value={formData.invoice_info}
                onChange={(e) => setFormData({ ...formData, invoice_info: e.target.value })}
                placeholder="发票抬头、税号等信息"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" style={buttonStyle}>确认报名</button>
            </div>
          </form>
        </div>
      )}

      <div style={cardStyle}>
        {enrollments.length === 0 ? (
          <p style={{ color: '#7f8c8d' }}>暂无报名记录</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>学生</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>课程包</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>总课时</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>优惠</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>实缴</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>状态</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>报名时间</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{e.student_name}</td>
                  <td style={{ padding: '0.75rem' }}>{e.package_name}</td>
                  <td style={{ padding: '0.75rem' }}>{e.total_hours}课时</td>
                  <td style={{ padding: '0.75rem' }}>￥{e.discount || 0}</td>
                  <td style={{ padding: '0.75rem' }}>￥{e.paid_amount || 0}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      background: e.status === 'paid' ? '#d4edda' : '#fff3cd',
                      color: e.status === 'paid' ? '#155724' : '#856404'
                    }}>
                      {e.status === 'paid' ? '已缴清' : '部分缴费'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Enrollments;
