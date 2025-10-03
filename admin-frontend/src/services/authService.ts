import api from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AdminInfo {
  id: string;
  username: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  admin: AdminInfo;
}

export const authService = {
  // 管理员登录
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/admin/auth/login', credentials);
    return response.data;
  },

  // 获取当前管理员信息
  getProfile: async (): Promise<{ admin: AdminInfo }> => {
    const response = await api.get('/admin/auth/profile');
    return response.data;
  },

  // 修改密码
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.put('/admin/auth/password', { oldPassword, newPassword });
  },

  // 退出登录
  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
  },
};
