import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Spin,
  Alert,
  Table,
  Tag,
  Progress,
  Tabs,
  Dropdown,
  message
} from 'antd';
import {
  BarChartOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  UserOutlined,
  FileTextOutlined,
  TeamOutlined
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { reportsApi, leadsApi } from '../api/client';

const COLORS = ['#52c41a', '#1890ff', '#faad14', '#ff4d4f'];

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qualityData, setQualityData] = useState(null);
  const [conversionData, setConversionData] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [qualityRes, conversionRes, importRes] = await Promise.all([
        reportsApi.getQuality(),
        reportsApi.getConversionFunnel(),
        reportsApi.getImportHistory()
      ]);
      setQualityData(qualityRes.data.data);
      setConversionData(conversionRes.data.data);
      setImportHistory(importRes.data.data || []);
    } catch (err) {
      setError('加载报表数据失败');
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportLeads = async () => {
    try {
      setExportLoading(true);
      const response = await reportsApi.exportLeads();
      downloadCSV(response.data, `leads_report_${new Date().toISOString().slice(0, 10)}.csv`);
      message.success('线索报表导出成功');
    } catch (err) {
      message.error('导出线索报表失败');
      console.error('Export leads error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportSales = async () => {
    try {
      setExportLoading(true);
      const response = await reportsApi.exportSales();
      downloadCSV(response.data, `sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
      message.success('销售报表导出成功');
    } catch (err) {
      message.error('导出销售报表失败');
      console.error('Export sales error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportFull = async () => {
    try {
      setExportLoading(true);
      const response = await reportsApi.exportFull();
      downloadCSV(response.data, `full_report_${new Date().toISOString().slice(0, 10)}.csv`);
      message.success('完整报表导出成功');
    } catch (err) {
      message.error('导出完整报表失败');
      console.error('Export full error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const exportMenuItems = [
    {
      key: '1',
      icon: <UserOutlined />,
      label: '导出线索报表',
      onClick: handleExportLeads
    },
    {
      key: '2',
      icon: <TeamOutlined />,
      label: '导出销售报表',
      onClick: handleExportSales
    },
    {
      key: '3',
      icon: <FileTextOutlined />,
      label: '导出完整报表',
      onClick: handleExportFull
    }
  ];

  const getQualityDistribution = () => {
    if (!qualityData?.quality_by_score) return [];
    return qualityData.quality_by_score;
  };

  const getRuleAccuracyData = () => {
    if (!qualityData?.rule_accuracy) return [];
    return qualityData.rule_accuracy.map(r => ({
      name: r.version,
      准确率: r.accuracy_rate,
      线索数: r.total_leads
    }));
  };

  const getFunnelData = () => {
    if (!conversionData?.conversions) return [];
    return [
      { name: '总线索', value: conversionData.conversions.total_with_activities || 0 },
      { name: '访问页面', value: conversionData.conversions.viewed || 0 },
      { name: '下载内容', value: conversionData.conversions.downloaded || 0 },
      { name: '参加直播', value: conversionData.conversions.webinar || 0 },
      { name: '形成转化', value: conversionData.conversions.converted || 0 },
      { name: '已分配', value: conversionData.conversions.assigned || 0 }
    ];
  };

  const importColumns = [
    {
      title: '批次ID',
      dataIndex: 'batch_uuid',
      key: 'batch_uuid',
      render: (text) => <Tag color="blue">{text ? text.substring(0, 8) : '-'}...</Tag>
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename'
    },
    {
      title: '总数',
      dataIndex: 'total_count',
      key: 'total_count'
    },
    {
      title: '成功',
      dataIndex: 'success_count',
      key: 'success_count',
      render: (value) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{value}</span>
    },
    {
      title: '错误',
      dataIndex: 'error_count',
      key: 'error_count',
      render: (value) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{value}</span>
    },
    {
      title: '成功率',
      key: 'success_rate',
      render: (_, record) => {
        const rate = record.total_count > 0
          ? Math.round((record.success_count / record.total_count) * 100)
          : 0;
        return (
          <Progress percent={rate} size="small" status={rate >= 80 ? 'success' : 'exception'} />
        );
      }
    },
    {
      title: '导入时间',
      dataIndex: 'created_at',
      key: 'created_at'
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在加载报表数据...</p>
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
          <Button onClick={fetchAllData}>点击重试</Button>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>数据报表</h2>
        <Space>
          <Dropdown.Button
            menu={{ items: exportMenuItems }}
            icon={<DownloadOutlined />}
            loading={exportLoading}
            onClick={handleExportLeads}
          >
            导出报表
          </Dropdown.Button>
          <Button onClick={fetchAllData}>刷新数据</Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="quality">
        <Tabs.TabPane tab="线索质量分析" key="quality">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="高质量线索"
                  value={qualityData?.quality_by_score?.find(q => q.quality_band === 'High')?.count || 0}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="中等质量"
                  value={qualityData?.quality_by_score?.find(q => q.quality_band === 'Medium')?.count || 0}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="低质量"
                  value={qualityData?.quality_by_score?.find(q => q.quality_band === 'Low')?.count || 0}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="退回线索"
                  value={qualityData?.feedback_stats?.find(f => f.feedback_score === 1)?.count || 0}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Card title="质量分布">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getQualityDistribution()}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="count"
                      nameKey="quality_band"
                      label={({ quality_band, count }) => `${quality_band}: ${count}`}
                    >
                      {getQualityDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="评分规则准确率">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getRuleAccuracyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="准确率" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab="转化漏斗" key="conversion">
          <Card title="线索转化漏斗">
            <Row gutter={16}>
              <Col span={16}>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getFunnelData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1890ff" barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </Col>
              <Col span={8}>
                <div style={{ padding: 16 }}>
                  <h4 style={{ marginBottom: 16 }}>转化数据</h4>
                  {getFunnelData().map((item, index) => {
                    const total = getFunnelData()[0]?.value || 1;
                    const rate = Math.round((item.value / total) * 100);
                    return (
                      <div key={index} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>{item.name}</span>
                          <span style={{ fontWeight: 'bold' }}>{item.value} ({rate}%)</span>
                        </div>
                        <Progress percent={rate} status="active" />
                      </div>
                    );
                  })}
                </div>
              </Col>
            </Row>
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="导入历史" key="import">
          <Card title="批量导入历史记录">
            <Table
              columns={importColumns}
              dataSource={importHistory}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default Reports;