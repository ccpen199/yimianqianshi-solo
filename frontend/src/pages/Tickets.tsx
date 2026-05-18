import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Descriptions,
  Divider,
  List,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  CommentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Ticket } from '@/types';
import request from '@/utils/request';
import dayjs from 'dayjs';
import useAuthStore from '@/store/useAuthStore';

const { TextArea } = Input;
const { Option } = Select;

const Tickets: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [commentForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await request.get('/tickets/list');
      setTickets(res.data || []);
    } catch (error) {
      console.error('获取工单列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailModalVisible(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    form.setFieldsValue({
      status: ticket.status,
      priority: ticket.priority,
      assigneeId: ticket.assignee_id,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (values: any) => {
    try {
      await request.put(`/tickets/${selectedTicket?.id}`, values);
      message.success('更新成功');
      setEditModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const handleAddComment = async (values: any) => {
    try {
      await request.post(`/tickets/${selectedTicket?.id}/comments`, {
        ...values,
        authorId: user?.id,
      });
      message.success('添加评论成功');
      setCommentModalVisible(false);
      commentForm.resetFields();
    } catch (error) {
      console.error('添加评论失败:', error);
    }
  };

  const columns = [
    {
      title: '工单编号',
      dataIndex: 'ticket_no',
      key: 'ticket_no',
      width: 140,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (t: string) => ({
        complaint: '投诉',
        consult: '咨询',
        aftersale: '售后',
        suggestion: '建议',
        other: '其他',
      }[t] || t),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p: string) => {
        const colorMap: Record<string, string> = {
          urgent: 'red',
          high: 'orange',
          normal: 'blue',
          low: 'default',
        };
        const textMap: Record<string, string> = {
          urgent: '紧急',
          high: '高',
          normal: '普通',
          low: '低',
        };
        return <Tag color={colorMap[p]}>{textMap[p]}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          pending: 'orange',
          processing: 'blue',
          resolved: 'green',
          closed: 'default',
          escalated: 'red',
        };
        const textMap: Record<string, string> = {
          pending: '待处理',
          processing: '处理中',
          resolved: '已解决',
          closed: '已关闭',
          escalated: '已升级',
        };
        return <Tag color={colorMap[s]}>{textMap[s]}</Tag>;
      },
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 100,
    },
    {
      title: '处理人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 100,
      render: (name: string) => name || '-',
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
      render: (_: any, record: Ticket) => (
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
          <Button
            type="link"
            size="small"
            icon={<CommentOutlined />}
            onClick={() => {
              setSelectedTicket(record);
              setCommentModalVisible(true);
            }}
          >
            评论
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" icon={<PlusOutlined />}>
          新建工单
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={tickets}
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
        title="工单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedTicket && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="工单编号" span={2}>
                {selectedTicket.ticket_no}
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                {{
                  complaint: '投诉',
                  consult: '咨询',
                  aftersale: '售后',
                  suggestion: '建议',
                  other: '其他',
                }[selectedTicket.type]}
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={{
                  urgent: 'red',
                  high: 'orange',
                  normal: 'blue',
                  low: 'default',
                }[selectedTicket.priority]}>
                  {{
                    urgent: '紧急',
                    high: '高',
                    normal: '普通',
                    low: '低',
                  }[selectedTicket.priority]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={{
                  pending: 'orange',
                  processing: 'blue',
                  resolved: 'green',
                  closed: 'default',
                  escalated: 'red',
                }[selectedTicket.status]}>
                  {{
                    pending: '待处理',
                    processing: '处理中',
                    resolved: '已解决',
                    closed: '已关闭',
                    escalated: '已升级',
                  }[selectedTicket.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="客户">{selectedTicket.customer_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="关联通话">{selectedTicket.call_id || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建人">{selectedTicket.creator_name}</Descriptions.Item>
              <Descriptions.Item label="处理人">{selectedTicket.assignee_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(selectedTicket.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedTicket.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>处理记录</div>
            <List
              size="small"
              dataSource={[]}
              renderItem={() => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar size="small" icon={<UserOutlined />} />}
                    title="暂无处理记录"
                    description=""
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>

      <Modal
        title="编辑工单"
        open={editModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="status" label="状态">
            <Select>
              <Option value="pending">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="resolved">已解决</Option>
              <Option value="closed">已关闭</Option>
              <Option value="escalated">已升级</Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="优先级">
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
        title="添加评论"
        open={commentModalVisible}
        onOk={() => commentForm.submit()}
        onCancel={() => {
          setCommentModalVisible(false);
          commentForm.resetFields();
        }}
      >
        <Form form={commentForm} layout="vertical">
          <Form.Item name="content" label="评论内容" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="请输入评论内容" />
          </Form.Item>
          <Form.Item name="isInternal" label="类型" valuePropName="checked">
            <Input type="checkbox" />内部评论（仅员工可见）
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Tickets;
