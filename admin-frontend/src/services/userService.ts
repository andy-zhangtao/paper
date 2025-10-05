import api from './api';

export interface User {
  id: string;
  email: string;
  phone: string;
  credits: number;
  credits_expire_at?: string | null;
  status: 'active' | 'banned';
  created_at: string;
  updated_at: string;
  total_papers?: number;
  total_consumption?: number;
  total_recharge?: number;
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const userService = {
  // 获取用户列表
  getUserList: async (params: UserListParams): Promise<UserListResponse> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // 获取用户详情
  getUserDetail: async (userId: string): Promise<any> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  // 封禁/解封用户
  toggleUserStatus: async (userId: string, reason?: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/status`, { reason });
  },

  // 为用户充值积分
  rechargeCredits: async (userId: string, amount: number, description?: string): Promise<void> => {
    await api.post(`/admin/users/${userId}/recharge`, { amount, description });
  },

  // 直接设置用户积分与有效期
  updateUserCredits: async (
    userId: string,
    payload: { credits: number; expires_at?: string | null; reason?: string }
  ): Promise<void> => {
    await api.put(`/admin/users/${userId}/credits`, payload);
  },

  // 获取用户积分流水
  getUserTransactions: async (userId: string, params?: { page?: number; pageSize?: number; type?: string }): Promise<any> => {
    const response = await api.get(`/admin/users/${userId}/transactions`, { params });
    return response.data;
  },
};
