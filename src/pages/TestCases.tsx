import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import api from '../utils/api';
import type { TestCase } from '../types';

const TestCases: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    input_data: '',
    expected_output: '',
    prompt_id: ''
  });

  useEffect(() => {
    fetchTestCases();
  }, []);

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      const response = await api.get('/test-cases');
      if (response.data.success) {
        setTestCases(response.data.data || []);
      }
    } catch (err: any) {
      setError(err.message || '获取测试用例列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTestCase) {
        await api.put(`/test-cases/${editingTestCase.id}`, formData);
      } else {
        await api.post('/test-cases', formData);
      }
      setShowModal(false);
      setEditingTestCase(null);
      resetForm();
      fetchTestCases();
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleEdit = (testCase: TestCase) => {
    setEditingTestCase(testCase);
    setFormData({
      name: testCase.name,
      input_data: testCase.input_data,
      expected_output: testCase.expected_output || '',
      prompt_id: testCase.prompt_id?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个测试用例吗？')) return;
    try {
      await api.delete(`/test-cases/${id}`);
      fetchTestCases();
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      input_data: '',
      expected_output: '',
      prompt_id: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">测试用例管理</h1>
        <button
          onClick={() => { resetForm(); setEditingTestCase(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          新建测试用例
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {testCases.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 mb-4">暂无测试用例数据</p>
          <button
            onClick={() => { resetForm(); setEditingTestCase(null); setShowModal(true); }}
            className="text-cyan-600 hover:text-cyan-700 font-medium"
          >
            创建第一个测试用例
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">输入数据</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">期望输出</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {testCases.map((testCase) => (
                <tr key={testCase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{testCase.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{testCase.input_data}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{testCase.expected_output || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(testCase.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => handleEdit(testCase)} className="text-blue-600 hover:text-blue-800 mr-3">
                      <Edit size={16} className="inline" />
                    </button>
                    <button onClick={() => handleDelete(testCase.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={16} className="inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingTestCase ? '编辑测试用例' : '新建测试用例'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">输入数据 * (JSON)</label>
                <textarea
                  value={formData.input_data}
                  onChange={(e) => setFormData({ ...formData, input_data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent h-32 font-mono text-sm"
                  placeholder='{"key": "value"}'
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">期望输出</label>
                <textarea
                  value={formData.expected_output}
                  onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent h-24"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  {editingTestCase ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCases;
