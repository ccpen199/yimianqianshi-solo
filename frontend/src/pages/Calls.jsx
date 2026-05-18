import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Form, Input, Select, Modal, 
  message, Tag, Typography, Statistic, Row, Col, DatePicker
} from 'antd';
import { PhoneOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Calls = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [dailyGoal, setDailyGoal] = useState({});
  const [followUpExpired, setFollowUpExpired] = useState([]);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTasks();
    return () => {
      if (callTimer) clearInterval(callTimer);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/my-tasks');
      setTasks(response.data.tasks || []);
      setDailyGoal(response.data.dailyGoal || {});
      setFollowUpExpired(response.data.followUpExpired || []);
    } catch (error) {
      console.error('获取任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCall = (task) => {
    setCurrentTask(task);
    setCallModalVisible(true);
    setCallDuration(0);
    
    api.post(`/calls/${task.id}/start`).catch(err => {
      console.error('开始通话失败:', err);
    });

    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    setCallTimer(timer);
  };

  const endCall = async (values) => {
    if (callTimer) clearInterval(callTimer);
    
    try {
      const data = {
        ...values,
        next_follow_up_at: values.next_follow_up_at ? values.next_follow_up_at.format() : null,
        duration: callDuration
      };
      
      await api.post(`/calls/${currentTask.id}/end`, data);
      message.success('通话结束');
      setCallModalVisible(false);
      form.resetFields();
      fetchTasks();
    } catch (error) {
      console.error('结束通话失败:', error);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const columns = [
    {
      title: '姓名',
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
      title: '地区',
      dataIndex: 'region',
      key: 'region',
      width: 100
    },
    {
      title: '意向等级',
      dataIndex: 'intent_level',
      key: 'intent_level',
      width: 100,
      render: (text) => text ? <Tag color="orange">{text}</Tag> : '-'
    },
    {
      title: '下次跟进',
      dataIndex: 'next_follow_up_at',
      key: 'next_follow_up_at',
      width: 160,
      render: (text) => {
        if (!text) return '-';
        const isExpired = dayjs(text).isBefore(dayjs());
        return (
          <span style={{ color: isExpired ? '#f5222d' : 'inherit' }}>
            {dayjs(text).format('YYYY-MM-DD HH:mm')}
            {isExpired && <Tag color="red" style={{ marginLeft: 8 }}>已过期</Tag>}
          </span>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="primary" icon={<PhoneOutlined />} onClick={() => startCall(record)}>
          拨打
        </Button>
      )
    }
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>外呼任务</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="今日目标"
              value={dailyGoal.target_calls || 0}
              suffix="/ 通"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已完成"
              value={dailyGoal.completed_calls || 0}
              suffix="/ 通"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="待处理任务"
              value={tasks.length}
              suffix="/ 条"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {followUpExpired.length > 0 && (
        <Card 
          title={<span><ClockCircleOutlined style={{ marginRight: 8 }} />跟进提醒</span>}
          style={{ marginBottom: 24, borderColor: '#faad14' }}
        >
          <p>有 {followUpExpired.length} 条线索跟进时间已过期，请优先处理：</p>
          <ul>
            {followUpExpired.slice(0, 5).map(item => (
              <li key={item.id}>
                {item.name} - {item.phone} (应跟进: {dayjs(item.next_follow_up_at).format('YYYY-MM-DD HH:mm')})
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="待拨打任务" loading={loading} className="page-card">
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={`正在拨打: ${currentTask?.name}`}
        open={callModalVisible}
        width={700}
        footer={null}
        onCancel={() => {
          if (callTimer) clearInterval(callTimer);
          setCallModalVisible(false);
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, color: '#1890ff', marginBottom: 8 }}>
            {formatDuration(callDuration)}
          </div>
          <p>正在与 {currentTask?.name} 通话中...</p>
        </div>

        <Form form={form} layout="vertical" onFinish={endCall}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="callResult"
                label="通话结果"
                rules={[{ required: true, message: '请选择通话结果' }]}
              >
                <Select placeholder="请选择">
                  <Option value="connected">接通</Option>
                  <Option value="no_answer">无人接听</Option>
                  <Option value="busy">忙音</Option>
                  <Option value="invalid_number">空号</Option>
                  <Option value="rejected">拒接</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="disposition"
                label="处理结果"
              >
                <Select placeholder="请选择">
                  <Option value="follow_up">待跟进</Option>
                  <Option value="invalid">无效客户</Option>
                  <Option value="rejected">拒绝推销</Option>
                  <Option value="lost">流失</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="intent_level"
                label="意向等级"
              >
                <Select placeholder="请选择">
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                  <Option value="none">无意向</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="next_follow_up_at"
                label="下次跟进时间"
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="通话备注"
          >
            <TextArea rows={4} placeholder="请输入通话内容..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large">
              <CheckCircleOutlined /> 结束通话
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Calls;
