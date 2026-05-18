import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Alert, Typography } from 'antd';
import { FileTextOutlined, PhoneOutlined, CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leadStats, setLeadStats] = useState({});
  const [callStats, setCallStats] = useState({});
  const [agentStats, setAgentStats] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/reports/overview');
      setLeadStats(response?.data?.leadStats || {});
      setCallStats(response?.data?.callStats || {});
      setAgentStats(response?.data?.agentStats || []);
    } catch (error) {
      console.error('获取数据失败:', error);
      setError('加载数据失败，请检查网络连接或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const agentColumns = [
    {
      title: '坐席姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '今日通话数',
      dataIndex: 'today_completed',
      key: 'today_completed',
      render: (text) => text || 0
    },
    {
      title: '成交数',
      dataIndex: 'deals',
      key: 'deals',
      render: (text) => text || 0
    }
  ];

  if (error) {
    return (
      <div>
        <Title level={4} style={{ marginBottom: 24 }}>数据概览</Title>
        <Alert
          message="加载失败"
          description={
            <div>
              <p>{error}</p>
              <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>
                重试
              </Button>
            </div>
          }
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>数据概览</Title>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="总线索数"
              value={leadStats?.total_leads || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="今日通话"
              value={callStats?.total_calls || 0}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="成交数"
              value={leadStats?.deal_leads || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="待跟进"
              value={callStats?.follow_ups || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="坐席工作状态" loading={loading}>
        <Table
          columns={agentColumns}
          dataSource={agentStats}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: '暂无坐席数据' }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
