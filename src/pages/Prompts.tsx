import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Eye, History, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import type { Prompt } from '../types';

const Prompts: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    variables_json: '',
    example_input: '',
    scenario: '',
    risk_description: ''
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/prompts?page=1&pageSize=50');
      if (response.data.success) {
        setPrompts(response.data.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || '获取 Prompt 列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPrompt) {
        await api.put(`/prompts/${editingPrompt.id}`, formData);
      } else {
        await api.post('/prompts', { ...formData, status: 'draft' });
      }
      setShowModal(false);
      setEditingPrompt(null);
      resetForm();
      fetchPrompts();
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      content: prompt.content,
      variables_json: prompt.variables_json || '',
      example_input: prompt.example_input || '',
      scenario: prompt.scenario || '',
      risk_description: prompt.risk_description || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      variables_json: '',
      example_input: '',
      scenario: '',
      risk_description: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      testing: 'bg-yellow-100 text-yellow-700',
      ready: 'bg-green-100 text-green-700',
      archived: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      draft: '草稿',
      testing: '测试中',
      ready: '已就绪',
      archived: '已归档'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
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
        <h1 className="text-2xl font-bold text-gray-800">Prompt 管理</h1>
        <button
          onClick={() => { resetForm(); setEditingPrompt(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          新建 Prompt
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {prompts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 mb-4">暂无 Prompt 数据</p>
          <button
            onClick={() => { resetForm(); setEditingPrompt(null); setShowModal(true); }}
            className="text-cyan-600 hover:text-cyan-700 font-medium"
          >
            创建第一个 Prompt
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-800 truncate flex-1 mr-2">{prompt.name}</h3>
                {getStatusBadge(prompt.status)}
              </div>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{prompt.content}</p>
              {prompt.scenario && (
                <p className="text-xs text-gray-500 mb-4">适用场景: {prompt.scenario}</p>
              )}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {new Date(prompt.updated_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <Link to={`/prompts/${prompt.id}`} className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded">
                    <Eye size={16} />
                  </Link>
                  <Link to={`/prompts/${prompt.id}/versions`} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded">
                    <History size={16} />
                  </Link>
                  <button onClick={() => handleEdit(prompt)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingPrompt ? '编辑 Prompt' : '新建 Prompt'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent h-32"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">变量定义 (JSON)</label>
                <textarea
                  value={formData.variables_json}
                  onChange={(e) => setFormData({ ...formData, variables_json: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent h-24 font-mono text-sm"
                  placeholder='{"variable1": "类型", "variable2": "类型"}'
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">示例输入</label>
                  <input
                    type="text"
                    value={formData.example_input}
                    onChange={(e) => setFormData({ ...formData, example_input: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">适用场景</label>
                  <input
                    type="text"
                    value={formData.scenario}
                    onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">风险说明</label>
                <textarea
                  value={formData.risk_description}
                  onChange={(e) => setFormData({ ...formData, risk_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent h-20"
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
                  {editingPrompt ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prompts;
