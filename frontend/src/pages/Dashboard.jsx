import React, { useState, useEffect } from 'react'
import api from '../utils/api'
import dayjs from 'dayjs'

function Dashboard() {
  const [stats, setStats] = useState({
    customers: 0,
    properties: 0,
    viewings: 0,
    contracts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [customersRes, propertiesRes, viewingsRes, contractsRes] = await Promise.all([
        api.get('/customers?pageSize=1'),
        api.get('/properties?pageSize=1'),
        api.get('/viewings?pageSize=1'),
        api.get('/contracts?pageSize=1'),
      ])

      setStats({
        customers: customersRes.data.data?.total || 0,
        properties: propertiesRes.data.data?.total || 0,
        viewings: viewingsRes.data.data?.total || 0,
        contracts: contractsRes.data.data?.total || 0,
      })
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div>
      <h1 className="page-title">首页</h1>
      <div className="grid grid-4">
        <div className="stat-card">
          <div className="stat-value">{stats.customers}</div>
          <div className="stat-label">客户总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.properties}</div>
          <div className="stat-label">房源总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.viewings}</div>
          <div className="stat-label">带看总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.contracts}</div>
          <div className="stat-label">合同总数</div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
