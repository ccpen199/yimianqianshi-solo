import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Badge, Modal, Descriptions, message } from 'antd';
import {
  PhoneOutlined,
  DashboardOutlined,
  FileTextOutlined,
  AuditOutlined,
  UserOutlined,
  LogoutOutlined,
  CustomerServiceOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';

const { Header, Sider, Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [profileVisible, setProfileVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const handleProfileClick = () => {
    setProfileVisible(true);
  };

  const handleSettingsClick = () => {
    message.info('系统设置功能开发中...');
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '实时看板',
      roles: ['admin', 'supervisor', 'agent', 'quality', 'ticket'],
    },
    {
      key: '/agent-workspace',
      icon: <CustomerServiceOutlined />,
      label: '坐席工作台',
      roles: ['admin', 'supervisor', 'agent'],
    },
    {
      key: '/calls',
      icon: <PhoneOutlined />,
      label: '通话记录',
      roles: ['admin', 'supervisor', 'agent'],
    },
    {
      key: '/tickets',
      icon: <FileTextOutlined />,
      label: '工单管理',
      roles: ['admin', 'supervisor', 'agent', 'ticket'],
    },
    {
      key: '/quality',
      icon: <AuditOutlined />,
      label: '质检管理',
      roles: ['admin', 'supervisor', 'quality'],
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: '客户管理',
      roles: ['admin', 'supervisor', 'agent', 'quality', 'ticket'],
    },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    user?.role && item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: handleProfileClick,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: handleSettingsClick,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 18,
          fontWeight: 'bold',
        }}>
          <PhoneOutlined style={{ marginRight: 8 }} />
          呼叫中心
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={filteredMenuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: 'white',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {filteredMenuItems.find(item => item.key === location.pathname)?.label || '呼叫中心系统'}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.name}</span>
              <Badge status={user?.status === 'online' ? 'success' : 'default'} />
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>

      <Modal
        title="个人信息"
        open={profileVisible}
        onCancel={() => setProfileVisible(false)}
        footer={[
          <Button key="close" onClick={() => setProfileVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <Descriptions column={1} bordered>
          <Descriptions.Item label="用户ID">{user?.id}</Descriptions.Item>
          <Descriptions.Item label="用户名">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="姓名">{user?.name}</Descriptions.Item>
          <Descriptions.Item label="角色">
            {{
              admin: '系统管理员',
              supervisor: '主管',
              agent: '坐席',
              quality: '质检员',
              ticket: '工单处理',
            }[user?.role || ''] || user?.role}
          </Descriptions.Item>
          <Descriptions.Item label="技能组">
            {{
              general: '通用客服',
              tech: '技术支持',
            }[user?.skill_group || ''] || user?.skill_group || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Badge status={user?.status === 'online' ? 'success' : 'default'} text={user?.status === 'online' ? '在线' : '离线'} />
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    </Layout>
  );
};

export default AppLayout;
