import React, { useEffect, useState } from 'react';
import { FileText, Rocket, TestTube, BarChart3, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../utils/api';
import type { MonitoringStats } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/monitoring/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg">
        <p>{error}</p>
        <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
          重试
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Prompt 总数', value: stats?.total_prompts || 0, icon: FileText, color: 'bg-blue-500' },
    { label: '发布总数', value: stats?.total_releases || 0, icon: Rocket, color: 'bg-green-500' },
    { label: '活跃版本', value: stats?.active_releases || 0, icon: TrendingUp, color: 'bg-cyan-500' },
    { label: '测试用例', value: stats?.total_test_cases || 0, icon: TestTube, color: 'bg-purple-500' },
    { label: '评测总数', value: stats?.total_evaluations || 0, icon: BarChart3, color: 'bg-orange-500' },
    { label: '异常评测', value: stats?.error_evaluations || 0, icon: AlertTriangle, color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-8">仪表盘</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                </div>
                <div className={`${card.color} p-4 rounded-xl`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h2>
          <div className="space-y-3">
            <a href="/prompts" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <FileText size={20} className="text-cyan-500" />
              <span className="text-gray-700">创建新 Prompt</span>
            </a>
            <a href="/test-cases" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <TestTube size={20} className="text-purple-500" />
              <span className="text-gray-700">管理测试用例</span>
            </a>
            <a href="/releases" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Rocket size={20} className="text-green-500" />
              <span className="text-gray-700">查看发布记录</span>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">系统状态</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">平均评分</span>
                <span className="font-medium">{stats?.average_score?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats?.average_score || 0) * 1.2, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">调用总数</span>
                <span className="font-medium">{stats?.total_calls?.toLocaleString() || 0}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">失败率</span>
                <span className={`font-medium ${(stats?.failure_rate || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats?.failure_rate?.toFixed(2) || '0.00'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
