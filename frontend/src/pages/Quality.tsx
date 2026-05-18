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
  Rate,
  message,
  Card,
  Descriptions,
  Row,
  Col,
  Progress,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  AudioOutlined,
} from '@ant-design/icons';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const Quality: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, criteriaRes] = await Promise.all([
        request.get('/quality/reviews'),
        request.get('/quality/criteria'),
      ]);
      setReviews(reviewsRes.data || []);
      setCriteria(criteriaRes.data || []);
    } catch (error) {
      console.error('获取质检数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetail = async (review: any) => {
    try {
      const res = await request.get(`/quality/reviews/${review.id}`);
      setSelectedReview(res.data);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('获取质检详情失败:', error);
    }
  };

  const handleCreateReview = () => {
    setReviewModalVisible(true);
  };

  const handleReviewSubmit = async (values: any) => {
    try {
      await request.post('/quality/reviews', values);
      message.success('质检评分提交成功');
      setReviewModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      console.error('提交质检失败:', error);
    }
  };

  const columns = [
    {
      title: '质检ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '通话ID',
      dataIndex: 'call_id',
      key: 'call_id',
      width: 140,
    },
    {
      title: '来电号码',
      dataIndex: 'caller_number',
      key: 'caller_number',
      width: 120,
    },
    {
      title: '坐席',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 100,
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (score: number) => {
        const color = score >= 90 ? 'success' : score >= 70 ? 'processing' : score >= 60 ? 'warning' : 'error';
        return (
          <Space>
            <Tag color={color}>{score}分</Tag>
            <Progress percent={score} size="small" showInfo={false} status={color} />
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          draft: { color: 'default', text: '草稿' },
          submitted: { color: 'blue', text: '已提交' },
          appealed: { color: 'orange', text: '已申诉' },
          finalized: { color: 'success', text: '已终审' },
        };
        const config = statusMap[s] || { color: 'default', text: s };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '质检员',
      dataIndex: 'reviewer_name',
      key: 'reviewer_name',
      width: 100,
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
      render: (_: any, record: any) => (
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
            onClick={() => message.info('编辑功能开发中')}
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateReview}>
          新建质检
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={reviews}
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
        title="质检详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedReview && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="质检ID">{selectedReview.id}</Descriptions.Item>
              <Descriptions.Item label="通话ID">{selectedReview.call_id}</Descriptions.Item>
              <Descriptions.Item label="来电号码">{selectedReview.caller_number || '-'}</Descriptions.Item>
              <Descriptions.Item label="坐席">{selectedReview.agent_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="总得分" span={2}>
                <Space>
                  <Tag color={selectedReview.score >= 90 ? 'success' : selectedReview.score >= 70 ? 'processing' : 'error'}>
                    {selectedReview.score}分
                  </Tag>
                  <Progress percent={selectedReview.score} size="small" />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="质检员">{selectedReview.reviewer_name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {{
                  draft: '草稿',
                  submitted: '已提交',
                  appealed: '已申诉',
                  finalized: '已终审',
                }[selectedReview.status] || selectedReview.status}
              </Descriptions.Item>
              <Descriptions.Item label="质检备注" span={2}>
                {selectedReview.comments || '-'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>

      <Modal
        title="新建质检评分"
        open={reviewModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setReviewModalVisible(false);
          form.resetFields();
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="callId" label="关联通话" rules={[{ required: true }]}>
            <Input placeholder="请输入通话ID" />
          </Form.Item>

          <Divider orientation="left">评分项</Divider>

          {criteria.map((item: any) => (
            <Form.Item
              key={item.id}
              name={`score_${item.id}`}
              label={`${item.name} (满分${item.max_score}分)`}
              initialValue={item.max_score}
            >
              <Rate count={Math.floor(item.max_score / 10)} allowHalf />
            </Form.Item>
          ))}

          <Form.Item name="comments" label="质检备注">
            <TextArea rows={3} placeholder="请输入质检备注" />
          </Form.Item>

          <Form.Item name="status" label="状态" initialValue="draft">
            <Select>
              <Option value="draft">保存为草稿</Option>
              <Option value="submitted">提交质检</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Quality;
