import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button, Slider, Select, Space } from 'antd';

const { Option } = Select;
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FastBackwardOutlined,
  FastForwardOutlined
} from '@ant-design/icons';
import WaveSurfer from 'wavesurfer.js';

const WaveformPlayer = forwardRef(({ audioUrl }, ref) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let timeoutId;
    let wsInstance;
    
    if (containerRef.current && audioUrl) {
      setIsLoading(true);
      setHasError(false);
      
      wsInstance = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#1890ff',
        progressColor: '#40a9ff',
        cursorColor: '#fa8c16',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 120,
        normalize: true,
        responsive: true
      });

      wsInstance.load(audioUrl);

      wsInstance.on('play', () => setIsPlaying(true));
      wsInstance.on('pause', () => setIsPlaying(false));
      wsInstance.on('timeupdate', (time) => setCurrentTime(time));
      wsInstance.on('ready', () => {
        setDuration(wsInstance.getDuration());
        setIsLoading(false);
        clearTimeout(timeoutId);
      });
      wsInstance.on('finish', () => setIsPlaying(false));
      wsInstance.on('error', (err) => {
        console.error('Wavesurfer error:', err);
        setHasError(true);
        setIsLoading(false);
        clearTimeout(timeoutId);
      });
      
      wsInstance.on('loaderror', (err) => {
        console.error('Wavesurfer load error:', err);
        setHasError(true);
        setIsLoading(false);
        clearTimeout(timeoutId);
      });

      timeoutId = setTimeout(() => {
        setIsLoading(false);
        setHasError(true);
      }, 5000);

      wavesurferRef.current = wsInstance;

      return () => {
        clearTimeout(timeoutId);
        if (wsInstance) {
          wsInstance.destroy();
        }
      };
    }
  }, [audioUrl]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  useImperativeHandle(ref, () => ({
    playSegment: (start, end) => {
      if (wavesurferRef.current && duration > 0) {
        wavesurferRef.current.seekTo(start / duration);
        wavesurferRef.current.play();
        
        const checkTime = setInterval(() => {
          if (wavesurferRef.current) {
            const current = wavesurferRef.current.getCurrentTime();
            if (current >= end || !wavesurferRef.current.isPlaying()) {
              wavesurferRef.current.pause();
              clearInterval(checkTime);
            }
          } else {
            clearInterval(checkTime);
          }
        }, 100);
      }
    },
    getCurrentTime: () => currentTime,
    getDuration: () => duration
  }));

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleSeek = (value) => {
    if (wavesurferRef.current && duration > 0) {
      wavesurferRef.current.seekTo(value / duration);
    }
  };

  const handleRewind = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.skip(-5);
    }
  };

  const handleForward = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.skip(5);
    }
  };

  const handleReplay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasError) {
    return (
      <div className="waveform-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: '#999', marginBottom: 16 }}>音频文件暂不可用</p>
        <p style={{ color: '#666', fontSize: 12 }}>请上传真实音频文件后进行标注</p>
      </div>
    );
  }

  return (
    <div className="waveform-container">
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
          加载音频中...
        </div>
      ) : (
        <>
          <div ref={containerRef} style={{ width: '100%', marginBottom: 16 }} />
          
          <Slider
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            tooltip={{ formatter: (val) => formatTime(val) }}
            style={{ marginBottom: 16 }}
          />

          <div className="waveform-controls">
            <Space>
              <Button icon={<FastBackwardOutlined />} onClick={handleRewind}>
                -5s
              </Button>
              <Button
                type="primary"
                size="large"
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlayPause}
              >
                {isPlaying ? '暂停' : '播放'}
              </Button>
              <Button icon={<FastForwardOutlined />} onClick={handleForward}>
                +5s
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReplay}>
                重播
              </Button>
            </Space>

            <Space style={{ marginLeft: 'auto' }}>
              <span>倍速:</span>
              <Select
                value={playbackRate}
                onChange={setPlaybackRate}
                style={{ width: 100 }}
              >
                <Option value={0.5}>0.5x</Option>
                <Option value={0.75}>0.75x</Option>
                <Option value={1}>1x</Option>
                <Option value={1.25}>1.25x</Option>
                <Option value={1.5}>1.5x</Option>
                <Option value={2}>2x</Option>
              </Select>
              <span style={{ fontFamily: 'monospace', marginLeft: 16 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </Space>
          </div>
        </>
      )}
    </div>
  );
});

WaveformPlayer.displayName = 'WaveformPlayer';

export default WaveformPlayer;