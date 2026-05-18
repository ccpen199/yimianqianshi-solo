import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  Alert,
  Timeline,
  Modal,
  Form,
  Select,
  Input,
  Rate,
  message,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  RollbackOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { leadsApi, salesApi } from '../api/client';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lead, setLead] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchLead();
    fetchSales();
  }, [id]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await leadsApi.get(id);
      setLead(response.data.data);
    } catch (err) {
      setError('加载线索详情失败');
      console.error('Fetch lead error:', err);
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

  const getHeatLevelColor = (level) => {
    const map = {
      hot: '#ff4d4f',
      warm: '#faad14',
      lukewarm: '#1890ff',
      cold: '#8c8c8c'
    };
    return map[level] || '#8c8c8c';
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'page_view': return <UserOutlined />;
      case 'download': return <ThunderboltOutlined />;
      case 'webinar': return <ThunderboltOutlined />;
      case 'conversion': return <CheckOutlined />;
      case 'email': return <ThunderboltOutlined />;
      default: return <UserOutlined />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'page_view': return 'blue';
      case 'download': return 'green';
      case 'webinar': return 'purple';
      case 'conversion': return 'orange';
      case 'email': return 'cyan';
      default: return 'gray';
    }
  };

  const handleAssign = async (values) => {
    try {
      await leadsApi.assign(id, {
        sales_id: values.sales_id,
        reason: values.reason
      });
      message.success('分配成功');
      setAssignModalVisible(false);
      fetchLead();
    } catch (err) {
      console.error('Assign error:', err);
    }
  };

  const handleReturn = async (values) => {
    try {
      await leadsApi.return(id, {
        sales_id: lead.assigned_sales_id,
        reason: values.reason,
        feedback: values.feedback
      });
      message.success('退回成功');
      setReturnModalVisible(false);
      fetchLead();
    } catch (err) {
      console.error('Return error:', err);
    }
  };

  const handleFeedback = async (values) => {
    try {
      await leadsApi.feedback(id, {
        sales_id: lead.assigned_sales_id,
        score: values.score,
        note: values.note
      });
      message.success('反馈成功');
      setFeedbackModalVisible(false);
      fetchLead();
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  const handleAddActivity = async (values) => {
    try {
      await leadsApi.addActivity(id, {
        activity_type: values.activity_type,
        activity_title: values.activity_title,
        activity_data: { note: values.note }
      });
      message.success('添加活动成功');
      setActivityModalVisible(false);
      fetchLead();
    } catch (err) {
      console.error('Add activity error:', err);
    }
  };

  const handleRescore = async () => {
    try {
      await leadsApi.score(id);
      message.success('重新评分成功');
      fetchLead();
    } catch (err) {
      console.error('Rescore error:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在加载线索详情...</p>
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
          <Button onClick={fetchLead}>点击重试</Button>
        }
      />
    );
  }

  if (!lead) {
    return <Alert message="线索不存在" type="error" showIcon />;
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/leads')}>
            返回列表
          </Button>
          <h2 style={{ margin: 0 }}>线索详情</h2>
        </Space>
        <Space>
          <Button onClick={handleRescore}>重新评分</Button>
          <Button icon={<PlusOutlined />} onClick={() => setActivityModalVisible(true)}>
            添加活动
          </Button>
          {lead.assigned_sales_id ? (
            <>
              <Button icon={<RollbackOutlined />} onClick={() => setReturnModalVisible(true)}>
                退回线索
              </Button>
              <Button icon={<CheckOutlined />} onClick={() => setFeedbackModalVisible(true)}>
                质量反馈
              </Button>
            </>
          ) : (
            <Button type="primary" onClick={() => setAssignModalVisible(true)}>
              分配销售
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={6}>
          <Card className="detail-card">
            <Statistic
              title="总评分"
              value={lead.total_score || 0}
              valueStyle={{ color: getHeatLevelColor(lead.heat_level) }}
              suffix={`/ ${getHeatLevelText(lead.heat_level)}`}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="画像分" value={lead.profile_score || 0} valueStyle={{ fontSize: 14 }} />
              </Col>
              <Col span={12}>
                <Statistic title="行为分" value={lead.behavior_score || 0} valueStyle={{ fontSize: 14 }} />
              </Col>
            </Row>
            <div style={{ marginTop: 8 }}>
              <Statistic title="扣分项" value={lead.negative_score || 0} valueStyle={{ fontSize: 14, color: '#ff4d4f' }} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Tag color="blue">规则版本: {lead.scoring_version || 'N/A'}</Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={18}>
          <Card title="基本信息" className="detail-card">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="姓名">{lead.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{lead.email}</Descriptions.Item>
              <Descriptions.Item label="职位">{lead.job_title || '-'}</Descriptions.Item>
              <Descriptions.Item label="职级">{lead.job_level || '-'}</Descriptions.Item>
              <Descriptions.Item label="部门">{lead.department || '-'}</Descriptions.Item>
              <Descriptions.Item label="地区">{lead.location || '-'}</Descriptions.Item>
              <Descriptions.Item label="公司">{lead.company_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="行业">{lead.industry || '-'}</Descriptions.Item>
              <Descriptions.Item label="来源">{lead.source || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={lead.status === 'assigned' ? 'green' : 'blue'}>{lead.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="分配销售">{lead.assigned_sales_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(lead.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="评分明细" className="detail-card">
            {(lead.scoring_details || []).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999' }}>暂无评分明细</p>
            ) : (
              <div>
                {(lead.scoring_details || []).map((detail, index) => (
                  <div key={index} className="score-detail-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <Tag color={detail.type === 'negative' ? 'red' : 'green'}>
                          {detail.type === 'profile' ? '画像' : detail.type === 'behavior' ? '行为' : '扣分'}
                        </Tag>
                        {detail.label}
                      </span>
                      <span style={{ fontWeight: 'bold', color: detail.score >= 0 ? '#52c41a' : '#ff4d4f' }}>
                        {detail.score > 0 ? '+' : ''}{detail.score}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>
                      {detail.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="活动时间线" className="detail-card">
            {(lead.activities || []).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999' }}>暂无活动记录</p>
            ) : (
              <Timeline>
                {(lead.activities || []).map((activity, index) => (
                  <Timeline.Item
                    key={index}
                    color={getActivityColor(activity.activity_type)}
                    dot={getActivityIcon(activity.activity_type)}
                  >
                    <div className="timeline-activity">
                      <div style={{ fontWeight: 'bold' }}>{activity.activity_title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {dayjs(activity.created_at).format('YYYY-MM-DD HH:mm')}
                      </div>
                      {activity.page_url && (
                        <div style={{ fontSize: 12, color: '#1890ff' }}>
                          页面: {activity.page_url}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="分配销售"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAssign}>
          <Form.Item label="选择销售" name="sales_id" rules={[{ required: true }]}>
            <Select placeholder="请选择销售代表">
              {salesList.map(sales => (
                <Option key={sales.id} value={sales.id}>
                  {sales.name} ({sales.email})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="分配原因" name="reason">
            <TextArea rows={3} placeholder="请输入分配原因" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setAssignModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确认分配</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="退回线索"
        open={returnModalVisible}
        onCancel={() => setReturnModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleReturn}>
          <Form.Item label="退回原因" name="reason" rules={[{ required: true }]}>
            <Select placeholder="请选择退回原因">
              <Option value="duplicate">重复线索</Option>
              <Option value="low_quality">低质量线索</Option>
              <Option value="wrong_contact">联系人错误</Option>
              <Option value="other">其他原因</Option>
            </Select>
          </Form.Item>
          <Form.Item label="详细说明" name="feedback">
            <TextArea rows={3} placeholder="请输入详细说明" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setReturnModalVisible(false)}>取消</Button>
              <Button type="primary" danger htmlType="submit">确认退回</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="线索质量反馈"
        open={feedbackModalVisible}
        onCancel={() => setFeedbackModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleFeedback}>
          <Form.Item label="质量评分" name="score" rules={[{ required: true }]}>
            <Rate />
          </Form.Item>
          <Form.Item label="反馈说明" name="note">
            <TextArea rows={4} placeholder="请输入反馈说明" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setFeedbackModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">提交反馈</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加活动记录"
        open={activityModalVisible}
        onCancel={() => setActivityModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddActivity}>
          <Form.Item label="活动类型" name="activity_type" rules={[{ required: true }]}>
            <Select placeholder="请选择活动类型">
              <Option value="page_view">页面访问</Option>
              <Option value="download">内容下载</Option>
              <Option value="webinar">参与直播</Option>
              <Option value="conversion">转化行为</Option>
              <Option value="email">邮件互动</Option>
            </Select>
          </Form.Item>
          <Form.Item label="活动标题" name="activity_title" rules={[{ required: true }]}>
            <Input placeholder="请输入活动标题" />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setActivityModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">添加</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeadDetail;