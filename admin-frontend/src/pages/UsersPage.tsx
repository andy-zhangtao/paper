import { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import type { User, UserListParams } from '../services/userService';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<UserListParams>({
    page: 1,
    pageSize: 20,
  });

  // 充值弹窗状态
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeDescription, setRechargeDescription] = useState('');

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getUserList(filters);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.status === 'active' ? '封禁' : '解封';
    if (!confirm(`确定要${action}用户 ${user.email} 吗？`)) {
      return;
    }

    try {
      await userService.toggleUserStatus(user.id);
      loadUsers();
    } catch (error) {
      alert(`${action}失败`);
    }
  };

  const handleOpenRecharge = (user: User) => {
    setSelectedUser(user);
    setRechargeAmount('');
    setRechargeDescription('');
    setShowRechargeModal(true);
  };

  const handleRecharge = async () => {
    if (!selectedUser || !rechargeAmount) {
      return;
    }

    try {
      await userService.rechargeCredits(
        selectedUser.id,
        Number(rechargeAmount),
        rechargeDescription
      );
      setShowRechargeModal(false);
      loadUsers();
      alert('充值成功');
    } catch (error) {
      alert('充值失败');
    }
  };

  const handleSearch = (keyword: string) => {
    setFilters({ ...filters, keyword, page: 1 });
  };

  const handleFilterStatus = (status: string) => {
    setFilters({ ...filters, status: status || undefined, page: 1 });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">用户管理</h2>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="搜索邮箱或手机号"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            onChange={(e) => handleSearch(e.target.value)}
          />
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg"
            onChange={(e) => handleFilterStatus(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="banned">已封禁</option>
          </select>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">加载中...</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">手机</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">积分</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">论文数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.credits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.total_papers || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status === 'active' ? '正常' : '已封禁'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleOpenRecharge(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        充值
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`${
                          user.status === 'active'
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {user.status === 'active' ? '封禁' : '解封'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 分页 */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 充值弹窗 */}
      {showRechargeModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">为用户充值积分</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户</label>
                <div className="text-gray-900">{selectedUser.email}</div>
                <div className="text-sm text-gray-500">当前积分：{selectedUser.credits}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">充值数量</label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="请输入充值积分数量"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={rechargeDescription}
                  onChange={(e) => setRechargeDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="选填"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleRecharge}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                确认充值
              </button>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
