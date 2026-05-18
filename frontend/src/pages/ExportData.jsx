import React, { useState, useEffect } from 'react'
import { Typography, Button, Space, Card, Table, Select, Form, message, Spin } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import request from '../utils/request'

const { Title } = Typography
const { Option } = Select

function ExportData() {
  const [versions, setVersions] = useState([])
  const [exports, setExports] = useState([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadVersions()
    loadExports()
  }, [])

  const loadVersions = async () => {
    try {
      const res = await request({ url: '/tags/versions' })
      if (res.success) {
        setVersions(res.data || [])
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
    }
  }

  const loadExports = async () => {
    try {
      const res = await request({ url: '/exports' })
      if (res.success) {
        setExports(res.data || [])
      }
    } catch (error) {
      console.error('Failed to load exports:', error)
    }
  }

  const handleExport = async (values) => {
    setLoading(true)
    try {
      const res = await request({
        url: '/exports',
        method: 'POST',
        data: {
          task_name: `导出_${new Date().toLocaleDateString()}`,
          version_id: values.version_id,
          statuses: values.statuses || []
        }
      })
      if (res.success) {
        message.success('导出任务创建成功')
        loadExports()
      }
    } catch (error) {
      message.error('导出失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (exportId) => {
    try {
      window.open(`/api/exports/download/${exportId}`, '_blank')
      message.success('开始下载')
    } catch (error) {
      message.error('下载失败')
    }
  }

  const columns = [
    { title: '任务名称', dataIndex: 'task_name', key: 'task_name' },
    { 
      title: '标签版本', 
      dataIndex: 'version_id', 
      key: 'version_id',
      render: (id) => versions.find(v => v.id === id)?.version || id
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          processing: { color: 'blue', text: '处理中' },
          completed: { color: 'green', text: '已完成' },
          failed: { color: 'red', text: '失败' }
        }
        const s = statusMap[status] || { color: 'default', text: status }
        return <Tag color={s.color}>{s.text}</Tag>
      }
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        record.status === 'completed' ? (
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.id)}
          >
            下载
          </Button>
        ) : null
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3}>数据导出</Title>
      </div>

      <Card title="创建导出任务" style={{ marginBottom: 24 }}>
        <Form form={form} layout="inline" onFinish={handleExport}>
          <Form.Item name="version_id" label="标签版本" rules={[{ required: true }]}>
            <Select style={{ width: 200 }} placeholder="选择标签版本">
              {versions.map(v => (
                <Option key={v.id} value={v.id}>{v.version} - {v.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="statuses" label="标注状态">
            <Select mode="multiple" style={{ width: 200 }} placeholder="选择状态（空为全部）">
              <Option value="annotated">已标注</Option>
              <Option value="reviewed">已审核</Option>
              <Option value="rejected">已退回</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<DownloadOutlined />}>
              导出数据
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="导出历史">
        <Table
          columns={columns}
          dataSource={exports}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}

export default ExportData
