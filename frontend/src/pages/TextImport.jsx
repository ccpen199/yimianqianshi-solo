import React, { useState, useEffect } from 'react'
import {
  Typography,
  Button,
  Space,
  Table,
  Upload,
  message,
  Tag,
  Spin,
  Card
} from 'antd'
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons'
import request from '../utils/request'

const { Title } = Typography

function TextImport() {
  const [batches, setBatches] = useState([])
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    try {
      const res = await request({ url: '/texts/batches' })
      if (res.success) {
        setBatches(res.data || [])
      }
    } catch (error) {
      console.error('Failed to load batches:', error)
    }
  }

  const loadSamples = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const res = await request({
        url: '/texts/samples',
        params: { page, page_size: pageSize }
      })
      if (res.success) {
        setSamples(res.data?.list || [])
        setPagination({
          current: page,
          pageSize,
          total: res.data?.total || 0
        })
      }
    } catch (error) {
      console.error('Failed to load samples:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source', 'upload')
    formData.append('language', 'zh-CN')

    try {
      const res = await request({
        url: '/texts/import',
        method: 'POST',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (res.success) {
        message.success(`导入成功: ${res.data.success_count} 条，失败: ${res.data.failed_count} 条`)
        loadBatches()
        loadSamples()
      }
    } catch (error) {
      message.error('导入失败')
    } finally {
      setUploading(false)
    }
    
    return false
  }

  const batchColumns = [
    { title: '批次号', dataIndex: 'batch_no', key: 'batch_no' },
    { title: '来源', dataIndex: 'source', key: 'source' },
    { title: '语言', dataIndex: 'language', key: 'language' },
    { 
      title: '数量', 
      key: 'count',
      render: (_, record) => `成功: ${record.success_count || 0}, 失败: ${record.failed_count || 0}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'completed' ? 'green' : 'orange'}>
          {status === 'completed' ? '已完成' : '处理中'}
        </Tag>
      )
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' }
  ]

  const sampleColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '来源', dataIndex: 'source', key: 'source', width: 100 },
    {
      title: '状态',
      dataIndex: 'clean_status',
      key: 'clean_status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'abnormal' ? 'red' : status === 'cleaned' ? 'green' : 'blue'}>
          {status === 'abnormal' ? '异常' : status === 'cleaned' ? '已清洗' : '原始'}
        </Tag>
      )
    },
    {
      title: '标注状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          pending: { color: 'orange', text: '待标注' },
          annotating: { color: 'blue', text: '标注中' },
          annotated: { color: 'purple', text: '已标注' },
          reviewing: { color: 'cyan', text: '审核中' },
          reviewed: { color: 'green', text: '已审核' },
          rejected: { color: 'red', text: '已退回' }
        }
        const s = statusMap[status] || { color: 'default', text: status }
        return <Tag color={s.color}>{s.text}</Tag>
      }
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3}>文本样本管理</Title>
        <Upload
          accept=".csv,.xlsx,.xls"
          beforeUpload={handleUpload}
          showUploadList={false}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
            导入文本
          </Button>
        </Upload>
      </div>

      <Card title="导入批次" style={{ marginBottom: 24 }}>
        <Table
          columns={batchColumns}
          dataSource={batches}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>

      <Card title="文本样本列表" extra={
        <Button onClick={() => loadSamples()}>刷新</Button>
      }>
        <Table
          columns={sampleColumns}
          dataSource={samples}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => loadSamples(page, pageSize),
            showSizeChanger: true,
            showQuickJumper: true
          }}
        />
      </Card>
    </div>
  )
}

export default TextImport
