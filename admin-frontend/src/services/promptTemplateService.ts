import api from './api';

export interface PromptStage {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  order_index: number | null;
  created_at: string;
  updated_at: string;
  template_count?: number;
}

export interface PromptTemplate {
  id: string;
  stage_id: string;
  language_code: string;
  title: string;
  content: string;
  variables: Record<string, unknown>;
  is_active: boolean;
  scope: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PromptStagePayload {
  code: string;
  displayName: string;
  description?: string | null;
  orderIndex?: number | null;
}

export interface PromptTemplatePayload {
  stageId: string;
  languageCode?: string;
  title: string;
  content: string;
  variables?: Record<string, unknown>;
  isActive?: boolean;
}

export const promptTemplateService = {
  async getStages(): Promise<{ stages: PromptStage[] }> {
    const response = await api.get('/admin/prompts/stages');
    return response.data;
  },

  async createStage(payload: PromptStagePayload): Promise<PromptStage> {
    const response = await api.post('/admin/prompts/stages', payload);
    return response.data;
  },

  async updateStage(stageId: string, payload: Partial<PromptStagePayload>): Promise<PromptStage> {
    const response = await api.put(`/admin/prompts/stages/${stageId}`, payload);
    return response.data;
  },

  async deleteStage(stageId: string): Promise<void> {
    await api.delete(`/admin/prompts/stages/${stageId}`);
  },

  async getTemplates(stageId: string): Promise<{ templates: PromptTemplate[] }> {
    const response = await api.get(`/admin/prompts/stages/${stageId}/templates`);
    return response.data;
  },

  async createTemplate(payload: PromptTemplatePayload): Promise<PromptTemplate> {
    const response = await api.post('/admin/prompts/templates', payload);
    return response.data;
  },

  async updateTemplate(templateId: string, payload: Partial<PromptTemplatePayload> & { content?: string; title?: string }): Promise<PromptTemplate> {
    const response = await api.put(`/admin/prompts/templates/${templateId}`, payload);
    return response.data;
  },

  async deleteTemplate(templateId: string): Promise<void> {
    await api.delete(`/admin/prompts/templates/${templateId}`);
  },
};
