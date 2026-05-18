import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Select, Modal, message, Tag, Typography, Statistic, Row, Col } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Quality = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPending();
    fetchStats();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const response = await api.get('/quality/pending');
      setRecords(response.data.records || []);
    } catch (error) {
      console.error('获取待质检记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/quality/stats');
      setStats(response.data || {});
    } catch (error) {
      console.error('获取质检统计失败:', error);
    }
  };

  const openAuditModal = (record) => {
    setCurrentRecord(record);
    form.resetFields();
    setAuditModalVisible(true);
  };

  const handleAudit = async (values) => {
    try {
      await api.post(`/quality/${currentRecord.id}/audit`, {
        quality_status: values.quality_status,
        quality_notes: values.quality_notes,
        reassign: values.quality_status === 'failed'
      });
      message.success('质检完成');
      setAuditModalVisible(false);
      fetchPending();
      fetchStats();
    } catch (error) {
      console.error('质检失败:', error);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'default', text: '待质检' },
      passed: { color: 'success', text: '通过' },
      failed: { color: 'error', text: '不通过' }
    };
    const s = statusMap[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const columns = [
    {
      title: '客户姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120
    },
    {
      title: '坐席',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 100
    },
    {
      title: '通话结果',
      dataIndex: 'callResult',
      key: 'callResult',
      width: 100,
      render: (text) => {
        const map = {
          connected: '接通',
          no_answer: '无人接听',
          busy: '忙音',
          invalid_number: '空号',
          rejected: '拒接'
        };
        return map[text] || text;
      }
    },
    {
      title: '处理结果',
      dataIndex: 'disposition',
      key: 'disposition',
      width: 100,
      render: (text) => {
        const map = {
          deal: '成交',
          follow_up: '待跟进',
          invalid: '无效',
          rejected: '拒绝',
          lost: '流失'
        };
        return map[text] || text;
      }
    },
    {
      title: '意向等级',
      dataIndex: 'intent_level',
      key: 'intent_level',
      width: 100
    },
    {
      title: '通话时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (text) => text ? `${Math.floor(text / 60)}:${(text % 60).toString().padStart(2, '0')}` : '-'
    },
    {
      title: '质检状态',
      dataIndex: 'quality_status',
      key: 'quality_status',
      width: 100,
      render: getStatusTag
    },
    {
      title: '通话时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => openAuditModal(record)}>
          质检
        </Button>
      )
    }
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>质检管理</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="待质检"
              value={stats.pending || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已通过"
              value={stats.passed || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="不通过"
              value={stats.failed || 0}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="待质检记录" loading={loading} className="page-card">
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="通话质检"
        open={auditModalVisible}
        width={600}
        onCancel={() => setAuditModalVisible(false)}
        footer={null}
      >
        {currentRecord && (
          <>
            <Card size="small" style={{ marginBottom: 16 }} title="通话信息">
              <p><strong>客户：</strong>{currentRecord.name}</p>
              <p><strong>手机号：</strong>{currentRecord.phone}</p>
              <p><strong>坐席：</strong>{currentRecord.agent_name}</p>
              <p><strong>意向等级：</strong>{currentRecord.intent_level || '-'}</p>
              <p><strong>通话备注：</strong>{currentRecord.notes || '-'}</p>
            </Card>

            <Form form={form} layout="vertical" onFinish={handleAudit}>
              <Form.Item
                name="quality_status"
                label="质检结果"
                rules={[{ required: true, message: '请选择质检结果' }]}
              >
                <Select placeholder="请选择">
                  <Option value="passed">通过</Option>
                  <Option value="failed">不通过，需重新拨打</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="quality_notes"
                label="质检备注"
              >
                <Select mode="tags" placeholder="选择或输入质检标签">
                  <Option value="话术不规范">话术不规范</Option>
                  <Option value="信息记录不全">信息记录不全</Option>
                  <Option value="未按流程操作">未按流程操作</Option>
                  <Option value="服务态度不佳">服务态度不佳</Option>
                </Select>
              </Form.Item>

              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Button onClick={() => setAuditModalVisible(false)} style={{ marginRight: 8 }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  确认
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Quality;
