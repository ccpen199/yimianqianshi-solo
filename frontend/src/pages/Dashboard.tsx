import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Progress, Button, Space, message } from 'antd';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import request from '@/utils/request';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    todayCalls: { count: 0, completed: 0, abandoned: 0, avg_duration: 0 },
    queueStats: [] as any[],
    ticketStats: [] as any[],
    agentStats: [] as any[],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await request.get('/dashboard/overview');
      setStats(res.data);
    } catch (error) {
      console.error('获取看板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const queueColumns = [
    {
      title: '队列名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '等待人数',
      dataIndex: 'waiting_count',
      key: 'waiting_count',
      render: (count: number, record: any) => (
        <Space>
          <span style={{
            color: count > (record.wait_warning_threshold || 5) ? '#ff4d4f' : '#52c41a',
            fontWeight: 'bold'
          }}>
            {count}
          </span>
          {count > (record.wait_warning_threshold || 5) && (
            <Tag color="red">超时风险</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '平均等待时间',
      dataIndex: 'avg_wait_time',
      key: 'avg_wait_time',
      render: (seconds: number) => seconds ? `${Math.round(seconds)}秒` : '-',
    },
    {
      title: '最长等待时间',
      dataIndex: 'max_wait_time',
      key: 'max_wait_time',
      render: (seconds: number) => seconds ? `${Math.round(seconds)}秒` : '-',
    },
  ];

  const agentColumns = [
    {
      title: '坐席',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <UserOutlined />
          {name}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          online: { color: 'success', text: '在线' },
          busy: { color: 'processing', text: '忙碌' },
          away: { color: 'warning', text: '离开' },
          offline: { color: 'default', text: '离线' },
        };
        const config = statusMap[status || 'offline'] || statusMap.offline;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '技能组',
      dataIndex: 'skill_group',
      key: 'skill_group',
      render: (group: string) => group || '-',
    },
    {
      title: '当前通话',
      dataIndex: 'active_calls',
      key: 'active_calls',
      render: (count: number) => count || 0,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        >
          刷新数据
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日来电"
              value={stats.todayCalls.count}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已接听"
              value={stats.todayCalls.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已放弃"
              value={stats.todayCalls.abandoned}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均通话时长"
              value={stats.todayCalls.avg_duration || 0}
              prefix={<ClockCircleOutlined />}
              suffix="秒"
              precision={0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="队列状态" loading={loading}>
            <Table
              columns={queueColumns}
              dataSource={stats.queueStats}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="坐席状态" loading={loading}>
            <Table
              columns={agentColumns}
              dataSource={stats.agentStats}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="工单统计" loading={loading}>
            <Row gutter={16}>
              {stats.ticketStats.map((ticket: any) => (
                <Col span={4} key={ticket.status}>
                  <Card size="small">
                    <Statistic
                      title={{
                        pending: '待处理',
                        processing: '处理中',
                        resolved: '已解决',
                        closed: '已关闭',
                        escalated: '已升级',
                      }[ticket.status] || ticket.status}
                      value={ticket.count}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
