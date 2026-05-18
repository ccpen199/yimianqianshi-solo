import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import request from '@/utils/request';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setErrorMsg('');
    console.log('Login values:', values);
    try {
      const res = await request.post('/auth/login', values);
      console.log('Login response:', res);
      if (res?.success && res?.data) {
        console.log('Setting auth:', res.data);
        setAuth(res.data.token, res.data.user);
        message.success('登录成功');
        setTimeout(() => navigate('/', { replace: true }), 100);
      } else {
        setErrorMsg(res?.message || '登录失败，请重试');
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      console.error('Error response:', error?.response);
      setErrorMsg(error?.response?.data?.message || error?.message || '网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card
        title={<h2 style={{ textAlign: 'center', margin: 0 }}>呼叫中心系统</h2>}
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        {errorMsg && (
          <Alert
            message="登录失败"
            description={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setErrorMsg('')}
          />
        )}
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%' }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, fontSize: 12, color: '#999', textAlign: 'center' }}>
          <p>默认账号：</p>
          <p>坐席：agent1 / 123456</p>
          <p>主管：supervisor1 / 123456</p>
          <p>质检：quality1 / 123456</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
