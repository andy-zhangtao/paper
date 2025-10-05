import api from './api';

export interface CreditSettingsResponse {
  token_to_credit_ratio: number;
}

export const creditSettingsService = {
  fetch: async (): Promise<CreditSettingsResponse> => {
    const response = await api.get('/admin/credits/settings');
    return response.data;
  },
  update: async (ratio: number): Promise<CreditSettingsResponse> => {
    const response = await api.put('/admin/credits/settings', {
      token_to_credit_ratio: ratio,
    });
    return response.data;
  },
};
