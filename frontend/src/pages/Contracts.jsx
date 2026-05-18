import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import dayjs from 'dayjs'

function Contracts() {
  const [contracts, setContracts] = useState([])
  const [negotiations, setNegotiations] = useState([])
  const [customers, setCustomers] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    negotiation_id: '', customer_id: '', property_id: '',
    total_price: '', commission_amount: '', sign_date: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [contractsRes, negRes, customersRes, propertiesRes] = await Promise.all([
        api.get('/contracts'),
        api.get('/negotiations?status=negotiating'),
        api.get('/customers?pageSize=100'),
        api.get('/properties?pageSize=100&status=available'),
      ])
      setContracts(contractsRes.data.data?.list || [])
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
      await api.post('/contracts', form)
      setShowModal(false)
      setForm({ negotiation_id: '', customer_id: '', property_id: '', total_price: '', commission_amount: '', sign_date: '' })
      loadData()
    } catch (error) {
      alert(error.response?.data?.message || '操作失败')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: <span className="badge badge-warning">待签约</span>,
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
        <h1 className="page-title" style={{ margin: 0 }}>合同管理</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 新建合同
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>合同编号</th>
              <th>客户</th>
              <th>房源</th>
              <th>成交价(万)</th>
              <th>佣金(万)</th>
              <th>签约日期</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr><td colSpan="7" className="empty">暂无数据</td></tr>
            ) : (
              contracts.map(contract => (
                <tr key={contract.id}>
                  <td>{contract.contract_no}</td>
                  <td>{contract.customer_name || '-'}</td>
                  <td>{contract.property_address || '-'}</td>
                  <td>{contract.total_price || '-'}</td>
                  <td>{contract.commission_amount || '-'}</td>
                  <td>{contract.sign_date ? dayjs(contract.sign_date).format('YYYY-MM-DD') : '-'}</td>
                  <td>{getStatusBadge(contract.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 500 }}>
            <h2 style={{ marginBottom: 20 }}>新建合同</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">关联谈判（可选）</label>
                <select className="form-input" value={form.negotiation_id} onChange={(e) => setForm({ ...form, negotiation_id: e.target.value })}>
                  <option value="">请选择</option>
                  {negotiations.map(n => <option key={n.id} value={n.id}>{n.customer_name} - {n.property_address}</option>)}
                </select>
              </div>
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
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">成交价(万) *</label>
                  <input type="number" className="form-input" value={form.total_price} onChange={(e) => setForm({ ...form, total_price: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">佣金(万)</label>
                  <input type="number" className="form-input" value={form.commission_amount} onChange={(e) => setForm({ ...form, commission_amount: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">签约日期</label>
                <input type="date" className="form-input" value={form.sign_date} onChange={(e) => setForm({ ...form, sign_date: e.target.value })} />
              </div>
              <div className="flex gap-10" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-default" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Contracts
