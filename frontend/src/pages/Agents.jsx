import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Statistic, Row, Col, Typography } from 'antd';
import { PhoneOutlined, CheckCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title } = Typography;

const Agents = () => {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/agents');
      setAgents(response.data || []);
    } catch (error) {
      console.error('获取坐席列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '坐席姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (text) => text === 'active' ? (
        <span style={{ color: '#52c41a' }}>在线</span>
      ) : (
        <span style={{ color: '#999' }}>离线</span>
      )
    },
    {
      title: '待处理任务',
      dataIndex: 'pending_tasks',
      key: 'pending_tasks',
      width: 120,
      render: (text) => text || 0
    },
    {
      title: '今日完成',
      dataIndex: 'today_completed',
      key: 'today_completed',
      width: 120,
      render: (text) => text || 0
    },
    {
      title: '每日目标',
      dataIndex: 'today_target',
      key: 'today_target',
      width: 120,
      render: (text) => text || 0
    }
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>坐席管理</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="坐席总数"
              value={agents.length}
              suffix="/ 人"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="在线坐席"
              value={agents.filter(a => a.status === 'active').length}
              suffix="/ 人"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="总待处理"
              value={agents.reduce((sum, a) => sum + (a.pending_tasks || 0), 0)}
              suffix="/ 条"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="坐席列表" loading={loading} className="page-card">
        <Table
          columns={columns}
          dataSource={agents}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default Agents;
