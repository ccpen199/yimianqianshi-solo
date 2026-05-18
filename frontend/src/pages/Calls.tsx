import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Descriptions,
  Card,
  message,
} from 'antd';
import {
  EyeOutlined,
  AudioOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Call } from '@/types';
import request from '@/utils/request';
import dayjs from 'dayjs';

const Calls: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await request.get('/calls/history/list');
      setCalls(res.data || []);
    } catch (error) {
      console.error('获取通话记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetail = async (call: Call) => {
    try {
      const res = await request.get(`/calls/${call.call_id}`);
      setSelectedCall(res.data);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('获取通话详情失败:', error);
    }
  };

  const columns = [
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
      width: 130,
    },
    {
      title: '客户姓名',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 100,
      render: (name: string) => name || '未知',
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
      render: (d: string) => (
        <Tag color={d === 'inbound' ? 'blue' : 'green'}>
          {d === 'inbound' ? '呼入' : '呼出'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          waiting: { color: 'orange', text: '等待中' },
          ringing: { color: 'processing', text: '振铃中' },
          connected: { color: 'success', text: '通话中' },
          held: { color: 'warning', text: '保持中' },
          ended: { color: 'default', text: '已结束' },
          missed: { color: 'red', text: '未接' },
          abandoned: { color: 'red', text: '已放弃' },
          transferred: { color: 'purple', text: '已转接' },
        };
        const config = statusMap[s] || { color: 'default', text: s };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '坐席',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 100,
      render: (name: string) => name || '-',
    },
    {
      title: '队列',
      dataIndex: 'queue_name',
      key: 'queue_name',
      width: 100,
      render: (name: string) => name || '-',
    },
    {
      title: '通话时长',
      dataIndex: 'total_duration',
      key: 'total_duration',
      width: 100,
      render: (seconds: number) => {
        if (!seconds) return '-';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
      },
    },
    {
      title: '录音',
      dataIndex: 'recording_status',
      key: 'recording_status',
      width: 80,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          none: { color: 'default', text: '无' },
          recording: { color: 'processing', text: '录音中' },
          completed: { color: 'success', text: '已完成' },
          failed: { color: 'red', text: '失败' },
          missing: { color: 'orange', text: '缺失' },
        };
        const config = statusMap[status || 'none'] || statusMap.none;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (t: string) => dayjs(t).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Call) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.recording_status === 'completed' && (
            <Button
              type="link"
              size="small"
              icon={<AudioOutlined />}
              onClick={() => message.info('播放录音')}
            >
              播放
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Table
          columns={columns}
          dataSource={calls}
          rowKey="call_id"
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
        title="通话详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedCall && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="通话ID" span={2}>
                {selectedCall.call_id}
              </Descriptions.Item>
              <Descriptions.Item label="来电号码">{selectedCall.caller_number}</Descriptions.Item>
              <Descriptions.Item label="被叫号码">{selectedCall.called_number || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户姓名">{selectedCall.customer_name || '未知'}</Descriptions.Item>
              <Descriptions.Item label="方向">
                {selectedCall.direction === 'inbound' ? '呼入' : '呼出'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={{
                  waiting: 'orange',
                  ringing: 'processing',
                  connected: 'success',
                  held: 'warning',
                  ended: 'default',
                  missed: 'red',
                  abandoned: 'red',
                }[selectedCall.status] || 'default'}>
                  {{
                    waiting: '等待中',
                    ringing: '振铃中',
                    connected: '通话中',
                    held: '保持中',
                    ended: '已结束',
                    missed: '未接',
                    abandoned: '已放弃',
                  }[selectedCall.status] || selectedCall.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="坐席">{selectedCall.agent_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="队列">{selectedCall.queue_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="录音状态">
                {{
                  none: '无',
                  recording: '录音中',
                  completed: '已完成',
                  failed: '失败',
                  missing: '缺失',
                }[selectedCall.recording_status || 'none']}
              </Descriptions.Item>
              <Descriptions.Item label="通话时长">
                {selectedCall.total_duration
                  ? `${Math.floor(selectedCall.total_duration / 60)}:${(selectedCall.total_duration % 60).toString().padStart(2, '0')}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(selectedCall.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Calls;
