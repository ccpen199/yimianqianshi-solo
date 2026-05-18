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
  message,
  Popconfirm,
  Spin,
  Alert,
  Row,
  Col,
  Divider
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import { rulesApi } from '../api/client';
import dayjs from 'dayjs';

const { TextArea } = Input;

const Rules = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rules, setRules] = useState([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await rulesApi.getList();
      setRules(response.data.data || []);
    } catch (err) {
      setError('加载规则列表失败');
      console.error('Fetch rules error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values) => {
    try {
      const profileRules = values.profile_rules
        .split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
          const parts = line.split(',');
          return {
            id: `profile_${index}`,
            field: parts[0]?.trim(),
            value: parts[1]?.trim(),
            score: parseInt(parts[2]) || 0,
            label: parts[3]?.trim() || parts[1]
          };
        });

      const behaviorRules = values.behavior_rules
        .split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
          const parts = line.split(',');
          return {
            id: `behavior_${index}`,
            type: parts[0]?.trim(),
            score: parseInt(parts[1]) || 0,
            label: parts[2]?.trim() || parts[0],
            decay_days: parseInt(parts[3]) || 30
          };
        });

      const negativeRules = values.negative_rules
        .split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
          const parts = line.split(',');
          return {
            id: `negative_${index}`,
            field: parts[0]?.trim(),
            penalty: -Math.abs(parseInt(parts[1]) || 0),
            label: parts[2]?.trim() || parts[0]
          };
        });

      await rulesApi.create({
        version: values.version,
        name: values.name,
        description: values.description,
        profile_rules: profileRules,
        behavior_rules: behaviorRules,
        negative_rules: negativeRules
      });

      message.success('创建评分规则成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchRules();
    } catch (err) {
      console.error('Create rule error:', err);
    }
  };

  const handleActivate = async (id) => {
    try {
      await rulesApi.activate(id);
      message.success('激活规则成功');
      fetchRules();
    } catch (err) {
      console.error('Activate rule error:', err);
    }
  };

  const columns = [
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      render: (text, record) => (
        <Space>
          {text}
          {record.is_active && <Tag color="green">当前版本</Tag>}
        </Space>
      )
    },
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '画像规则数',
      dataIndex: 'profile_rules',
      key: 'profile_count',
      render: (rules) => (rules || []).length
    },
    {
      title: '行为规则数',
      dataIndex: 'behavior_rules',
      key: 'behavior_count',
      render: (rules) => (rules || []).length
    },
    {
      title: '扣分规则数',
      dataIndex: 'negative_rules',
      key: 'negative_count',
      render: (rules) => (rules || []).length
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
          {!record.is_active && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleActivate(record.id)}
            >
              激活
            </Button>
          )}
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在加载规则列表...</p>
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
          <Button onClick={fetchRules}>点击重试</Button>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>评分规则管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          新建规则版本
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          pagination={false}
          expandedRowRender={record => (
            <div>
              <Row gutter={24}>
                <Col span={8}>
                  <h4>画像规则</h4>
                  <ul>
                    {(record.profile_rules || []).map((rule, index) => (
                      <li key={index}>
                        {rule.label}: +{rule.score}分
                        <span style={{ color: '#999', marginLeft: 8 }}>
                          ({rule.field} = {rule.value})
                        </span>
                      </li>
                    ))}
                  </ul>
                </Col>
                <Col span={8}>
                  <h4>行为规则</h4>
                  <ul>
                    {(record.behavior_rules || []).map((rule, index) => (
                      <li key={index}>
                        {rule.label}: +{rule.score}分
                        <span style={{ color: '#999', marginLeft: 8 }}>
                          (衰减: {rule.decay_days}天)
                        </span>
                      </li>
                    ))}
                  </ul>
                </Col>
                <Col span={8}>
                  <h4>扣分规则</h4>
                  <ul>
                    {(record.negative_rules || []).map((rule, index) => (
                      <li key={index}>
                        {rule.label}: {rule.score}分
                        <span style={{ color: '#999', marginLeft: 8 }}>
                          ({rule.field})
                        </span>
                      </li>
                    ))}
                  </ul>
                </Col>
              </Row>
            </div>
          )}
        />
      </Card>

      <Modal
        title="新建评分规则版本"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
        okText="创建并激活"
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="版本号" name="version" rules={[{ required: true }]}>
                <Input placeholder="例如: v1.1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="规则名称" name="name" rules={[{ required: true }]}>
                <Input placeholder="例如: 2024年Q1评分规则" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="规则版本说明" />
          </Form.Item>

          <Divider orientation="left">画像评分规则</Divider>
          <p style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
            每行一条规则，格式：字段名,匹配值,分数,标签名
            <br />
            例如：industry,Technology,15,科技行业
          </p>
          <Form.Item label="画像规则" name="profile_rules" rules={[{ required: true }]}>
            <TextArea
              rows={6}
              placeholder={`industry,Technology,15,科技行业
size,Enterprise,20,大型企业
job_level,C-Level,25,C级高管`}
            />
          </Form.Item>

          <Divider orientation="left">行为评分规则</Divider>
          <p style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
            每行一条规则，格式：行为类型,分数,标签名,衰减天数
            <br />
            例如：page_view,2,访问首页,30
          </p>
          <Form.Item label="行为规则" name="behavior_rules" rules={[{ required: true }]}>
            <TextArea
              rows={6}
              placeholder={`page_view,2,访问首页,30
download,15,下载白皮书,60
webinar,20,参加直播,45`}
            />
          </Form.Item>

          <Divider orientation="left">负向扣分规则</Divider>
          <p style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
            每行一条规则，格式：字段名,扣分数值,标签名
            <br />
            例如：email_domain,10,免费邮箱域名
          </p>
          <Form.Item label="扣分规则" name="negative_rules" rules={[{ required: true }]}>
            <TextArea
              rows={4}
              placeholder={`email_domain,10,免费邮箱域名
job_title,15,学生/实习生`}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Rules;