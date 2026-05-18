import React, { useState, useEffect } from 'react'
import api from '../utils/api'

function Properties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    owner_name: '', owner_phone: '', address: '', price: '', area: '',
    house_type: '', floor: '', orientation: '', has_key: false,
    viewing_restrictions: '', is_sensitive: false, status: 'available'
  })

  useEffect(() => {
    loadProperties()
  }, [])

  const loadProperties = async () => {
    try {
      const res = await api.get('/properties')
      setProperties(res.data.data?.list || [])
    } catch (error) {
      console.error('加载房源失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/properties/${editing.id}`, form)
      } else {
        await api.post('/properties', form)
      }
      setShowModal(false)
      setEditing(null)
      setForm({ owner_name: '', owner_phone: '', address: '', price: '', area: '', house_type: '', floor: '', orientation: '', has_key: false, viewing_restrictions: '', is_sensitive: false, status: 'available' })
      loadProperties()
    } catch (error) {
      alert(error.response?.data?.message || '操作失败')
    }
  }

  const handleEdit = (property) => {
    setEditing(property)
    setForm({ ...property })
    setShowModal(true)
  }

  const getStatusBadge = (status) => {
    const badges = {
      available: <span className="badge badge-success">可售</span>,
      sold: <span className="badge badge-error">已售</span>,
      off: <span className="badge badge-warning">下架</span>,
    }
    return badges[status] || status
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div>
      <div className="flex flex-between items-center mb-20">
        <h1 className="page-title" style={{ margin: 0 }}>房源管理</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 新增房源
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>地址</th>
              <th>业主</th>
              <th>价格(万)</th>
              <th>面积(㎡)</th>
              <th>房型</th>
              <th>有钥匙</th>
              <th>经纪人</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 ? (
              <tr><td colSpan="9" className="empty">暂无数据</td></tr>
            ) : (
              properties.map(property => (
                <tr key={property.id}>
                  <td>{property.address}</td>
                  <td>{property.owner_name}</td>
                  <td>{property.price}</td>
                  <td>{property.area || '-'}</td>
                  <td>{property.house_type || '-'}</td>
                  <td>{property.has_key ? '是' : '否'}</td>
                  <td>{property.agent_name || '-'}</td>
                  <td>{getStatusBadge(property.status)}</td>
                  <td>
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(property)}>编辑</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 20 }}>{editing ? '编辑房源' : '新增房源'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">业主姓名 *</label>
                  <input type="text" className="form-input" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">业主电话 *</label>
                  <input type="text" className="form-input" value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">房源地址 *</label>
                <input type="text" className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">价格(万) *</label>
                  <input type="number" className="form-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">面积(㎡)</label>
                  <input type="number" className="form-input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">房型</label>
                  <input type="text" className="form-input" value={form.house_type} onChange={(e) => setForm({ ...form, house_type: e.target.value })} placeholder="如：3室2厅" />
                </div>
                <div className="form-group">
                  <label className="form-label">楼层</label>
                  <input type="text" className="form-input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">朝向</label>
                  <select className="form-input" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })}>
                    <option value="">请选择</option>
                    <option value="东">东</option>
                    <option value="南">南</option>
                    <option value="西">西</option>
                    <option value="北">北</option>
                    <option value="南北">南北通透</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">状态</label>
                  <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="available">可售</option>
                    <option value="sold">已售</option>
                    <option value="off">下架</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">看房限制</label>
                <input type="text" className="form-input" value={form.viewing_restrictions} onChange={(e) => setForm({ ...form, viewing_restrictions: e.target.value })} placeholder="如：提前2小时预约" />
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.has_key} onChange={(e) => setForm({ ...form, has_key: e.target.checked })} />
                  有钥匙
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.is_sensitive} onChange={(e) => setForm({ ...form, is_sensitive: e.target.checked })} />
                  敏感房源
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

export default Properties
