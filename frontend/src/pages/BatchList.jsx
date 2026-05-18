import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Card,
  Row,
  Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { batchApi, qualityApi } from '../api/services';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

function BatchList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState(null);

  const fetchData = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    batchApi.getList({ page, pageSize })
      .then(res => {
        if (res.success) {
          setData(res.data.list);
          setPagination({
            current: page,
            pageSize,
            total: res.data.total
          });
        }
      })
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    qualityApi.getStats({})
      .then(res => {
        if (res.success) {
          setStats(res.data);
        }
      });
  };

  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    const res = await batchApi.delete(id);
    if (res.success) {
      message.success('删除成功');
      fetchData();
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      let res;
      if (editingItem) {
        res = await batchApi.update(editingItem.id, values);
      } else {
        res = await batchApi.create(values);
      }
      if (res.success) {
        message.success(editingItem ? '更新成功' : '创建成功');
        setModalVisible(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewAudio = (batchId) => {
    navigate(`/annotation?batchId=${batchId}`);
  };

  const columns = [
    {
      title: '批次名称',
      dataIndex: 'name',
      key: 'name',
      width: 180
    },
    {
      title: '采集来源',
      dataIndex: 'source',
      key: 'source',
      width: 120
    },
    {
      title: '采样率',
      dataIndex: 'sample_rate',
      key: 'sample_rate',
      width: 100,
      render: (val) => val ? `${val} Hz` : '-'
    },
    {
      title: '噪声等级',
      dataIndex: 'noise_level',
      key: 'noise_level',
      width: 100,
      render: (val) => {
        const map = { low: '低', medium: '中', high: '高', unknown: '未知' };
        return map[val] || val;
      }
    },
    {
      title: '授权状态',
      dataIndex: 'authorization_status',
      key: 'authorization_status',
      width: 100,
      render: (val) => {
        const colorMap = { pending: 'orange', authorized: 'green', unauthorized: 'red' };
        const textMap = { pending: '待确认', authorized: '已授权', unauthorized: '未授权' };
        return <Tag color={colorMap[val]}>{textMap[val] || val}</Tag>;
      }
    },
    {
      title: '切分策略',
      dataIndex: 'split_strategy',
      key: 'split_strategy',
      width: 100,
      render: (val) => {
        const map = { auto: '自动切分', manual: '手动切分' };
        return map[val] || val;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val) => {
        const colorMap = { created: 'blue', processing: 'orange', completed: 'green' };
        const textMap = { created: '已创建', processing: '处理中', completed: '已完成' };
        return <Tag color={colorMap[val]}>{textMap[val] || val}</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (val) => dayjs(val).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewAudio(record.id)}>
            音频
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">批次管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建批次
        </Button>
      </div>

      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
          <Card className="stats-card">
            <div className="stats-value">{stats.total_segments || 0}</div>
            <div className="stats-label">总片段数</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <div className="stats-value" style={{ color: '#52c41a' }}>
              {stats.completed_segments || 0}
            </div>
            <div className="stats-label">已完成</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <div className="stats-value" style={{ color: '#fa8c16' }}>
              {stats.rework_segments || 0}
            </div>
            <div className="stats-label">待返工</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stats-card">
            <div className="stats-value" style={{ color: '#722ed1' }}>
              {((stats.avg_wer || 0) * 100).toFixed(1)}%
            </div>
            <div className="stats-label">平均字错率</div>
          </Card>
        </Col>
      </Row>
      )}

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => fetchData(page, pageSize)
        }}
      />

      <Modal
        title={editingItem ? '编辑批次' : '新建批次'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="批次名称" rules={[{ required: true, message: '请输入批次名称' }]}>
            <Input placeholder="请输入批次名称" />
          </Form.Item>
          <Form.Item name="source" label="采集来源" rules={[{ required: true, message: '请输入采集来源' }]}>
            <Input placeholder="例如：客服中心、电话录音等" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sample_rate" label="采样率" initialValue={16000}>
                <Select>
                  <Option value={8000}>8000 Hz</Option>
                  <Option value={16000}>16000 Hz</Option>
                  <Option value={22050}>22050 Hz</Option>
                  <Option value={44100}>44100 Hz</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="noise_level" label="噪声等级" initialValue="unknown">
                <Select>
                  <Option value="low">低</Option>
                  <Option value="medium">中</Option>
                  <Option value="high">高</Option>
                  <Option value="unknown">未知</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="authorization_status" label="授权状态" initialValue="pending">
                <Select>
                  <Option value="pending">待确认</Option>
                  <Option value="authorized">已授权</Option>
                  <Option value="unauthorized">未授权</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="split_strategy" label="切分策略" initialValue="auto">
                <Select>
                  <Option value="auto">自动切分</Option>
                  <Option value="manual">手动切分</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default BatchList;