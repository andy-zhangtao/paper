import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  promptTemplateService,
  type PromptStage,
  type PromptTemplate,
} from '../services/promptTemplateService';

interface StageFormState {
  code: string;
  displayName: string;
  description: string;
  orderIndex: string;
}

interface TemplateFormState {
  stageId: string;
  title: string;
  languageCode: string;
  content: string;
  variables: string;
  isActive: boolean;
}

const initialStageForm: StageFormState = {
  code: '',
  displayName: '',
  description: '',
  orderIndex: '',
};

const createInitialTemplateForm = (stageId: string): TemplateFormState => ({
  stageId,
  title: '',
  languageCode: 'zh-CN',
  content: '',
  variables: '',
  isActive: true,
});

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function PromptTemplatesPage() {
  const [stages, setStages] = useState<PromptStage[]>([]);
  const [loadingStages, setLoadingStages] = useState<boolean>(true);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const selectedStageIdRef = useRef<string | null>(null);

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  const [showStageModal, setShowStageModal] = useState<boolean>(false);
  const [editingStage, setEditingStage] = useState<PromptStage | null>(null);
  const [stageForm, setStageForm] = useState<StageFormState>(initialStageForm);
  const [stageSubmitting, setStageSubmitting] = useState<boolean>(false);

  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(createInitialTemplateForm(''));
  const [templateSubmitting, setTemplateSubmitting] = useState<boolean>(false);

  const loadTemplates = useCallback(async (stageId: string) => {
    setLoadingTemplates(true);
    try {
      const data = await promptTemplateService.getTemplates(stageId);
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('加载提示词模版失败:', error);
      alert('加载提示词模版失败');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    selectedStageIdRef.current = selectedStageId;
  }, [selectedStageId]);

  const loadStages = useCallback(async (preferredStageId?: string) => {
    setLoadingStages(true);
    try {
      const data = await promptTemplateService.getStages();
      const stageList = data.stages || [];
      setStages(stageList);

      if (stageList.length === 0) {
        setSelectedStageId(null);
        setTemplates([]);
        return stageList;
      }

      const existingIds = new Set(stageList.map((stage) => stage.id));
      const currentSelectedId = selectedStageIdRef.current;
      let nextSelected: string;

      if (preferredStageId && existingIds.has(preferredStageId)) {
        nextSelected = preferredStageId;
      } else if (currentSelectedId && existingIds.has(currentSelectedId)) {
        nextSelected = currentSelectedId;
      } else {
        nextSelected = stageList[0].id;
      }

      if (nextSelected !== currentSelectedId) {
        setSelectedStageId(nextSelected);
      }

      return stageList;
    } catch (error) {
      console.error('加载提示词阶段失败:', error);
      alert('加载提示词阶段失败');
      return [];
    } finally {
      setLoadingStages(false);
    }
  }, []);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  useEffect(() => {
    if (selectedStageId) {
      loadTemplates(selectedStageId);
    }
  }, [selectedStageId, loadTemplates]);

  const selectedStage = useMemo(
    () => stages.find((stage) => stage.id === selectedStageId) || null,
    [stages, selectedStageId]
  );

  const openCreateStageModal = () => {
    setEditingStage(null);
    setStageForm(initialStageForm);
    setShowStageModal(true);
  };

  const openEditStageModal = (stage: PromptStage) => {
    setEditingStage(stage);
    setStageForm({
      code: stage.code,
      displayName: stage.display_name,
      description: stage.description || '',
      orderIndex:
        stage.order_index === null || stage.order_index === undefined
          ? ''
          : String(stage.order_index),
    });
    setShowStageModal(true);
  };

  const handleStageSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stageForm.code.trim() || !stageForm.displayName.trim()) {
      alert('请填写阶段编码和名称');
      return;
    }

    const orderIndexRaw = stageForm.orderIndex.trim();
    let orderIndexValue: number | null | undefined = null;
    if (orderIndexRaw !== '') {
      const parsed = Number.parseInt(orderIndexRaw, 10);
      if (Number.isNaN(parsed)) {
        alert('阶段排序必须为数字');
        return;
      }
      orderIndexValue = parsed;
    }

    const payload = {
      code: stageForm.code.trim(),
      displayName: stageForm.displayName.trim(),
      description: stageForm.description.trim() || null,
      orderIndex: orderIndexValue,
    };

    setStageSubmitting(true);
    try {
      if (editingStage) {
        const updated = await promptTemplateService.updateStage(editingStage.id, payload);
        await loadStages(updated.id);
        setSelectedStageId(updated.id);
      } else {
        const created = await promptTemplateService.createStage(payload);
        await loadStages(created.id);
        setSelectedStageId(created.id);
      }
      setShowStageModal(false);
      setEditingStage(null);
      setStageForm(initialStageForm);
    } catch (error: any) {
      if (error?.response?.status === 409) {
        alert('阶段编码已存在，请使用其他编码');
      } else {
        console.error('保存阶段失败:', error);
        alert('保存阶段失败');
      }
    } finally {
      setStageSubmitting(false);
    }
  };

  const handleDeleteStage = async (stage: PromptStage) => {
    const confirmDelete = confirm(
      `确认删除阶段「${stage.display_name}」？该操作也会删除该阶段下的所有提示词模版。`
    );
    if (!confirmDelete) {
      return;
    }

    try {
      await promptTemplateService.deleteStage(stage.id);
      await loadStages();
    } catch (error) {
      console.error('删除阶段失败:', error);
      alert('删除阶段失败');
    }
  };

  const openCreateTemplateModal = () => {
    if (!selectedStageId) {
      alert('请先选择一个阶段');
      return;
    }
    setEditingTemplate(null);
    setTemplateForm(createInitialTemplateForm(selectedStageId));
    setShowTemplateModal(true);
  };

  const openEditTemplateModal = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      stageId: template.stage_id,
      title: template.title,
      languageCode: template.language_code,
      content: template.content,
      variables: JSON.stringify(template.variables || {}, null, 2),
      isActive: template.is_active,
    });
    setShowTemplateModal(true);
  };

  const parseVariables = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('变量需为对象');
      }
      return parsed as Record<string, unknown>;
    } catch (error) {
      console.error('变量解析失败:', error);
      throw new Error('变量字段需要是有效的 JSON 对象');
    }
  };

  const handleTemplateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetStageId = templateForm.stageId || selectedStageId;

    if (!targetStageId) {
      alert('请选择所属阶段');
      return;
    }

    if (!templateForm.title.trim() || !templateForm.content.trim()) {
      alert('请填写提示词标题和内容');
      return;
    }

    let variablesPayload: Record<string, unknown> | undefined;
    try {
      variablesPayload = parseVariables(templateForm.variables);
    } catch (error: any) {
      alert(error.message || '变量字段需要是有效的 JSON 对象');
      return;
    }

    const payload = {
      stageId: targetStageId,
      title: templateForm.title.trim(),
      content: templateForm.content,
      languageCode: templateForm.languageCode.trim() || 'zh-CN',
      variables: variablesPayload,
      isActive: templateForm.isActive,
    };

    setTemplateSubmitting(true);
    try {
      if (editingTemplate) {
        const updated = await promptTemplateService.updateTemplate(editingTemplate.id, payload);
        setSelectedStageId(updated.stage_id);
        await loadTemplates(updated.stage_id);
        await loadStages(updated.stage_id);
      } else {
        const created = await promptTemplateService.createTemplate(payload);
        setSelectedStageId(created.stage_id);
        await loadTemplates(created.stage_id);
        await loadStages(created.stage_id);
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateForm(createInitialTemplateForm(targetStageId));
    } catch (error) {
      console.error('保存提示词模版失败:', error);
      alert('保存提示词模版失败');
    } finally {
      setTemplateSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (template: PromptTemplate) => {
    const confirmDelete = confirm(`确认删除提示词「${template.title}」？`);
    if (!confirmDelete) {
      return;
    }

    try {
      await promptTemplateService.deleteTemplate(template.id);
      if (selectedStageId) {
        await loadTemplates(selectedStageId);
        await loadStages(selectedStageId);
      } else {
        await loadStages();
      }
    } catch (error) {
      console.error('删除提示词模版失败:', error);
      alert('删除提示词模版失败');
    }
  };

  const closeStageModal = () => {
    setShowStageModal(false);
    setEditingStage(null);
    setStageForm(initialStageForm);
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    setEditingTemplate(null);
    setTemplateForm(selectedStageId ? createInitialTemplateForm(selectedStageId) : createInitialTemplateForm(''));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">提示词模版管理</h2>
        <button
          onClick={openCreateStageModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增阶段
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">阶段列表</h3>
          </div>

          {loadingStages ? (
            <div className="py-10 text-center text-gray-500">加载阶段中...</div>
          ) : stages.length === 0 ? (
            <div className="py-10 text-center text-gray-500">暂无阶段，请先创建阶段</div>
          ) : (
            <ul className="space-y-2">
              {stages.map((stage) => (
                <li key={stage.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                      selectedStageId === stage.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-400 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{stage.display_name}</span>
                      <span className="text-sm text-gray-500">
                        {(stage.template_count ?? 0)} 个模版
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">编码: {stage.code}</div>
                    {stage.description ? (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {stage.description}
                      </div>
                    ) : null}
                  </button>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => openEditStageModal(stage)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStage(stage)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {selectedStage ? (
            <>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedStage.display_name}
                  </h3>
                  <div className="text-sm text-gray-500 mt-1">
                    编码：{selectedStage.code}
                    {selectedStage.order_index !== null && selectedStage.order_index !== undefined
                      ? ` · 排序：${selectedStage.order_index}`
                      : ''}
                  </div>
                  {selectedStage.description ? (
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                      {selectedStage.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditStageModal(selectedStage)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400"
                  >
                    编辑阶段
                  </button>
                  <button
                    onClick={() => handleDeleteStage(selectedStage)}
                    className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
                  >
                    删除阶段
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  提示词模版（{templates.length}）
                </h4>
                <button
                  onClick={openCreateTemplateModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  新增模版
                </button>
              </div>

              {loadingTemplates ? (
                <div className="py-10 text-center text-gray-500">加载提示词模版中...</div>
              ) : templates.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  该阶段暂时没有提示词模版，点击右上角按钮新建一个吧。
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          标题
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          语言
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          变量数
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          状态
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          版本
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          更新时间
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {templates.map((template) => {
                        const variableCount = template.variables
                          ? Object.keys(template.variables).length
                          : 0;
                        return (
                          <tr key={template.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="font-medium text-gray-900">{template.title}</div>
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {template.content}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{template.language_code}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{variableCount}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  template.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {template.is_active ? '启用' : '停用'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">v{template.version}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatDateTime(template.updated_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <div className="inline-flex gap-3">
                                <button
                                  onClick={() => openEditTemplateModal(template)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => handleDeleteTemplate(template)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  删除
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-gray-500">
              暂无阶段数据，请先创建提示词阶段。
            </div>
          )}
        </div>
      </div>

      {showStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingStage ? '编辑阶段' : '新增阶段'}
            </h3>
            <form onSubmit={handleStageSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">阶段编码</label>
                <input
                  type="text"
                  value={stageForm.code}
                  onChange={(event) => setStageForm((prev) => ({ ...prev, code: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
                  placeholder="如: outline"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">阶段名称</label>
                <input
                  type="text"
                  value={stageForm.displayName}
                  onChange={(event) => setStageForm((prev) => ({ ...prev, displayName: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
                  placeholder="如: 内容大纲"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">阶段描述</label>
                <textarea
                  value={stageForm.description}
                  onChange={(event) => setStageForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
                  rows={3}
                  placeholder="用于说明该阶段的定位和作用"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序（可选）</label>
                <input
                  type="number"
                  value={stageForm.orderIndex}
                  onChange={(event) => setStageForm((prev) => ({ ...prev, orderIndex: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
                  placeholder="影响阶段显示顺序，数字越小越靠前"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeStageModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
                  disabled={stageSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                  disabled={stageSubmitting}
                >
                  {stageSubmitting ? '保存中...' : '保存阶段'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4 overflow-y-auto py-10">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTemplate ? '编辑提示词模版' : '新增提示词模版'}
            </h3>
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属阶段</label>
                <select
                  value={templateForm.stageId}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, stageId: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
                  required
                >
                  <option value="" disabled>
                    请选择阶段
                  </option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">模版标题</label>
                  <input
                    type="text"
                    value={templateForm.title}
                    onChange={(event) => setTemplateForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
                    placeholder="如: 论文大纲生成中文模版"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">语言代码</label>
                  <input
                    type="text"
                    value={templateForm.languageCode}
                    onChange={(event) => setTemplateForm((prev) => ({ ...prev, languageCode: event.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
                    placeholder="如: zh-CN"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提示词内容</label>
                <textarea
                  value={templateForm.content}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, content: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200 font-mono text-sm"
                  rows={8}
                  placeholder="填写完整的提示词文本，可包含变量占位符"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  变量定义（JSON 对象，可选）
                </label>
                <textarea
                  value={templateForm.variables}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, variables: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-200 font-mono text-sm"
                  rows={5}
                  placeholder='例如：{"topic": "论文主题", "requirements": "要求说明"}'
                />
              </div>
              <div className="flex items-center">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={templateForm.isActive}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  启用该提示词模版
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTemplateModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100"
                  disabled={templateSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                  disabled={templateSubmitting}
                >
                  {templateSubmitting ? '保存中...' : '保存模版'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
