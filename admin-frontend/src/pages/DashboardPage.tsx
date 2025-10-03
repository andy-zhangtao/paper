import { useEffect, useState } from 'react';
import { statsService } from '../services/statsService';

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const data = await statsService.getSystemOverview();
      setOverview(data);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">加载失败</div>
      </div>
    );
  }

  const statCards = [
    {
      title: '总用户数',
      value: overview.users?.total_users || 0,
      subtitle: `今日新增 ${overview.users?.today_new_users || 0}`,
      icon: '👥',
      color: 'bg-blue-500',
    },
    {
      title: '总论文数',
      value: overview.papers?.total_papers || 0,
      subtitle: `今日新增 ${overview.papers?.today_new_papers || 0}`,
      icon: '📄',
      color: 'bg-green-500',
    },
    {
      title: '总收入（元）',
      value: (overview.revenue?.total_revenue || 0).toFixed(2),
      subtitle: `今日 ${(overview.revenue?.today_revenue || 0).toFixed(2)}`,
      icon: '💰',
      color: 'bg-yellow-500',
    },
    {
      title: '积分消费',
      value: overview.credits?.total_consume || 0,
      subtitle: `今日 ${overview.credits?.today_consume || 0}`,
      icon: '⚡',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">数据概览</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} text-white p-3 rounded-lg text-2xl`}>
                {card.icon}
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-1">{card.title}</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
            <p className="text-sm text-gray-500">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户统计 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">用户统计</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">活跃用户</span>
              <span className="font-semibold text-green-600">
                {overview.users?.active_users || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">封禁用户</span>
              <span className="font-semibold text-red-600">
                {overview.users?.banned_users || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">今日新增</span>
              <span className="font-semibold text-blue-600">
                {overview.users?.today_new_users || 0}
              </span>
            </div>
          </div>
        </div>

        {/* 积分统计 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">积分统计</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">总充值</span>
              <span className="font-semibold text-green-600">
                {overview.credits?.total_recharge || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">总消费</span>
              <span className="font-semibold text-red-600">
                {overview.credits?.total_consume || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">今日充值</span>
              <span className="font-semibold text-blue-600">
                {overview.credits?.today_recharge || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
