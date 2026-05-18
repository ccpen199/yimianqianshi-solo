import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Select,
  Input,
  Rate,
  Tag,
  Modal,
  Form,
  message,
  Space,
  Row,
  Col
} from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { batchApi, segmentApi, qualityApi } from '../api/services';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

function QualityCheck() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [segments, setSegments] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState(null);

  const fetchBatches = () => {
    batchApi.getList({ pageSize: 100 })
      .then(res => {
        if (res.success) {
          setBatches(res.data.list);
        }
      });
  };

  const fetchSegments = () => {
    if (!selectedBatch) return;
    setLoading(true);
    qualityApi.getList({ batchId: selectedBatch })
      .then(res => {
        if (res.success) {
          setSegments(res.data);
        }
      })
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    if (!selectedBatch) return;
    qualityApi.getStats({ batchId: selectedBatch })
      .then(res => {
        if (res.success) {
          setStats(res.data);
        }
      });
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchSegments();
      fetchStats();
    }
  }, [selectedBatch]);

  const handleQualityCheck = (segment) => {
    setCurrentSegment(segment);
    form.resetFields();
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const werScore = (5 - values.rating) / 5;
      const res = await qualityApi.create({
        segment_id: currentSegment.id,
        wer: werScore,
        missing_count: values.missing_count || 0,
        time_offset: values.time_offset || 0,
        rework_count: values.conclusion === 'rework' ? 1 : 0,
        conclusion: values.conclusion,
        comment: values.comment
      });
      if (res.success) {
        message.success('质检完成');
        setModalVisible(false);
        fetchSegments();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      title: '音频文件',
      dataIndex: 'original_name',
      key: 'original_name',
      width: 200,
      ellipsis: true
    },
    {
      title: '时间轴',
      key: 'time',
      width: 150,
      render: (_, record) => (
        <span style={{ fontFamily: 'monospace' }}>
          {record.start_time?.toFixed(2)} - {record.end_time?.toFixed(2)} s
        </span>
      )
    },
    {
      title: '转写文本',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      width: 300
    },
    {
      title: '说话人',
      dataIndex: 'speaker_name',
      key: 'speaker_name',
      width: 100
    },
    {
      title: '质检状态',
      key: 'quality',
      width: 120,
      render: (_, record) => {
        if (record.conclusion === 'pass') {
          return <Tag color="green" icon={<CheckCircleOutlined />}>通过</Tag>;
        } else if (record.conclusion === 'rework') {
          return <Tag color="red" icon={<CloseCircleOutlined />}>返工</Tag>;
        }
        return <Tag color="orange" icon={<ExclamationCircleOutlined />}>待质检</Tag>;
      }
    },
    {
      title: '质检时间',
      dataIndex: 'checked_at',
      key: 'checked_at',
      width: 180,
      render: (val) => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleQualityCheck(record)}
        >
          质检
        </Button>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">质检中心</h1>
      </div>

      <Space style={{ marginBottom: 24 }}>
        <Select
          placeholder="选择批次"
          style={{ width: 250 }}
          value={selectedBatch}
          onChange={setSelectedBatch}
          allowClear
        >
          {batches.map(batch => (
            <Option key={batch.id} value={batch.id}>{batch.name}</Option>
          ))}
        </Select>
      </Space>

      {stats && selectedBatch && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card className="stats-card">
              <div className="stats-value">{stats.total_segments || 0}</div>
              <div className="stats-label">总片段数</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stats-card">
              <div className="stats-value" style={{ color: '#52c41a' }}>
                {stats.completed_segments || 0}
              </div>
              <div className="stats-label">已通过</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stats-card">
              <div className="stats-value" style={{ color: '#fa8c16' }}>
                {stats.rework_segments || 0}
              </div>
              <div className="stats-label">需返工</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stats-card">
              <div className="stats-value" style={{ color: '#722ed1' }}>
                {((stats.avg_wer || 0) * 100).toFixed(1)}%
              </div>
              <div className="stats-label">平均字错率</div>
            </Card>
          </Col>
        </Row>
      )}

      <Table
        columns={columns}
        dataSource={segments}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`
        }}
      />

      <Modal
        title="质检审核"
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        {currentSegment && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }} type="inner">
            <p><strong>转写文本:</strong> {currentSegment.text}</p>
            {currentSegment.speaker_name && (
              <p><strong>说话人:</strong> {currentSegment.speaker_name}</p>
            )}
          </Card>
          <Form form={form} layout="vertical">
            <Form.Item name="rating" label="准确度评分" rules={[{ required: true }]}>
              <Rate />
            </Form.Item>
            <Form.Item name="missing_count" label="漏标字数" initialValue={0}>
              <Input type="number" min={0} />
            </Form.Item>
            <Form.Item name="time_offset" label="时间偏移(秒)" initialValue={0}>
              <Input type="number" step={0.1} />
            </Form.Item>
            <Form.Item name="conclusion" label="质检结论" rules={[{ required: true }]}>
              <Select>
                <Option value="pass">通过</Option>
                <Option value="rework">返工</Option>
              </Select>
            </Form.Item>
            <Form.Item name="comment" label="质检备注">
              <TextArea rows={3} />
            </Form.Item>
          </Form>
        </div>
        )}
      </Modal>
    </div>
  );
}

export default QualityCheck;