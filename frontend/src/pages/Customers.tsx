import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Card,
  message,
  Modal,
  Form,
  Descriptions,
  Select,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { Customer } from '@/types';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { TextArea } = Input;

const Customers: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await request.get('/customers/list');
      setCustomers(res.data || []);
    } catch (error) {
      console.error('获取客户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetail = async (customer: Customer) => {
    try {
      const res = await request.get(`/customers/${customer.id}`);
      setSelectedCustomer(res.data);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('获取客户详情失败:', error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setFieldsValue({
      name: customer.name,
      email: customer.email,
      company: customer.company,
      level: customer.level,
      notes: customer.notes,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (values: any) => {
    try {
      await request.put(`/customers/${selectedCustomer?.id}`, values);
      message.success('更新成功');
      setEditModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const columns = [
    {
      title: '手机号码',
      dataIndex: 'phone_number',
      key: 'phone_number',
      width: 130,
      render: (phone: string) => (
        <Space>
          <PhoneOutlined />
          {phone}
        </Space>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (name: string) => name || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      render: (email: string) => email || '-',
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
      width: 150,
      render: (company: string) => company || '-',
    },
    {
      title: '客户等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => {
        const colorMap: Record<string, string> = {
          vip: 'gold',
          normal: 'blue',
          blocked: 'red',
        };
        const textMap: Record<string, string> = {
          vip: 'VIP',
          normal: '普通',
          blocked: '已拉黑',
        };
        return <Tag color={colorMap[level]}>{textMap[level]}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Customer) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder="搜索客户姓名、手机号、邮箱..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={customers.filter(c => 
            !searchText || 
            c.name?.includes(searchText) || 
            c.phone_number?.includes(searchText) ||
            c.email?.includes(searchText)
          )}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title="客户详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedCustomer && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="手机号码">{selectedCustomer.phone_number}</Descriptions.Item>
              <Descriptions.Item label="姓名">{selectedCustomer.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{selectedCustomer.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="公司">{selectedCustomer.company || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户等级">
                <Tag color={selectedCustomer.level === 'vip' ? 'gold' : 'blue'}>
                  {selectedCustomer.level === 'vip' ? 'VIP' : '普通'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(selectedCustomer.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {selectedCustomer.notes || '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>

      <Modal
        title="编辑客户信息"
        open={editModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名">
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="company" label="公司">
            <Input placeholder="请输入公司名称" />
          </Form.Item>
          <Form.Item name="level" label="客户等级">
            <Select>
              <Select.Option value="vip">VIP</Select.Option>
              <Select.Option value="normal">普通</Select.Option>
              <Select.Option value="blocked">已拉黑</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Customers;
