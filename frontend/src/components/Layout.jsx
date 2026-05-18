import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const menuItems = [
  { path: '/', label: '首页' },
  { path: '/customers', label: '客户管理' },
  { path: '/properties', label: '房源管理' },
  { path: '/viewings', label: '带看管理' },
  { path: '/negotiations', label: '谈判签约' },
  { path: '/contracts', label: '合同管理' },
  { path: '/commissions', label: '佣金财务' },
]

function Layout() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-logo">房产经纪CRM</div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="main-content">
        <div className="header">
          <span>欢迎, {user?.name || '用户'}</span>
          <button className="btn btn-default" onClick={handleLogout}>退出</button>
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
