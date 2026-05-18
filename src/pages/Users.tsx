import React from 'react';
import { Users, Shield, UserCog } from 'lucide-react';

const UsersPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-8">用户管理</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                  <span className="text-cyan-600 font-medium">管</span>
                </div>
                <span className="font-medium text-gray-800">admin</span>
              </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">管理员</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">2024-01-01</td>
              <td className="px-6 py-4">
                <button className="text-cyan-600 hover:text-cyan-800">
                  <UserCog size={16} />
                </button>
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-medium">工</span>
                </div>
                <span className="font-medium text-gray-800">engineer</span>
              </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">算法工程师</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">2024-01-01</td>
              <td className="px-6 py-4">
                <button className="text-cyan-600 hover:text-cyan-800">
                  <UserCog size={16} />
                </button>
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-medium">产</span>
                </div>
                <span className="font-medium text-gray-800">product</span>
              </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">产品运营</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">2024-01-01</td>
              <td className="px-6 py-4">
                <button className="text-cyan-600 hover:text-cyan-800">
                  <UserCog size={16} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;
