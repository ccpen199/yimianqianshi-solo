import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  Button,
  Select,
  Upload,
  List,
  Progress,
  message,
  Space,
  Divider,
  Empty,
  Tag,
  Typography
} from 'antd';
import {
  UploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { batchApi, audioApi, segmentApi, speakerApi } from '../api/services';
import WaveformPlayer from '../components/WaveformPlayer';
import SegmentEditor from '../components/SegmentEditor';
import '../App.css';

const { Title } = Typography;
const { Option } = Select;

function Annotation() {
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batchId');

  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(batchId || null);
  const [audioFiles, setAudioFiles] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const waveformRef = useRef(null);

  const fetchBatches = () => {
    batchApi.getList({ pageSize: 100 })
      .then(res => {
        if (res.success) {
          setBatches(res.data.list);
        }
      });
  };

  const fetchAudioFiles = (bid) => {
    if (!bid) return;
    setLoading(true);
    audioApi.getList({ batchId: bid, pageSize: 100 })
      .then(res => {
        if (res.success) {
          setAudioFiles(res.data.list);
        }
      })
      .finally(() => setLoading(false));
  };

  const fetchSpeakers = (bid) => {
    if (!bid) return;
    speakerApi.getList({ batchId: bid })
      .then(res => {
        if (res.success) {
          setSpeakers(res.data);
        }
      });
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchAudioFiles(selectedBatch);
      fetchSpeakers(selectedBatch);
    }
  }, [selectedBatch]);

  const handleBatchChange = (value) => {
    setSelectedBatch(value);
    setSelectedAudio(null);
    setSegments([]);
  };

  const handleAudioSelect = async (audio) => {
    setSelectedAudio(audio);
    setSelectedSegment(null);
    const res = await audioApi.getDetail(audio.id);
    if (res.success) {
      setSegments(res.data.segments || []);
    }
  };

  const handleUpload = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('batchId', selectedBatch);

    try {
      await audioApi.upload(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
        onProgress({ percent: percentCompleted });
      });
      message.success('上传成功');
      onSuccess();
      fetchAudioFiles(selectedBatch);
      setUploadProgress(0);
    } catch (err) {
      onError(err);
      message.error('上传失败');
    }
  };

  const handleAutoSplit = async () => {
    if (!selectedAudio) {
      message.warning('请先选择音频文件');
      return;
    }
    setLoading(true);
    const res = await segmentApi.autoSplit({
      audioFileId: selectedAudio.id,
      minDuration: 3,
      maxDuration: 30
    });
    if (res.success) {
      message.success('自动切分成功');
      setSegments(res.data);
      setSelectedSegment(null);
    }
    setLoading(false);
  };

  const handleSegmentClick = (segment) => {
    setSelectedSegment(segment);
    if (waveformRef.current && segment) {
      waveformRef.current.playSegment(segment.start_time, segment.end_time);
    }
  };

  const handleSegmentSave = async (updatedSegment) => {
    const res = await segmentApi.update(updatedSegment.id, updatedSegment);
    if (res.success) {
      message.success('保存成功');
      setSegments(segments.map(s => s.id === updatedSegment.id ? res.data : s));
      setSelectedSegment(res.data);
    }
  };

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    const newSeg = {
      id: 'temp_' + Date.now(),
      audio_file_id: selectedAudio?.id,
      start_time: lastSeg ? lastSeg.end_time : 0,
      end_time: lastSeg ? Math.min(lastSeg.end_time + 5, 1000) : 5,
      text: '',
      status: 'pending'
    };
    setSelectedSegment(newSeg);
  };

  const handleSegmentsCreate = async (newSegments) => {
    const res = await segmentApi.createSegments({
      audioFileId: selectedAudio.id,
      segments: newSegments
    });
    if (res.success) {
      message.success('创建成功');
      setSegments(res.data);
      setSelectedSegment(null);
    }
  };

  const statusMap = {
    pending: { text: '待标注', color: 'blue' },
    processing: { text: '标注中', color: 'orange' },
    completed: { text: '已完成', color: 'green' },
    rework: { text: '待返工', color: 'red' }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">标注工作台</h1>
      </div>

      <Space style={{ marginBottom: 24 }}>
        <Select
          placeholder="选择批次"
          style={{ width: 250 }}
          value={selectedBatch}
          onChange={handleBatchChange}
          allowClear
        >
          {batches.map(batch => (
            <Option key={batch.id} value={batch.id}>{batch.name}</Option>
          ))}
        </Select>

        <Upload
          customRequest={handleUpload}
          showUploadList={false}
          disabled={!selectedBatch}
        >
          <Button icon={<UploadOutlined />} disabled={!selectedBatch}>
            上传音频
          </Button>
        </Upload>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <Progress percent={uploadProgress} style={{ width: 200 }} />
        )}
      </Space>

      <div className="annotation-panel">
        <Card
          title="音频文件列表"
          size="small"
          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          bodyStyle={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <div className="segment-list" style={{ flex: 1 }}>
            {audioFiles.length === 0 ? (
              <Empty description="暂无音频文件" />
            ) : (
              <List
                dataSource={audioFiles}
                renderItem={(item) => (
                  <List.Item
                    key={item.id}
                    onClick={() => handleAudioSelect(item)}
                    style={{
                      cursor: 'pointer',
                      padding: '12px',
                      borderRadius: 8,
                      marginBottom: 8,
                      border: selectedAudio?.id === item.id ? '2px solid #1890ff' : '1px solid #e8e8e8',
                      background: selectedAudio?.id === item.id ? '#e6f7ff' : '#fff'
                    }}
                  >
                    <List.Item.Meta
                      title={item.original_name}
                      description={
                        <div>
                          <span>{(item.duration || 0).toFixed(1)}s</span>
                          <Tag color={statusMap[item.status]?.color} style={{ marginLeft: 8 }}>
                            {statusMap[item.status]?.text}
                          </Tag>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="音频播放器" size="small">
            {selectedAudio ? (
              <WaveformPlayer
                ref={waveformRef}
                audioUrl={`/api/audio-files/stream/${selectedAudio.filename}`}
              />
            ) : (
              <Empty description="请选择音频文件" />
            )}

            {selectedAudio && (
              <div style={{ marginTop: 16 }}>
                <Space>
                  <Button
                    type="primary"
                    onClick={handleAutoSplit}
                    loading={loading}
                    disabled={segments.length > 0}
                  >
                    自动切分
                  </Button>
                  {segments.length > 0 && (
                    <Button onClick={handleAddSegment}>
                      添加片段
                    </Button>
                  )}
                </Space>
              </div>
            )}
          </Card>

          {segments.length > 0 && (
            <div className="annotation-panel" style={{ height: 'auto' }}>
              <Card title="片段列表" size="small" bodyStyle={{ maxHeight: 400, overflow: 'auto' }}>
                <List
                  dataSource={segments}
                  renderItem={(seg) => (
                    <div
                      key={seg.id}
                      className={`segment-item ${selectedSegment?.id === seg.id ? 'active' : ''}`}
                      onClick={() => handleSegmentClick(seg)}
                    >
                      <div className="segment-header">
                        <Space>
                          <span className="segment-time">
                            {seg.start_time.toFixed(2)} - {seg.end_time.toFixed(2)} s
                          </span>
                          {seg.speaker_name && (
                            <span
                              className="segment-speaker"
                              style={{ background: seg.color || '#1890ff' }}
                            >
                              {seg.speaker_name}
                            </span>
                          )}
                          <Tag className={`status-tag status-${seg.status}`}>
                            {statusMap[seg.status]?.text}
                          </Tag>
                        </Space>
                      </div>
                      <div className="segment-text">
                        {seg.text || <span style={{ color: '#999' }}>暂无转写文本</span>}
                      </div>
                    </div>
                  )}
                />
              </Card>

              <Card title="片段编辑" size="small">
                {selectedSegment ? (
                  <SegmentEditor
                    segment={selectedSegment}
                    speakers={speakers}
                    onSave={handleSegmentSave}
                    onPlay={(start, end) => {
                      if (waveformRef.current) {
                        waveformRef.current.playSegment(start, end);
                      }
                    }}
                  />
                ) : (
                  <Empty description="请选择要编辑的片段" />
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Annotation;