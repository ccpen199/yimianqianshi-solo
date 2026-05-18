import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import dayjs from 'dayjs'

function Viewings() {
  const [viewings, setViewings] = useState([])
  const [customers, setCustomers] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    customer_id: '', property_id: '', viewing_time: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [viewingsRes, customersRes, propertiesRes] = await Promise.all([
        api.get('/viewings'),
        api.get('/customers?pageSize=100'),
        api.get('/properties?pageSize=100&status=available'),
      ])
      setViewings(viewingsRes.data.data?.list || [])
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
      await api.post('/viewings', form)
      setShowModal(false)
      setForm({ customer_id: '', property_id: '', viewing_time: '' })
      loadData()
    } catch (error) {
      alert(error.response?.data?.message || '操作失败')
    }
  }

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/viewings/${id}`, { status })
      loadData()
    } catch (error) {
      alert('更新失败')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: <span className="badge badge-primary">已预约</span>,
      completed: <span className="badge badge-success">已完成</span>,
      cancelled: <span className="badge badge-error">已取消</span>,
    }
    return badges[status] || status
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div>
      <div className="flex flex-between items-center mb-20">
        <h1 className="page-title" style={{ margin: 0 }}>带看管理</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 安排带看
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>客户</th>
              <th>房源</th>
              <th>带看时间</th>
              <th>经纪人</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {viewings.length === 0 ? (
              <tr><td colSpan="6" className="empty">暂无数据</td></tr>
            ) : (
              viewings.map(viewing => (
                <tr key={viewing.id}>
                  <td>{viewing.customer_name || '-'}</td>
                  <td>{viewing.property_address || '-'}</td>
                  <td>{dayjs(viewing.viewing_time).format('YYYY-MM-DD HH:mm')}</td>
                  <td>{viewing.agent_name || '-'}</td>
                  <td>{getStatusBadge(viewing.status)}</td>
                  <td>
                    {viewing.status === 'scheduled' && (
                    <>
                      <button className="btn btn-success" style={{ padding: '4px 8px', fontSize: '12px', marginRight: 4 }} onClick={() => handleUpdateStatus(viewing.id, 'completed')}>完成</button>
                      <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleUpdateStatus(viewing.id, 'cancelled')}>取消</button>
                    </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 400 }}>
            <h2 style={{ marginBottom: 20 }}>安排带看</h2>
            <form onSubmit={handleSubmit}>
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
              <div className="form-group">
                <label className="form-label">带看时间 *</label>
                <input type="datetime-local" className="form-input" value={form.viewing_time} onChange={(e) => setForm({ ...form, viewing_time: e.target.value })} required />
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

export default Viewings
