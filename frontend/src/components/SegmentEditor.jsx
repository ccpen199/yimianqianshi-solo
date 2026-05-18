import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Space, Tag, Divider, message } from 'antd';
import { PlayCircleOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { speakerApi } from '../api/services';

const { TextArea } = Input;
const { Option } = Select;

function SegmentEditor({ segment, speakers, onSave, onPlay, batchId }) {
  const [form] = Form.useForm();
  const [editingSpeaker, setEditingSpeaker] = useState(false);
  const [speakerList, setSpeakerList] = useState(speakers);
  const [newSpeakerName, setNewSpeakerName] = useState('');

  useEffect(() => {
    if (segment) {
      form.setFieldsValue(segment);
    }
  }, [segment, form]);

  useEffect(() => {
    setSpeakerList(speakers);
  }, [speakers]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const selectedSpeaker = speakerList.find(s => s.id === values.speaker_id);
      onSave({
        ...segment,
        ...values,
        speaker_name: selectedSpeaker?.name || '',
        status: values.text && values.text.trim() ? 'completed' : 'pending'
      });
    } catch (err) {
      message.error('请填写必填项');
    }
  };

  const handlePlaySegment = () => {
    onPlay(segment.start_time, segment.end_time);
  };

  const handleAddSpeaker = async () => {
    if (!newSpeakerName.trim()) {
      message.warning('请输入说话人名称');
      return;
    }
    const res = await speakerApi.create({
      batch_id: batchId,
      name: newSpeakerName.trim()
    });
    if (res.success) {
      setSpeakerList([...speakerList, res.data]);
      setNewSpeakerName('');
      setEditingSpeaker(false);
      form.setFieldValue('speaker_id', res.data.id);
      message.success('添加成功');
    }
  };

  const formatTime = (seconds) => {
    return seconds.toFixed(2) + ' s';
  };

  if (!segment) return null;

  return (
    <Form form={form} layout="vertical" className="editor-form">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<PlayCircleOutlined />} onClick={handlePlaySegment}>
            播放片段
          </Button>
          <Tag color="blue">
            开始: {formatTime(segment.start_time)}
          </Tag>
          <Tag color="green">
            结束: {formatTime(segment.end_time)}
          </Tag>
          <Tag color="orange">
            时长: {formatTime(segment.end_time - segment.start_time)}
          </Tag>
        </Space>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Form.Item label="说话人" name="speaker_id">
        {editingSpeaker ? (
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入说话人名称"
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              onPressEnter={handleAddSpeaker}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSpeaker}>
              添加
            </Button>
            <Button onClick={() => setEditingSpeaker(false)}>取消</Button>
          </Space.Compact>
        ) : (
          <Space.Compact style={{ width: '100%' }}>
            <Select
              placeholder="选择说话人"
              style={{ flex: 1 }}
              allowClear
              optionLabelProp="label"
            >
              {speakerList.map(speaker => (
                <Option key={speaker.id} value={speaker.id} label={speaker.name}>
                  <Space>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: speaker.color || '#1890ff'
                      }}
                    />
                    {speaker.name}
                    {speaker.role && <Tag size="small">{speaker.role}</Tag>}
                  </Space>
                </Option>
              ))}
            </Select>
            <Button onClick={() => setEditingSpeaker(true)}>+ 新建</Button>
          </Space.Compact>
        )}
      </Form.Item>

      <Form.Item
        label="转写文本"
        name="text"
        rules={[{ required: true, message: '请输入转写文本' }]}
      >
        <TextArea
          rows={6}
          placeholder="请输入转写文本..."
          autoSize={{ minRows: 4, maxRows: 8 }}
        />
      </Form.Item>

      <Form.Item label="备注" name="remark">
        <TextArea rows={2} placeholder="添加片段备注..." />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          size="large"
          style={{ width: '100%' }}
        >
          保存标注
        </Button>
      </Form.Item>
    </Form>
  );
}

export default SegmentEditor;