import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  TestTube,
  BarChart,
  LineChart,
  Rocket,
  Users,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
    { path: '/prompts', icon: FileText, label: 'Prompt 管理' },
    { path: '/test-cases', icon: TestTube, label: '测试用例' },
    { path: '/evaluations', icon: BarChart, label: '评测任务' },
    { path: '/releases', icon: Rocket, label: '版本发布' },
    { path: '/monitoring', icon: LineChart, label: '监控面板' },
    { path: '/users', icon: Users, label: '用户管理', adminOnly: true }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-800 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold text-cyan-400">Prompt Manager</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-700 rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') {
              return null;
            }
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-300 hover:bg-slate-700'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
              <span className="font-bold">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            {sidebarOpen && (
              <div>
                <p className="font-medium">{user?.username}</p>
                <p className="text-xs text-gray-400">
                  {user?.role === 'admin' ? '管理员' :
                   user?.role === 'engineer' ? '算法工程师' :
                   user?.role === 'product' ? '产品运营' : '访客'}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-red-400 hover:bg-slate-700 rounded-lg"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
