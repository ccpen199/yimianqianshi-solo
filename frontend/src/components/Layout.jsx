import React from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Typography } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  PhoneOutlined, 
  FileTextOutlined, 
  BarChartOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getMenuItems = () => {
    const items = [];
    
    if (['supervisor', 'admin'].includes(user?.role)) {
      items.push({
        key: '/',
        icon: <DashboardOutlined />,
        label: '数据概览',
        onClick: () => navigate('/')
      });
    }
    
    if (['supervisor', 'admin'].includes(user?.role)) {
      items.push({
        key: '/leads',
        icon: <FileTextOutlined />,
        label: '线索管理',
        onClick: () => navigate('/leads')
      });
    }

    if (['supervisor', 'admin'].includes(user?.role)) {
      items.push({
        key: '/agents',
        icon: <UserOutlined />,
        label: '坐席管理',
        onClick: () => navigate('/agents')
      });
    }

    if (['operator'].includes(user?.role)) {
      items.push({
        key: '/calls',
        icon: <PhoneOutlined />,
        label: '外呼任务',
        onClick: () => navigate('/calls')
      });
    }

    if (['quality_inspector', 'admin'].includes(user?.role)) {
      items.push({
        key: '/quality',
        icon: <FileTextOutlined />,
        label: '质检管理',
        onClick: () => navigate('/quality')
      });
    }

    if (['supervisor', 'admin'].includes(user?.role)) {
      items.push({
        key: '/reports',
        icon: <BarChartOutlined />,
        label: '报表中心',
        onClick: () => navigate('/reports')
      });
    }

    return items;
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout
    }
  ];

  const getRoleName = (role) => {
    const roleMap = {
      supervisor: '主管',
      operator: '坐席',
      quality_inspector: '质检员',
      admin: '管理员'
    };
    return roleMap[role] || role;
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={200}>
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Title level={5} style={{ color: '#fff', margin: 0 }}>
            外呼管理系统
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <AntLayout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          justifyContent: 'flex-end',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
        }}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 8 }} />
              <span>{user?.name} ({getRoleName(user?.role)})</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', overflow: 'auto' }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
