import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  BarChartOutlined,
  TeamOutlined
} from '@ant-design/icons';

const { Header, Content, Sider } = AntLayout;

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: <Link to="/">仪表盘</Link>,
  },
  {
    key: '/leads',
    icon: <UserOutlined />,
    label: <Link to="/leads">线索池</Link>,
  },
  {
    key: '/rules',
    icon: <SettingOutlined />,
    label: <Link to="/rules">评分规则</Link>,
  },
  {
    key: '/sales',
    icon: <TeamOutlined />,
    label: <Link to="/sales">销售管理</Link>,
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: <Link to="/reports">数据报表</Link>,
  },
];

const Layout = ({ children }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const selectedKey = location.pathname.startsWith('/leads/') ? '/leads' : location.pathname;

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 16 : 18,
          fontWeight: 'bold',
          background: 'rgba(255,255,255,0.1)'
        }}>
          {collapsed ? 'LS' : '线索评分系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
        />
      </Sider>
      <AntLayout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>B2B 线索评分系统</h2>
        </Header>
        <Content style={{
          margin: '24px',
          padding: 24,
          minHeight: 280,
          background: colorBgContainer,
          borderRadius: 8
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;