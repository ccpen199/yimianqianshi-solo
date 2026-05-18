import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import dayjs from 'dayjs'

function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', phone: '', budget_min: '', budget_max: '', areas: '',
    house_types: '', school_district: '', loan_ability: '',
    purchase_stage: '', privacy_authorized: false
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers')
      setCustomers(res.data.data?.list || [])
    } catch (error) {
      console.error('加载客户失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form)
      } else {
        await api.post('/customers', form)
      }
      setShowModal(false)
      setEditing(null)
      setForm({ name: '', phone: '', budget_min: '', budget_max: '', areas: '', house_types: '', school_district: '', loan_ability: '', purchase_stage: '', privacy_authorized: false })
      loadCustomers()
    } catch (error) {
      alert(error.response?.data?.message || '操作失败')
    }
  }

  const handleEdit = (customer) => {
    setEditing(customer)
    setForm({ ...customer })
    setShowModal(true)
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: <span className="badge badge-success">有效</span>,
      inactive: <span className="badge badge-error">无效</span>,
    }
    return badges[status] || status
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div>
      <div className="flex flex-between items-center mb-20">
        <h1 className="page-title" style={{ margin: 0 }}>客户管理</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 新增客户
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>电话</th>
              <th>预算区间</th>
              <th>意向区域</th>
              <th>购房阶段</th>
              <th>经纪人</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan="8" className="empty">暂无数据</td></tr>
            ) : (
              customers.map(customer => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.budget_min || 0} - {customer.budget_max || 0}</td>
                  <td>{customer.areas || '-'}</td>
                  <td>{customer.purchase_stage || '-'}</td>
                  <td>{customer.agent_name || '-'}</td>
                  <td>{getStatusBadge(customer.status)}</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(customer)}>编辑</button>
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
            <h2 style={{ marginBottom: 20 }}>{editing ? '编辑客户' : '新增客户'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">姓名 *</label>
                <input type="text" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">电话 *</label>
                <input type="text" className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">最低预算</label>
                  <input type="number" className="form-input" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">最高预算</label>
                  <input type="number" className="form-input" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">意向区域</label>
                <input type="text" className="form-input" value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">购房阶段</label>
                <select className="form-input" value={form.purchase_stage} onChange={(e) => setForm({ ...form, purchase_stage: e.target.value })}>
                  <option value="">请选择</option>
                  <option value="看房中">看房中</option>
                  <option value="意向中">意向中</option>
                  <option value="谈判中">谈判中</option>
                  <option value="已成交">已成交</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.privacy_authorized} onChange={(e) => setForm({ ...form, privacy_authorized: e.target.checked })} />
                  隐私授权
                </label>
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

export default Customers
