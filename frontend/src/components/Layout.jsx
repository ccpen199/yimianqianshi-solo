import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const Layout = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { path: '/', label: '看板', roles: ['admin', 'doctor'] },
    { path: '/leads', label: '线索管理', roles: ['admin', 'consultant', 'doctor'] },
    { path: '/appointments', label: '预约管理', roles: ['admin', 'consultant', 'doctor', 'nurse'] },
    { path: '/plans', label: '治疗方案', roles: ['admin', 'doctor'] },
    { path: '/orders', label: '订单管理', roles: ['admin', 'consultant', 'cashier'] },
    { path: '/services', label: '服务记录', roles: ['admin', 'doctor', 'nurse'] },
    { path: '/followups', label: '复诊回访', roles: ['admin', 'doctor', 'nurse', 'consultant'] },
  ];

  const filteredMenus = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="layout">
      <aside className="sidebar">
        <h3>医美 CRM</h3>
        <nav>
          {filteredMenus.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'active' : ''}
              end
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <div className="header">
          <h2>欢迎使用医美客户管理系统</h2>
          <div className="user-info">
            <span>{user.name} ({user.role})</span>
            <button onClick={handleLogout}>退出</button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
