import React, { useState, useEffect } from 'react'
import {
  Typography,
  Button,
  Space,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Tree,
  message,
  Spin,
  Popconfirm
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import request from '../utils/request'

const { Title } = Typography
const { Option } = Select
const { TextArea } = Input

function TagManagement() {
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [versionModalVisible, setVersionModalVisible] = useState(false)
  const [tagModalVisible, setTagModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [tagForm] = Form.useForm()

  useEffect(() => {
    loadVersions()
  }, [])

  const loadVersions = async () => {
    setLoading(true)
    try {
      const res = await request({ url: '/tags/versions' })
      if (res.success) {
        setVersions(res.data || [])
        if (res.data && res.data.length > 0 && !selectedVersion) {
          selectVersion(res.data[0])
        }
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectVersion = async (version) => {
    setSelectedVersion(version)
    if (version) {
      setLoading(true)
      try {
        const res = await request({ url: `/tags/versions/${version.id}/tags` })
        if (res.success) {
          setTags(res.data || [])
        }
      } catch (error) {
        console.error('Failed to load tags:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCreateVersion = async (values) => {
    try {
      const res = await request({
        url: '/tags/versions',
        method: 'POST',
        data: values
      })
      if (res.success) {
        message.success('版本创建成功')
        setVersionModalVisible(false)
        form.resetFields()
        loadVersions()
      }
    } catch (error) {
      message.error('创建版本失败')
    }
  }

  const handleCreateTag = async (values) => {
    try {
      const res = await request({
        url: `/tags/versions/${selectedVersion.id}/tags`,
        method: 'POST',
        data: {
          ...values,
          parent_id: values.parent_id || null
        }
      })
      if (res.success) {
        message.success('标签创建成功')
        setTagModalVisible(false)
        tagForm.resetFields()
        selectVersion(selectedVersion)
      }
    } catch (error) {
      message.error('创建标签失败')
    }
  }

  const handlePublishVersion = async (versionId) => {
    try {
      const res = await request({
        url: `/tags/versions/${versionId}/publish`,
        method: 'PUT'
      })
      if (res.success) {
        message.success('版本发布成功')
        loadVersions()
      }
    } catch (error) {
      message.error('发布版本失败')
    }
  }

  const handleDeleteTag = async (tagId) => {
    try {
      const res = await request({
        url: `/tags/${tagId}`,
        method: 'DELETE'
      })
      if (res.success) {
        message.success('标签删除成功')
        selectVersion(selectedVersion)
      }
    } catch (error) {
      message.error('删除标签失败')
    }
  }

  const columns = [
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version'
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'published' ? 'green' : 'orange'}>
          {status === 'published' ? '已发布' : '草稿'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => selectVersion(record)}
          >
            查看标签
          </Button>
          {record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<UploadOutlined />}
              onClick={() => handlePublishVersion(record.id)}
            >
              发布
            </Button>
          )}
        </Space>
      )
    }
  ]

  const renderTreeNodes = (data) =>
    data?.map((item) => ({
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>
            {item.name}
            <Tag color={item.color} style={{ marginLeft: 8 }}>{item.code}</Tag>
          </span>
          <Space>
            <Tag>{item.rule_type === 'single' ? '互斥' : '多选'}</Tag>
            <Popconfirm
              title="确定要删除这个标签吗？"
              onConfirm={() => handleDeleteTag(item.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </div>
      ),
      key: item.id,
      children: item.children?.length > 0 ? renderTreeNodes(item.children) : null
    }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3}>标签体系管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setVersionModalVisible(true)}>
          创建标签版本
        </Button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Table
          columns={columns}
          dataSource={versions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </div>

      {selectedVersion && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4}>
              版本 {selectedVersion.version} - {selectedVersion.name} 的标签
            </Title>
            {selectedVersion.status === 'draft' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setTagModalVisible(true)}>
                添加标签
              </Button>
            )}
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin tip="加载中..." />
            </div>
          ) : tags && tags.length > 0 ? (
            <Tree
              showLine
              defaultExpandAll
              treeData={renderTreeNodes(tags)}
            />
          ) : (
            <p style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无标签</p>
          )}
        </div>
      )}

      <Modal
        title="创建标签版本"
        open={versionModalVisible}
        onCancel={() => setVersionModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleCreateVersion} layout="vertical">
          <Form.Item name="version" label="版本号" rules={[{ required: true }]}>
            <Input placeholder="例如: v1.0.0" />
          </Form.Item>
          <Form.Item name="name" label="版本名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 情感分类标签" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加标签"
        open={tagModalVisible}
        onCancel={() => setTagModalVisible(false)}
        footer={null}
      >
        <Form form={tagForm} onFinish={handleCreateTag} layout="vertical">
          <Form.Item name="parent_id" label="父标签">
            <Select placeholder="选择父标签（不选为一级标签）" allowClear>
              {tags.map(tag => (
                <Option key={tag.id} value={tag.id}>{tag.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="标签名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 正面" />
          </Form.Item>
          <Form.Item name="code" label="标签编码" rules={[{ required: true }]}>
            <Input placeholder="例如: positive" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="example" label="示例">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="rule_type" label="规则类型" initialValue="multiple">
            <Select>
              <Option value="single">互斥（单选）</Option>
              <Option value="multiple">多选</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              添加
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TagManagement
