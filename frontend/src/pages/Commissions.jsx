import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import dayjs from 'dayjs'

function Commissions() {
  const [commissions, setCommissions] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, monthly: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [commRes, statsRes] = await Promise.all([
        api.get('/commissions'),
        api.get('/commissions/stats'),
      ])
      setCommissions(commRes.data.data?.list || [])
      setStats(statsRes.data.data || { total: 0, pending: 0, monthly: 0 })
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/commissions/${id}`, { status, payment_date: new Date().toISOString() })
      loadData()
    } catch (error) {
      alert('更新失败')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: <span className="badge badge-warning">待发放</span>,
      paid: <span className="badge badge-success">已发放</span>,
    }
    return badges[status] || status
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div>
      <h1 className="page-title">佣金财务</h1>
      
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#52c41a' }}>{stats.total}万</div>
          <div className="stat-label">累计已发佣金</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#faad14' }}>{stats.pending}万</div>
          <div className="stat-label">待发放佣金</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#1890ff' }}>{stats.monthly}万</div>
          <div className="stat-label">本月发放佣金</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>经纪人</th>
              <th>房源</th>
              <th>金额(万)</th>
              <th>比例</th>
              <th>发放时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {commissions.length === 0 ? (
              <tr><td colSpan="7" className="empty">暂无数据</td></tr>
            ) : (
              commissions.map(commission => (
                <tr key={commission.id}>
                  <td>{commission.user_name || '-'}</td>
                  <td>{commission.property_address || '-'}</td>
                  <td>{commission.amount || '-'}</td>
                  <td>{(commission.percentage * 100).toFixed(0)}%</td>
                  <td>{commission.payment_date ? dayjs(commission.payment_date).format('YYYY-MM-DD') : '-'}</td>
                  <td>{getStatusBadge(commission.status)}</td>
                  <td>
                    {commission.status === 'pending' && (
                      <button className="btn btn-success" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleUpdateStatus(commission.id, 'paid')}>确认发放</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Commissions
