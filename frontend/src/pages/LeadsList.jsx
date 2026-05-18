import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Card,
  Modal,
  Form,
  Input,
  Select,
  Spin,
  Alert,
  Tag,
  Popconfirm,
  message,
  Dropdown
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  ImportOutlined,
  MergeOutlined,
  ThunderboltOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { leadsApi, salesApi, reportsApi } from '../api/client';
import dayjs from 'dayjs';

const { Option } = Select;

const LeadsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({});
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [form] = Form.useForm();
  const [exportLoading, setExportLoading] = useState(false);

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

  const handleExportCurrent = async () => {
    try {
      setExportLoading(true);
      const response = await reportsApi.exportLeads(filters);
      downloadCSV(response.data, `leads_filtered_${new Date().toISOString().slice(0, 10)}.csv`);
      message.success('线索导出成功');
    } catch (err) {
      message.error('导出线索失败');
      console.error('Export leads error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      setExportLoading(true);
      const response = await reportsApi.exportLeads({});
      downloadCSV(response.data, `leads_all_${new Date().toISOString().slice(0, 10)}.csv`);
      message.success('全部线索导出成功');
    } catch (err) {
      message.error('导出线索失败');
      console.error('Export leads error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const exportMenuItems = [
    {
      key: '1',
      label: '导出当前筛选结果',
      onClick: handleExportCurrent
    },
    {
      key: '2',
      label: '导出全部线索',
      onClick: handleExportAll
    }
  ];

  useEffect(() => {
    fetchLeads();
    fetchSales();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      };
      const response = await leadsApi.getList(params);
      setLeads(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }));
    } catch (err) {
      setError('加载线索列表失败');
      console.error('Fetch leads error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await salesApi.getList({ active_only: true });
      setSalesList(response.data.data || []);
    } catch (err) {
      console.error('Fetch sales error:', err);
    }
  };

  const getHeatLevelText = (level) => {
    const map = {
      hot: '高价值',
      warm: '中价值',
      lukewarm: '低价值',
      cold: '冷线索'
    };
    return map[level] || level;
  };

  const getHeatLevelClass = (level) => {
    return `heat-${level}`;
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 80) return 'score-badge-high';
    if (score >= 50) return 'score-badge-medium';
    return 'score-badge-low';
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => text || record.email?.split('@')[0] || '-'
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '职位',
      dataIndex: 'job_title',
      key: 'job_title',
      render: (text) => text || '-'
    },
    {
      title: '公司',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (text) => text || '-'
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      render: (text) => text || '-'
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (text) => text ? <Tag>{text}</Tag> : '-'
    },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
      sorter: (a, b) => (a.total_score || 0) - (b.total_score || 0),
      render: (score) => (
        <span className={getScoreBadgeClass(score)}>
          {score || 0}
        </span>
      )
    },
    {
      title: '热度',
      dataIndex: 'heat_level',
      key: 'heat_level',
      render: (level) => (
        <span className={getHeatLevelClass(level)}>
          {getHeatLevelText(level)}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          new: { color: 'blue', text: '新线索' },
          assigned: { color: 'green', text: '已分配' },
          pool: { color: 'orange', text: '待分配' },
          merged: { color: 'default', text: '已合并' }
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '分配销售',
      dataIndex: 'assigned_sales_name',
      key: 'assigned_sales_name',
      render: (text) => text || '-'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/leads/${record.id}`)}
          >
            详情
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个线索吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const handleCreate = async (values) => {
    try {
      await leadsApi.create(values);
      message.success('创建线索成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchLeads();
    } catch (err) {
      console.error('Create lead error:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await leadsApi.delete(id);
      message.success('删除线索成功');
      fetchLeads();
    } catch (err) {
      console.error('Delete lead error:', err);
    }
  };

  const handleRescoreAll = async () => {
    try {
      setLoading(true);
      await leadsApi.rescoreAll();
      message.success('重新评分成功');
      fetchLeads();
    } catch (err) {
      console.error('Rescore error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (selectedLeads.length < 2) {
      message.warning('请至少选择2个线索进行合并');
      return;
    }
    try {
      await leadsApi.merge({
        lead_ids: selectedLeads,
        target_lead_id: selectedLeads[0]
      });
      message.success('线索合并成功');
      setMergeModalVisible(false);
      setSelectedLeads([]);
      fetchLeads();
    } catch (err) {
      console.error('Merge error:', err);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleImport = async (values) => {
    try {
      const leadsToImport = values.leads.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map((line, index) => {
          const parts = line.split(',');
          return {
            row: index + 1,
            email: parts[0]?.trim(),
            name: parts[1]?.trim(),
            company_name: parts[2]?.trim(),
            company_domain: parts[3]?.trim(),
            source: 'import'
          };
        });

      if (leadsToImport.length === 0) {
        message.warning('请输入要导入的线索数据');
        return;
      }

      const invalidEmails = leadsToImport.filter(lead => !lead.email || !validateEmail(lead.email));
      if (invalidEmails.length > 0) {
        message.error(`第 ${invalidEmails.map(l => l.row).join(', ')} 行邮箱格式不正确`);
        return;
      }

      const response = await leadsApi.import({
        leads: leadsToImport,
        batch_name: '批量导入'
      });
      
      const result = response.data.data;
      if (result.success_count > 0 && result.error_count === 0) {
        message.success(`导入成功！共导入 ${result.success_count} 条线索`);
      } else if (result.success_count > 0) {
        message.warning(`部分导入成功！成功 ${result.success_count} 条，失败 ${result.error_count} 条`);
      } else {
        message.error(`导入失败！${result.errors?.[0]?.error || '请检查数据格式'}`);
      }
      
      setImportModalVisible(false);
      fetchLeads();
    } catch (err) {
      message.error('导入失败，请稍后重试');
      console.error('Import error:', err);
    }
  };

  const rowSelection = {
    selectedRowKeys: selectedLeads,
    onChange: (keys) => setSelectedLeads(keys),
    getCheckboxProps: (record) => ({
      disabled: record.is_merged
    })
  };

  if (loading && leads.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在加载线索列表...</p>
      </div>
    );
  }

  if (error && leads.length === 0) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button onClick={fetchLeads}>点击重试</Button>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>线索池</h2>
        <Space>
          <Dropdown.Button
            menu={{ items: exportMenuItems }}
            icon={<DownloadOutlined />}
            loading={exportLoading}
            onClick={handleExportCurrent}
          >
            导出
          </Dropdown.Button>
          <Button icon={<MergeOutlined />} onClick={() => setMergeModalVisible(true)} disabled={selectedLeads.length < 2}>
            合并线索 ({selectedLeads.length})
          </Button>
          <Button icon={<ImportOutlined />} onClick={() => setImportModalVisible(true)}>
            批量导入
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRescoreAll}>
            重新评分
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            新建线索
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={leads}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          onChange={(pagin, _, sorter) => {
            setPagination(prev => ({
              ...prev,
              current: pagin.current,
              pageSize: pagin.pageSize
            }));
          }}
        />
      </Card>

      <Modal
        title="新建线索"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item label="姓名" name="name">
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item label="职位" name="job_title">
            <Input placeholder="请输入职位" />
          </Form.Item>
          <Form.Item label="公司名称" name="company_name">
            <Input placeholder="请输入公司名称" />
          </Form.Item>
          <Form.Item label="公司域名" name="company_domain">
            <Input placeholder="请输入公司域名" />
          </Form.Item>
          <Form.Item label="行业" name="industry">
            <Select placeholder="请选择行业">
              <Option value="Technology">科技</Option>
              <Option value="Finance">金融</Option>
              <Option value="Healthcare">医疗</Option>
              <Option value="Education">教育</Option>
              <Option value="E-commerce">电商</Option>
            </Select>
          </Form.Item>
          <Form.Item label="来源" name="source">
            <Select placeholder="请选择来源">
              <Option value="website">官网</Option>
              <Option value="sem">SEM广告</Option>
              <Option value="referral">推荐</Option>
              <Option value="manual">手动录入</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量导入线索"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleImport}>
          <Form.Item
            label="线索数据"
            name="leads"
            rules={[{ required: true, message: '请输入线索数据' }]}
            extra="每行一条数据，格式：邮箱,姓名,公司名称,公司域名"
          >
            <Input.TextArea
              rows={10}
              placeholder="例如：
john@example.com,John Doe,Acme Corp,acme.com
jane@example.com,Jane Smith,XYZ Inc,xyz.com"
            />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setImportModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">导入</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="合并线索"
        open={mergeModalVisible}
        onCancel={() => setMergeModalVisible(false)}
        onOk={handleMerge}
        okText="确认合并"
      >
        <p>已选择 {selectedLeads.length} 个线索进行合并</p>
        <p>合并后第一个线索将成为主线索，其他线索的活动记录将被合并进去</p>
        <p style={{ color: '#faad14' }}>注意：此操作不可撤销</p>
      </Modal>
    </div>
  );
};

export default LeadsList;