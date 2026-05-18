import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Spin,
  Alert,
  Row,
  Col,
  Statistic,
  Progress
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { salesApi } from '../api/client';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const Sales = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSales, setEditingSales] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await salesApi.getList();
      setSalesList(response.data.data || []);
    } catch (err) {
      setError('加载销售列表失败');
      console.error('Fetch sales error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values) => {
    try {
      await salesApi.create({
        ...values,
        regions: values.regions || [],
        industries: values.industries || []
      });
      message.success('创建销售成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchSales();
    } catch (err) {
      console.error('Create sales error:', err);
    }
  };

  const handleEdit = async (values) => {
    try {
      await salesApi.update(editingSales.id, {
        ...values,
        regions: values.regions || [],
        industries: values.industries || []
      });
      message.success('更新销售成功');
      setEditModalVisible(false);
      setEditingSales(null);
      form.resetFields();
      fetchSales();
    } catch (err) {
      console.error('Edit sales error:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await salesApi.delete(id);
      message.success('删除销售成功');
      fetchSales();
    } catch (err) {
      console.error('Delete sales error:', err);
    }
  };

  const handleToggleActive = async (record) => {
    try {
      await salesApi.update(record.id, { is_active: !record.is_active });
      message.success(record.is_active ? '已禁用销售' : '已启用销售');
      fetchSales();
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  const openEditModal = (record) => {
    setEditingSales(record);
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      phone: record.phone,
      regions: record.regions || [],
      industries: record.industries || [],
      max_capacity: record.max_capacity
    });
    setEditModalVisible(true);
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <UserOutlined />
          {text}
          {!record.is_active && <Tag color="red">已禁用</Tag>}
        </Space>
      )
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text || '-'
    },
    {
      title: '负责区域',
      dataIndex: 'regions',
      key: 'regions',
      render: (regions) => (
        <Space wrap>
          {(regions || []).map(r => <Tag key={r}>{r}</Tag>)}
          {(regions || []).length === 0 && '-'}
        </Space>
      )
    },
    {
      title: '负责行业',
      dataIndex: 'industries',
      key: 'industries',
      render: (industries) => (
        <Space wrap>
          {(industries || []).map(i => <Tag key={i} color="blue">{i}</Tag>)}
          {(industries || []).length === 0 && '-'}
        </Space>
      )
    },
    {
      title: '线索容量',
      key: 'capacity',
      render: (_, record) => {
        const load = record.current_load || 0;
        const max = record.max_capacity || 50;
        const percent = Math.round((load / max) * 100);
        return (
          <div style={{ width: 120 }}>
            <Progress
              percent={percent}
              size="small"
              status={percent >= 100 ? 'exception' : 'active'}
            />
            <div style={{ fontSize: 12, textAlign: 'center' }}>
              {load}/{max}
            </div>
          </div>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={record.is_active ? <CloseOutlined /> : <CheckOutlined />}
            onClick={() => handleToggleActive(record)}
          >
            {record.is_active ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个销售吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在加载销售列表...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button onClick={fetchSales}>点击重试</Button>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>销售团队管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          添加销售
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="销售总人数"
              value={salesList.length}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="当前活跃"
              value={salesList.filter(s => s.is_active).length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总线索容量"
              value={salesList.reduce((sum, s) => sum + (s.max_capacity || 0), 0)}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已分配线索"
              value={salesList.reduce((sum, s) => sum + (s.current_load || 0), 0)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={salesList}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="添加销售代表"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item label="电话" name="phone">
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item label="负责区域" name="regions">
            <Select mode="multiple" placeholder="请选择负责区域">
              <Option value="North">华北</Option>
              <Option value="East">华东</Option>
              <Option value="South">华南</Option>
              <Option value="West">华西</Option>
              <Option value="Central">华中</Option>
            </Select>
          </Form.Item>
          <Form.Item label="负责行业" name="industries">
            <Select mode="multiple" placeholder="请选择负责行业">
              <Option value="Technology">科技</Option>
              <Option value="Finance">金融</Option>
              <Option value="Healthcare">医疗</Option>
              <Option value="Education">教育</Option>
              <Option value="E-commerce">电商</Option>
              <Option value="Manufacturing">制造</Option>
            </Select>
          </Form.Item>
          <Form.Item label="最大线索容量" name="max_capacity">
            <Input type="number" placeholder="默认50" defaultValue={50} />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑销售代表"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleEdit}>
          <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item label="电话" name="phone">
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item label="负责区域" name="regions">
            <Select mode="multiple" placeholder="请选择负责区域">
              <Option value="North">华北</Option>
              <Option value="East">华东</Option>
              <Option value="South">华南</Option>
              <Option value="West">华西</Option>
              <Option value="Central">华中</Option>
            </Select>
          </Form.Item>
          <Form.Item label="负责行业" name="industries">
            <Select mode="multiple" placeholder="请选择负责行业">
              <Option value="Technology">科技</Option>
              <Option value="Finance">金融</Option>
              <Option value="Healthcare">医疗</Option>
              <Option value="Education">教育</Option>
              <Option value="E-commerce">电商</Option>
              <Option value="Manufacturing">制造</Option>
            </Select>
          </Form.Item>
          <Form.Item label="最大线索容量" name="max_capacity">
            <Input type="number" placeholder="默认50" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setEditModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Sales;