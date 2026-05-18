import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Upload, Select, Input, Space, Modal, message, Tag, Typography } from 'antd';
import { UploadOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Leads = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({ status: '', region: '', keyword: '' });
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [importLogs, setImportLogs] = useState([]);

  useEffect(() => {
    fetchLeads();
    fetchAgents();
    fetchImportLogs();
  }, [pagination.page, pagination.limit, filters]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      const response = await api.get('/leads', { params });
      setLeads(response.data.leads || []);
      setPagination(prev => ({ ...prev, total: response.data.pagination?.total || 0 }));
    } catch (error) {
      console.error('获取线索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await api.get('/tasks/agents');
      setAgents(response.data || []);
    } catch (error) {
      console.error('获取坐席列表失败:', error);
    }
  };

  const fetchImportLogs = async () => {
    try {
      const response = await api.get('/leads/import/logs');
      setImportLogs(response.data || []);
    } catch (error) {
      console.error('获取导入日志失败:', error);
    }
  };

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', 'import');
    
    try {
      const response = await api.post('/leads/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success(`导入成功: ${response.data.success} 条, 重复: ${response.data.duplicate} 条`);
      fetchLeads();
      fetchImportLogs();
    } catch (error) {
      console.error('导入失败:', error);
    }
    return false;
  };

  const handleAssign = async () => {
    if (!selectedAgent || selectedLeads.length === 0) {
      message.error('请选择坐席和线索');
      return;
    }

    try {
      await api.post('/tasks/assign', {
        leadIds: selectedLeads,
        agentId: selectedAgent
      });
      message.success('分配成功');
      setAssignModalVisible(false);
      setSelectedLeads([]);
      fetchLeads();
    } catch (error) {
      console.error('分配失败:', error);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      new: { color: 'default', text: '新建' },
      assigned: { color: 'blue', text: '已分配' },
      calling: { color: 'processing', text: '外呼中' },
      follow_up: { color: 'orange', text: '待跟进' },
      deal: { color: 'success', text: '成交' },
      invalid: { color: 'error', text: '无效' },
      rejected: { color: 'error', text: '拒绝' },
      lost: { color: 'default', text: '流失' }
    };
    const s = statusMap[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
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
      title: '产品',
      dataIndex: 'product',
      key: 'product',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag
    },
    {
      title: '意向等级',
      dataIndex: 'intent_level',
      key: 'intent_level',
      width: 100
    },
    {
      title: '分配坐席',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 100
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm')
    }
  ];

  const rowSelection = {
    selectedRowKeys: selectedLeads,
    onChange: (selectedRowKeys) => {
      setSelectedLeads(selectedRowKeys);
    },
    getCheckboxProps: (record) => ({
      disabled: record.status !== 'new'
    })
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>线索管理</Title>

      <Card className="page-card">
        <Space style={{ marginBottom: 16 }} wrap>
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept=".xlsx,.xls,.csv"
          >
            <Button icon={<UploadOutlined />}>导入线索</Button>
          </Upload>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setAssignModalVisible(true)}
            disabled={selectedLeads.length === 0}
          >
            批量分配
          </Button>
          <Select
            placeholder="筛选状态"
            style={{ width: 120 }}
            allowClear
            value={filters.status || undefined}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
          >
            <Option value="new">新建</Option>
            <Option value="assigned">已分配</Option>
            <Option value="calling">外呼中</Option>
            <Option value="follow_up">待跟进</Option>
            <Option value="deal">成交</Option>
            <Option value="lost">流失</Option>
          </Select>
          <Input.Search
            placeholder="搜索姓名/手机号"
            style={{ width: 200 }}
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={(value) => setFilters(prev => ({ ...prev, keyword: value }))}
          />
        </Space>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={leads}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          onChange={(p) => setPagination(prev => ({ ...prev, page: p.current, limit: p.pageSize }))}
        />
      </Card>

      <Modal
        title="分配线索"
        open={assignModalVisible}
        onOk={handleAssign}
        onCancel={() => setAssignModalVisible(false)}
      >
        <p>已选择 {selectedLeads.length} 条线索</p>
        <Select
          placeholder="选择坐席"
          style={{ width: '100%', marginTop: 16 }}
          value={selectedAgent || undefined}
          onChange={setSelectedAgent}
        >
          {agents.map(agent => (
            <Option key={agent.id} value={agent.id}>
              {agent.name} (待处理: {agent.pending_tasks || 0})
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default Leads;
