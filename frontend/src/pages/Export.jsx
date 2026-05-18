import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Select,
  Table,
  Tag,
  message,
  Space,
  Row,
  Col,
  List
} from 'antd';
import { ExportOutlined, DownloadOutlined, FileTextOutlined, AudioOutlined } from '@ant-design/icons';
import { batchApi, exportApi } from '../api/services';

const { Option } = Select;

function ExportPage() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetail, setBatchDetail] = useState(null);

  const fetchBatches = () => {
    batchApi.getList({ pageSize: 100 })
      .then(res => {
        if (res.success) {
          setBatches(res.data.list);
        }
      });
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      batchApi.getDetail(selectedBatch)
        .then(res => {
          if (res.success) {
            setBatchDetail(res.data);
          }
        });
    }
  }, [selectedBatch]);

  const handleExport = async () => {
    if (!selectedBatch) {
      message.warning('请选择批次');
      return;
    }
    setLoading(true);
    try {
      const res = await exportApi.exportData({
      batchId: selectedBatch,
      format: 'json'
    });
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotation_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (err) {
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">数据导出</h1>
        <Button
          type="primary"
          icon={<ExportOutlined />}
          onClick={handleExport}
          loading={loading}
          disabled={!selectedBatch}
        >
          导出数据
        </Button>
      </div>

      <Space style={{ marginBottom: 24 }}>
        <Select
          placeholder="选择要导出的批次"
          style={{ width: 300 }}
          value={selectedBatch}
          onChange={setSelectedBatch}
          allowClear
        >
          {batches.map(batch => (
            <Option key={batch.id} value={batch.id}>{batch.name}</Option>
          ))}
        </Select>
      </Space>

      {batchDetail && (
        <Row gutter={24}>
          <Col span={12}>
            <Card title="批次信息" style={{ marginBottom: 24 }}>
              <List>
                <List.Item>
                  <span>批次名称:</span>
                  <strong>{batchDetail.name}</strong>
                </List.Item>
                <List.Item>
                  <span>采集来源:</span>
                  <strong>{batchDetail.source}</strong>
                </List.Item>
                <List.Item>
                  <span>采样率:</span>
                  <strong>{batchDetail.sample_rate} Hz</strong>
                </List.Item>
                <List.Item>
                  <span>授权状态:</span>
                  <Tag color={batchDetail.authorization_status === 'authorized' ? 'green' : 'orange'}>
                    {batchDetail.authorization_status}
                  </Tag>
                </List.Item>
              </List>
            </Card>

            <Card title="统计信息">
              <Row gutter={16}>
                <Col span={12}>
                  <div className="stats-card">
                  <FileTextOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  <div className="stats-value" style={{ fontSize: 24, marginTop: 8 }}>
                    {batchDetail.file_count || 0}
                  </div>
                  <div className="stats-label">音频文件</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="stats-card">
                  <AudioOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                  <div className="stats-value" style={{ fontSize: 24, marginTop: 8, color: '#52c41a' }}>
                    {batchDetail.segment_count || 0}
                  </div>
                  <div className="stats-label">标注片段</div>
                </div>
              </Col>
            </Row>
            <List style={{ marginTop: 16 }}>
              <List.Item>
                <span>已完成标注:</span>
                <Tag color="green">{batchDetail.completed_count || 0} 段</Tag>
              </List.Item>
              <List.Item>
                <span>总时长:</span>
                <strong>{(batchDetail.total_duration || 0).toFixed(2)} 秒</strong>
              </List.Item>
            </List>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="导出说明">
            <List>
              <List.Item>
                <DownloadOutlined />
                <span style={{ marginLeft: 8 }}>JSON 格式: 包含完整的标注数据和元信息</span>
              </List.Item>
              <List.Item>
                <DownloadOutlined />
                <span style={{ marginLeft: 8 }}>包含: 音频文件信息、切分片段、说话人标记</span>
              </List.Item>
              <List.Item>
                <DownloadOutlined />
                <span style={{ marginLeft: 8 }}>包含: 转写文本、质检记录、修订历史</span>
              </List.Item>
            </List>
          </Card>
        </Col>
      </Row>
      )}
    </div>
  );
}

export default ExportPage;