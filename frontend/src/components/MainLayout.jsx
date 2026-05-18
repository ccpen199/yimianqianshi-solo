import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd'
import {
  DashboardOutlined,
  TagOutlined,
  FileTextOutlined,
  EditOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Header, Sider, Content } = Layout

function MainLayout({ children, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/tags', icon: <TagOutlined />, label: '标签体系', roles: ['admin', 'operator'] },
    { key: '/texts', icon: <FileTextOutlined />, label: '文本导入', roles: ['admin', 'operator'] },
    { key: '/annotation', icon: <EditOutlined />, label: '标注任务', roles: ['admin', 'annotator'] },
    { key: '/review', icon: <CheckCircleOutlined />, label: '审核任务', roles: ['admin', 'reviewer'] },
    { key: '/export', icon: <DownloadOutlined />, label: '数据导出', roles: ['admin', 'data_owner'] }
  ].filter(item => !item.roles || item.roles.includes(user?.role))

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: onLogout
    }
  ]

  const getRoleText = (role) => {
    const roleMap = {
      admin: '管理员',
      operator: '运营',
      annotator: '标注员',
      reviewer: '审核员',
      data_owner: '数据负责人'
    }
    return roleMap[role] || role
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="light"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 'bold',
          color: '#1890ff',
          borderBottom: '1px solid #f0f0f0'
        }}>
          {collapsed ? '标注' : '文本标注平台'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>
                {user?.username} ({getRoleText(user?.role)})
              </span>
            </div>
          </Dropdown>
        </Header>
        
        <Content style={{
          margin: '24px',
          padding: '24px',
          background: '#fff',
          borderRadius: 8,
          minHeight: 280,
          overflow: 'auto'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
