import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

function AudioDetail() {
  const navigate = useNavigate();

  return (
    <Result
      status="info"
      title="音频详情"
      subTitle="请使用标注工作台进行音频标注工作"
      extra={
        <Button type="primary" onClick={() => navigate('/annotation')}>
          前往标注工作台
        </Button>
      }
    />
  );
}

export default AudioDetail;