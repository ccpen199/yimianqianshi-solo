import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

const Monitoring: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-8">监控面板</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-100 rounded-xl">
              <TrendingUp className="text-cyan-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">1,234</p>
              <p className="text-gray-500 text-sm">总调用量</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <BarChart3 className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">98.5%</p>
              <p className="text-gray-500 text-sm">成功率</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">3</p>
              <p className="text-gray-500 text-sm">异常告警</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
        <p className="text-gray-500">详细监控图表功能正在开发中</p>
      </div>
    </div>
  );
};

export default Monitoring;
