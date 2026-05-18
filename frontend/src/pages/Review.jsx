import React, { useState, useEffect } from 'react'
import { Typography, Button, Space, Card, Table, Tag, Modal, Input, message, Spin, Statistic, Row, Col } from 'antd'
import { CheckOutlined, CloseOutlined, WarningOutlined } from '@ant-design/icons'
import request from '../utils/request'

const { Title, Text } = Typography
const { TextArea } = Input

function Review({ user }) {
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSample, setSelectedSample] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, conflict: 0, agreement_rate: 0 })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  useEffect(() => {
    loadPendingReviews()
    loadStats()
  }, [])

  const loadPendingReviews = async () => {
    setLoading(true)
    try {
      const res = await request({ url: '/reviews/pending', params: { page: 1, page_size: 20 } })
      if (res.success) {
        setSamples(res.data?.list || [])
        setPagination(prev => ({ ...prev, total: res.data?.total || 0 }))
      }
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await request({ url: '/reviews/stats' })
      if (res.success) {
        setStats(res.data || {})
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleApprove = async (sample) => {
    try {
      await request({
        url: '/reviews',
        method: 'POST',
        data: {
          sample_id: sample.id,
          reviewer_id: user.id,
          status: 'approved'
        }
      })
      message.success('审核通过')
      loadPendingReviews()
      loadStats()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleReject = (sample) => {
    setSelectedSample(sample)
    setRejectReason('')
    setModalVisible(true)
  }

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      message.warning('请填写退回原因')
      return
    }

    try {
      await request({
        url: '/reviews',
        method: 'POST',
        data: {
          sample_id: selectedSample.id,
          reviewer_id: user.id,
          status: 'rejected',
          reject_reason: rejectReason
        }
      })
      message.success('已退回')
      setModalVisible(false)
      loadPendingReviews()
      loadStats()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleMarkConflict = async (sample) => {
    try {
      await request({
        url: '/reviews',
        method: 'POST',
        data: {
          sample_id: sample.id,
          reviewer_id: user.id,
          status: 'conflict'
        }
      })
      message.success('已标记为冲突')
      loadPendingReviews()
      loadStats()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '批次', dataIndex: 'batch_no', key: 'batch_no', width: 120 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record)}
          >
            通过
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => handleReject(record)}
          >
            退回
          </Button>
          <Button
            size="small"
            icon={<WarningOutlined />}
            onClick={() => handleMarkConflict(record)}
          >
            冲突
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3}>审核任务</Title>
        <Button onClick={loadPendingReviews}>刷新</Button>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="待审核" value={samples.length} prefix={<WarningOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="已通过" value={stats.approved} prefix={<CheckOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="已退回" value={stats.rejected} prefix={<CloseOutlined style={{ color: '#ff4d4f' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="一致率" value={stats.agreement_rate} suffix="%" precision={2} />
          </Card>
        </Col>
      </Row>

      <Card title="待审核列表">
        <Table
          columns={columns}
          dataSource={samples}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => setPagination(prev => ({ ...prev, current: page, pageSize }))
          }}
          expandable={{
            expandedRowRender: (record) => (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{record.content}</p>
            )
          }}
        />
      </Card>

      <Modal
        title="退回原因"
        open={modalVisible}
        onOk={confirmReject}
        onCancel={() => setModalVisible(false)}
      >
        <TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请填写退回原因..."
        />
      </Modal>
    </div>
  )
}

export default Review
