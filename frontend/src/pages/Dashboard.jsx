import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Typography, Spin, Empty } from 'antd'
import {
  FileTextOutlined,
  EditOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons'
import request from '../utils/request'

const { Title } = Typography

function Dashboard({ user }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTexts: 0,
    annotated: 0,
    reviewed: 0,
    pending: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [textsRes, reviewsRes] = await Promise.all([
        request({ url: '/texts/samples', params: { page: 1, page_size: 1 } }),
        request({ url: '/reviews/stats' }).catch(() => ({ data: { approved: 0, total: 0 } }))
      ])

      setStats({
        totalTexts: textsRes.data?.total || 0,
        annotated: textsRes.data?.total || 0,
        reviewed: reviewsRes.data?.approved || 0,
        pending: textsRes.data?.total ? textsRes.data.total - reviewsRes.data?.approved : 0
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>欢迎回来，{user?.username}</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="文本总数"
              value={stats.totalTexts}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已标注"
              value={stats.annotated}
              prefix={<EditOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已审核"
              value={stats.reviewed}
              prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待处理"
              value={stats.pending}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="快速开始">
            <Empty
              description="从左侧菜单选择功能开始使用"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
