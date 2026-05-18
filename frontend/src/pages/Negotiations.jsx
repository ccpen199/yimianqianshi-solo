import React, { useState, useEffect } from 'react'
import api from '../utils/api'

function Negotiations() {
  const [negotiations, setNegotiations] = useState([])
  const [customers, setCustomers] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    customer_id: '', property_id: '', initial_offer: '',
    counter_offer: '', final_price: '', owner_feedback: '',
    loan_progress: '', contract_nodes: '', status: 'negotiating'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [negRes, customersRes, propertiesRes] = await Promise.all([
        api.get('/negotiations'),
        api.get('/customers?pageSize=100'),
        api.get('/properties?pageSize=100&status=available'),
      ])
      setNegotiations(negRes.data.data?.list || [])
      setCustomers(customersRes.data.data?.list || [])
      setProperties(propertiesRes.data.data?.list || [])
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/negotiations/${editing.id}`, form)
      } else {
        await api.post('/negotiations', form)
      }
      setShowModal(false)
      setEditing(null)
      setForm({ customer_id: '', property_id: '', initial_offer: '', counter_offer: '', final_price: '', owner_feedback: '', loan_progress: '', contract_nodes: '', status: 'negotiating' })
      loadData()
    } catch (error) {
      alert(error.response?.data?.message || '操作失败')
    }
  }

  const handleEdit = (item) => {
    setEditing(item)
    setForm({ ...item })
    setShowModal(true)
  }

  const getStatusBadge = (status) => {
    const badges = {
      negotiating: <span className="badge badge-primary">谈判中</span>,
      agreed: <span className="badge badge-success">已达成</span>,
      failed: <span className="badge badge-error">谈判失败</span>,
      signed: <span className="badge badge-success">已签约</span>,
    }
    return badges[status] || status
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div>
      <div className="flex flex-between items-center mb-20">
        <h1 className="page-title" style={{ margin: 0 }}>谈判签约</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 新建谈判
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>客户</th>
              <th>房源</th>
              <th>报价(万)</th>
              <th>还价(万)</th>
              <th>成交价(万)</th>
              <th>经纪人</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {negotiations.length === 0 ? (
              <tr><td colSpan="8" className="empty">暂无数据</td></tr>
            ) : (
              negotiations.map(item => (
                <tr key={item.id}>
                  <td>{item.customer_name || '-'}</td>
                  <td>{item.property_address || '-'}</td>
                  <td>{item.initial_offer || '-'}</td>
                  <td>{item.counter_offer || '-'}</td>
                  <td>{item.final_price || '-'}</td>
                  <td>{item.agent_name || '-'}</td>
                  <td>{getStatusBadge(item.status)}</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(item)}>编辑</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 20 }}>{editing ? '编辑谈判' : '新建谈判'}</h2>
            <form onSubmit={handleSubmit}>
              {!editing && (
              <>
                <div className="form-group">
                  <label className="form-label">选择客户 *</label>
                  <select className="form-input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                    <option value="">请选择</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">选择房源 *</label>
                  <select className="form-input" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} required>
                    <option value="">请选择</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.address} - {p.price}万</option>)}
                  </select>
                </div>
              </>
              )}
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">初始报价</label>
                  <input type="number" className="form-input" value={form.initial_offer} onChange={(e) => setForm({ ...form, initial_offer: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">业主还价</label>
                  <input type="number" className="form-input" value={form.counter_offer} onChange={(e) => setForm({ ...form, counter_offer: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">最终成交价</label>
                <input type="number" className="form-input" value={form.final_price} onChange={(e) => setForm({ ...form, final_price: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">业主反馈</label>
                <textarea className="form-input" rows="2" value={form.owner_feedback} onChange={(e) => setForm({ ...form, owner_feedback: e.target.value })} />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">贷款进度</label>
                  <select className="form-input" value={form.loan_progress} onChange={(e) => setForm({ ...form, loan_progress: e.target.value })}>
                    <option value="">请选择</option>
                    <option value="未开始">未开始</option>
                    <option value="审批中">审批中</option>
                    <option value="已通过">已通过</option>
                    <option value="已放款">已放款</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">状态</label>
                  <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="negotiating">谈判中</option>
                    <option value="agreed">已达成</option>
                    <option value="failed">谈判失败</option>
                    <option value="signed">已签约</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-10" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-default" onClick={() => { setShowModal(false); setEditing(null); }}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Negotiations
