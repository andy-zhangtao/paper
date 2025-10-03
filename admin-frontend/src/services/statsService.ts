import api from './api';

export const statsService = {
  // 获取系统概览
  getSystemOverview: async (): Promise<any> => {
    const response = await api.get('/admin/stats/overview');
    return response.data;
  },

  // 获取用户增长趋势
  getUserGrowthTrend: async (days: number = 30): Promise<any> => {
    const response = await api.get('/admin/stats/user-growth', { params: { days } });
    return response.data;
  },

  // 获取收入趋势
  getRevenueTrend: async (days: number = 30): Promise<any> => {
    const response = await api.get('/admin/stats/revenue-trend', { params: { days } });
    return response.data;
  },

  // 获取积分消费统计
  getCreditConsumptionStats: async (days: number = 30): Promise<any> => {
    const response = await api.get('/admin/stats/credit-consumption', { params: { days } });
    return response.data;
  },

  // 获取热门用户排行
  getTopUsers: async (limit: number = 20, sortBy: string = 'consumption'): Promise<any> => {
    const response = await api.get('/admin/stats/top-users', { params: { limit, sortBy } });
    return response.data;
  },

  // 获取充值套餐销售统计
  getPackageSalesStats: async (days: number = 30): Promise<any> => {
    const response = await api.get('/admin/stats/package-sales', { params: { days } });
    return response.data;
  },

  // 获取实时数据
  getRealtimeData: async (): Promise<any> => {
    const response = await api.get('/admin/stats/realtime');
    return response.data;
  },
};
