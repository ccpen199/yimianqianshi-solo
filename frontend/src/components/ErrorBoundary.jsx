import React from 'react';
import { Button, Result } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('页面错误:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="加载失败"
          subTitle={this.state.error?.message || '页面发生了错误'}
          extra={
            <Button type="primary" onClick={this.handleReload}>
              点击重试
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;