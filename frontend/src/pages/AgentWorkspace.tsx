import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Avatar,
  Descriptions,
  Modal,
  Form,
  Input,
  Select,
  Radio,
  message,
  Badge,
  Divider,
  Statistic,
} from 'antd';
import {
  PhoneOutlined,
  PhoneFilled,
  PauseOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  UserOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Call, Customer, Ticket } from '@/types';
import request from '@/utils/request';
import dayjs from 'dayjs';
import useAuthStore from '@/store/useAuthStore';

const { TextArea } = Input;
const { Option } = Select;

const AgentWorkspace: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [queueCalls, setQueueCalls] = useState<Call[]>([]);
  const [myCalls, setMyCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [customerDetail, setCustomerDetail] = useState<Customer | null>(null);
  const [customerTickets, setCustomerTickets] = useState<Ticket[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [transferForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [queueRes, myCallsRes, agentsRes, queuesRes] = await Promise.all([
        request.get('/calls/queue'),
        request.get('/calls/my-calls'),
        request.get('/users/agents'),
        request.get('/queues/list'),
      ]);
      setQueueCalls(queueRes.data || []);
      setMyCalls(myCallsRes.data || []);
      setAgents(agentsRes.data || []);
      setQueues(queuesRes.data || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (myCalls.some(call => call.status === 'connected' || call.status === 'held')) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [myCalls]);

  const fetchCustomerDetail = async (customerId: number) => {
    try {
      const res = await request.get(`/customers/${customerId}`);
      setCustomerDetail(res.data);
      setCustomerTickets(res.data.recentTickets || []);
    } catch (error) {
      console.error('获取客户详情失败:', error);
    }
  };

  const handleAnswer = async (call: Call) => {
    try {
      await request.post(`/calls/${call.call_id}/answer`);
      message.success('接听成功');
      fetchData();
    } catch (error) {
      console.error('接听失败:', error);
    }
  };

  const handleHold = async (call: Call) => {
    try {
      await request.post(`/calls/${call.call_id}/hold`);
      message.success('已保持通话');
      fetchData();
    } catch (error) {
      console.error('保持失败:', error);
    }
  };

  const handleUnhold = async (call: Call) => {
    try {
      await request.post(`/calls/${call.call_id}/unhold`);
      message.success('已恢复通话');
      fetchData();
    } catch (error) {
      console.error('恢复失败:', error);
    }
  };

  const handleHangup = async (call: Call) => {
    try {
      await request.post(`/calls/${call.call_id}/hangup`);
      message.success('通话已结束');
      setSelectedCall(call);
      if (call.customer_id) {
        fetchCustomerDetail(call.customer_id);
      }
      fetchData();
    } catch (error) {
      console.error('挂断失败:', error);
    }
  };

  const handleAssign = async (call: Call) => {
    try {
      await request.post(`/calls/${call.call_id}/assign`);
      message.success('已分配给自己');
      fetchData();
    } catch (error) {
      console.error('分配失败:', error);
    }
  };

  const handleTransfer = async (values: any) => {
    try {
      await request.post(`/calls/${selectedCall?.call_id}/transfer`, values);
      message.success('转接成功');
      setTransferModalVisible(false);
      transferForm.resetFields();
      fetchData();
    } catch (error) {
      console.error('转接失败:', error);
    }
  };

  const handleCreateTicket = async (values: any) => {
    try {
      await request.post('/tickets', {
        ...values,
        callId: selectedCall?.call_id,
        customerId: selectedCall?.customer_id || customerDetail?.id,
        creatorId: user?.id,
      });
      message.success('工单创建成功');
      setTicketModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('创建工单失败:', error);
    }
  };

  const handleSimulateIncoming = async () => {
    try {
      await request.post('/calls/incoming', {
        callerNumber: `138${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
        queueId: Math.floor(Math.random() * queues.length) + 1,
      });
      message.success('模拟来电成功');
      fetchData();
    } catch (error) {
      console.error('模拟来电失败:', error);
    }
  };

  const queueColumns = [
    {
      title: '来电号码',
      dataIndex: 'caller_number',
      key: 'caller_number',
      render: (num: string, record: Call) => (
        <Space>
          <PhoneOutlined />
          <span>{num}</span>
          {record.customer_level === 'vip' && <Tag color="gold">VIP</Tag>}
        </Space>
      ),
    },
    {
      title: '客户姓名',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (name: string) => name || '未知客户',
    },
    {
      title: '队列',
      dataIndex: 'queue_name',
      key: 'queue_name',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: number) => (
        <Tag color={p >= 8 ? 'red' : p >= 6 ? 'orange' : 'blue'}>
          {p >= 8 ? '高' : p >= 6 ? '中' : '普通'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Call) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<PhoneOutlined />}
            onClick={() => handleAssign(record)}
          >
            接起
          </Button>
        </Space>
      ),
    },
  ];

  const myCallColumns = [
    {
      title: '来电号码',
      dataIndex: 'caller_number',
      key: 'caller_number',
      render: (num: string) => (
        <Space>
          <PhoneFilled style={{ color: '#52c41a' }} />
          <span>{num}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          ringing: { color: 'processing', text: '振铃中' },
          connected: { color: 'success', text: '通话中' },
          held: { color: 'warning', text: '保持中' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '时长',
      key: 'duration',
      render: () => `${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Call) => (
        <Space size="small">
          {record.status === 'ringing' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleAnswer(record)}
            >
              接听
            </Button>
          )}
          {record.status === 'connected' && (
            <>
              <Button
                size="small"
                icon={<PauseOutlined />}
                onClick={() => handleHold(record)}
              >
                保持
              </Button>
              <Button
                size="small"
                icon={<ArrowRightOutlined />}
                onClick={() => {
                  setSelectedCall(record);
                  setTransferModalVisible(true);
                }}
              >
                转接
              </Button>
            </>
          )}
          {record.status === 'held' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleUnhold(record)}
            >
              恢复
            </Button>
          )}
          {(record.status === 'connected' || record.status === 'held') && (
            <Button
              danger
              size="small"
              onClick={() => handleHangup(record)}
            >
              挂断
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const ticketColumns = [
    { title: '工单编号', dataIndex: 'ticket_no', key: 'ticket_no' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => ({
      complaint: '投诉',
      consult: '咨询',
      aftersale: '售后',
      suggestion: '建议',
      other: '其他',
    }[t]) },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => ({
      pending: <Tag color="orange">待处理</Tag>,
      processing: <Tag color="blue">处理中</Tag>,
      resolved: <Tag color="green">已解决</Tag>,
      closed: <Tag color="default">已关闭</Tag>,
      escalated: <Tag color="red">已升级</Tag>,
    }[s]) },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (t: string) => dayjs(t).format('MM-DD HH:mm') },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新</Button>
          <Button type="primary" onClick={handleSimulateIncoming}>模拟来电</Button>
        </Space>
        <Badge count={queueCalls.length} showZero>
          <span>等待来电: {queueCalls.length}</span>
        </Badge>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={14}>
          <Card title="当前通话" loading={loading} style={{ marginBottom: 16 }}>
            {myCalls.length > 0 ? (
              <Table
                columns={myCallColumns}
                dataSource={myCalls}
                rowKey="call_id"
                pagination={false}
                size="middle"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <PhoneOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>暂无通话</p>
              </div>
            )}
          </Card>

          <Card title="队列来电" loading={loading}>
            {queueCalls.length > 0 ? (
              <Table
                columns={queueColumns}
                dataSource={queueCalls}
                rowKey="call_id"
                pagination={false}
                size="middle"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                队列中无等待来电
              </div>
            )}
          </Card>
        </Col>

        <Col span={10}>
          <Card title="客户信息" loading={loading}>
            {customerDetail ? (
              <>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="姓名">{customerDetail.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="手机号">{customerDetail.phone_number}</Descriptions.Item>
                  <Descriptions.Item label="邮箱">{customerDetail.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="公司">{customerDetail.company || '-'}</Descriptions.Item>
                  <Descriptions.Item label="客户等级">
                    <Tag color={customerDetail.level === 'vip' ? 'gold' : 'default'}>
                      {customerDetail.level === 'vip' ? 'VIP' : '普通'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="备注">{customerDetail.notes || '-'}</Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: '16px 0' }} />

                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<FileTextOutlined />}
                    onClick={() => setTicketModalVisible(true)}
                  >
                    创建服务工单
                  </Button>
                </div>

                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>历史工单</div>
                <Table
                  columns={ticketColumns}
                  dataSource={customerTickets}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <UserOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>选择通话后显示客户信息</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="创建工单"
        open={ticketModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setTicketModalVisible(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="工单类型" rules={[{ required: true }]}>
            <Select>
              <Option value="complaint">投诉</Option>
              <Option value="consult">咨询</Option>
              <Option value="aftersale">售后</Option>
              <Option value="suggestion">建议</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="请输入工单标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={4} placeholder="请详细描述问题" />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="normal">
            <Select>
              <Option value="urgent">紧急</Option>
              <Option value="high">高</Option>
              <Option value="normal">普通</Option>
              <Option value="low">低</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="转接通话"
        open={transferModalVisible}
        onOk={() => transferForm.submit()}
        onCancel={() => {
          setTransferModalVisible(false);
          transferForm.resetFields();
        }}
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item label="转接方式">
            <Radio.Group defaultValue="agent">
              <Radio value="agent">转接到坐席</Radio>
              <Radio value="queue">转接到队列</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.transferType !== curr.transferType}>
            {({ getFieldValue }) =>
              getFieldValue('transferType') === 'agent' ? (
                <Form.Item name="targetAgentId" label="目标坐席" rules={[{ required: true }]}>
                  <Select placeholder="请选择坐席">
                    {agents.map(agent => (
                      <Option key={agent.id} value={agent.id}>{agent.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                <Form.Item name="targetQueueId" label="目标队列" rules={[{ required: true }]}>
                  <Select placeholder="请选择队列">
                    {queues.map(queue => (
                      <Option key={queue.id} value={queue.id}>{queue.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AgentWorkspace;
