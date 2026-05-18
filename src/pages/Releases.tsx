import React, { useEffect, useState } from 'react';
import { Plus, Check, X, RotateCcw, Rocket, FileText } from 'lucide-react';
import api from '../utils/api';
import type { Release } from '../types';

const Releases: React.FC = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    prompt_version_id: '',
    usage_scope: ''
  });

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const response = await api.get('/releases');
      if (response.data.success) {
        setReleases(response.data.data || []);
      }
    } catch (err: any) {
      setError(err.message || '获取发布列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/releases', formData);
      setShowModal(false);
      resetForm();
      fetchReleases();
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/releases/${id}/approve`, { gray_ratio: 100 });
      fetchReleases();
    } catch (err: any) {
      alert(err.response?.data?.error || '审批失败');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('请输入拒绝原因:');
    if (!reason) return;
    try {
      await api.post(`/releases/${id}/reject`, { reason });
      fetchReleases();
    } catch (err: any) {
      alert(err.response?.data?.error || '拒绝失败');
    }
  };

  const handleRollback = async (id: number) => {
    const reason = prompt('请输入回滚原因:');
    if (!reason) return;
    try {
      await api.post(`/releases/${id}/rollback`, { reason });
      fetchReleases();
    } catch (err: any) {
      alert(err.response?.data?.error || '回滚失败');
    }
  };

  const handleRelease = async (id: number) => {
    try {
      await api.post(`/releases/${id}/release`);
      fetchReleases();
    } catch (err: any) {
      alert(err.response?.data?.error || '发布失败');
    }
  };

  const resetForm = () => {
    setFormData({
      prompt_version_id: '',
      usage_scope: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_review: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      released: 'bg-green-100 text-green-700',
      rolled_back: 'bg-gray-100 text-gray-700',
      rejected: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      pending_review: '待审批',
      approved: '已批准',
      released: '已发布',
      rolled_back: '已回滚',
      rejected: '已拒绝'
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
        <h1 className="text-2xl font-bold text-gray-800">发布管理</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          新建发布申请
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {releases.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Rocket className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 mb-4">暂无发布记录</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="text-cyan-600 hover:text-cyan-700 font-medium"
          >
            创建第一个发布申请
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {releases.map((release) => (
            <div key={release.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{release.prompt_name || `Release #${release.id}`}</h3>
                  <p className="text-sm text-gray-500">版本: {release.version_number || 'N/A'}</p>
                </div>
                {getStatusBadge(release.status)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">灰度比例</span>
                  <p className="font-medium">{release.gray_ratio}%</p>
                </div>
                <div>
                  <span className="text-gray-500">使用范围</span>
                  <p className="font-medium">{release.usage_scope || '未设置'}</p>
                </div>
                <div>
                  <span className="text-gray-500">创建时间</span>
                  <p className="font-medium">{new Date(release.created_at).toLocaleDateString()}</p>
                </div>
                {release.rollback_reason && (
                  <div>
                    <span className="text-gray-500">回滚原因</span>
                    <p className="font-medium text-red-600">{release.rollback_reason}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                {release.status === 'pending_review' && (
                  <>
                    <button onClick={() => handleApprove(release.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
                      <Check size={16} />
                      批准
                    </button>
                    <button onClick={() => handleReject(release.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">
                      <X size={16} />
                      拒绝
                    </button>
                  </>
                )}
                {release.status === 'approved' && (
                  <button onClick={() => handleRelease(release.id)} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm">
                    <Rocket size={16} />
                    正式发布
                  </button>
                )}
                {release.status === 'released' && (
                  <button onClick={() => handleRollback(release.id)} className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm">
                    <RotateCcw size={16} />
                    回滚
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">新建发布申请</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt 版本 ID *</label>
                <input
                  type="number"
                  value={formData.prompt_version_id}
                  onChange={(e) => setFormData({ ...formData, prompt_version_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">使用范围</label>
                <input
                  type="text"
                  value={formData.usage_scope}
                  onChange={(e) => setFormData({ ...formData, usage_scope: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="如：生产环境、测试环境"
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
                  提交申请
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Releases;
