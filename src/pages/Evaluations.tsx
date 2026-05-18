import React from 'react';
import { BarChart3, Play } from 'lucide-react';

const Evaluations: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-8">评测任务</h1>
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
        <p className="text-gray-500 mb-4">评测功能正在开发中</p>
        <button className="flex items-center gap-2 mx-auto bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Play size={20} />
          运行评测
        </button>
      </div>
    </div>
  );
};

export default Evaluations;
