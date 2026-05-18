import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Alert, Table } from 'antd';
import {
  UserOutlined,
  FireOutlined,
  CheckCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsApi } from '../api/client';

const COLORS = ['#ff4d4f', '#faad14', '#1890ff', '#8c8c8c'];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsApi.getDashboard();
      setData(response.data.data);
    } catch (err) {
      setError('加载数据失败，请稍后重试');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHeatData = () => {
    if (!data) return [];
    return [
      { name: 'Hot', value: data.leads?.hot_count || 0, color: '#ff4d4f' },
      { name: 'Warm', value: data.leads?.warm_count || 0, color: '#faad14' },
      { name: 'Lukewarm', value: data.leads?.cold_count || 0, color: '#1890ff' },
      { name: 'Cold', value: data.leads?.cold_count || 0, color: '#8c8c8c' }
    ];
  };

  const getSourceColumns = () => [
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: '平均分数',
      dataIndex: 'avg_score',
      key: 'avg_score',
      render: (val) => val?.toFixed?.(1) || 0,
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在加载数据...</p>
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
          <a onClick={fetchData}>点击重试</a>
        }
      />
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>数据概览</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="总线索数"
              value={data?.leads?.total || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="高价值线索"
              value={data?.leads?.hot_count || 0}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="已分配"
              value={data?.leads?.assigned_count || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="平均分数"
              value={data?.leads?.avg_score || 0}
              prefix={<BarChartOutlined />}
              precision={1}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="热度分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getHeatData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {getHeatData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="活动类型分布">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.activities || []}>
                <XAxis dataKey="activity_type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="行业分布">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.top_industries || []} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="industry" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#52c41a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="来源分布">
            <Table
              dataSource={data?.sources || []}
              columns={getSourceColumns()}
              rowKey="source"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;