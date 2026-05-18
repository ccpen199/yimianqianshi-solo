import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import dayjs from 'dayjs';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    channel: '',
    consultation_items: '',
    budget: '',
    source_notes: ''
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads');
      if (response.success) {
        setLeads(response.data || []);
      }
    } catch (err) {
      setError('获取线索列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/leads', formData);
      if (response.success) {
        setSuccess('线索创建成功');
        setShowModal(false);
        setFormData({
          customer_name: '',
          customer_phone: '',
          channel: '',
          consultation_items: '',
          budget: '',
          source_notes: ''
        });
        fetchLeads();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('创建线索失败');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'new': 'badge-pending',
      'contacted': 'badge-confirmed',
      'appointed': 'badge-confirmed',
      'converted': 'badge-confirmed',
      'lost': 'badge-cancelled'
    };
    return badges[status] || 'badge-pending';
  };

  const getStatusText = (status) => {
    const texts = {
      'new': '新建',
      'contacted': '已联系',
      'appointed': '已预约',
      'converted': '已成交',
      'lost': '已流失'
    };
    return texts[status] || status;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h3>线索管理</h3>
        <button className="btn btn-success btn-small" onClick={() => setShowModal(true)}>
          + 新建线索
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {leads.length === 0 ? (
        <div className="empty-state">暂无线索数据</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>客户姓名</th>
              <th>客户电话</th>
              <th>渠道</th>
              <th>咨询项目</th>
              <th>预算</th>
              <th>顾问</th>
              <th>状态</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.customer_name || '-'}</td>
                <td>{lead.customer_phone || '-'}</td>
                <td>{lead.channel || '-'}</td>
                <td>{lead.consultation_items || '-'}</td>
                <td>¥{lead.budget || 0}</td>
                <td>{lead.consultant_name || '-'}</td>
                <td><span className={`badge ${getStatusBadge(lead.status)}`}>{getStatusText(lead.status)}</span></td>
                <td>{dayjs(lead.created_at).format('YYYY-MM-DD HH:mm')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>新建线索</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>客户姓名 *</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>客户电话 *</label>
                  <input
                    type="text"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>渠道 *</label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({...formData, channel: e.target.value})}
                    required
                  >
                    <option value="">请选择</option>
                    <option value="线上广告">线上广告</option>
                    <option value="线下活动">线下活动</option>
                    <option value="老客户推荐">老客户推荐</option>
                    <option value="自然到店">自然到店</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>预算</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>咨询项目</label>
                <input
                  type="text"
                  value={formData.consultation_items}
                  onChange={(e) => setFormData({...formData, consultation_items: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>备注</label>
                <textarea
                  value={formData.source_notes}
                  onChange={(e) => setFormData({...formData, source_notes: e.target.value})}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary btn-small">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
