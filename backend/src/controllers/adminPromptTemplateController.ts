import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { query } from '../utils/pgQuery';
import { AdminRequest } from '../middleware/adminAuth';
import { logAdminOperation } from './adminAuthController';

interface PromptStage {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  order_index: number | null;
  created_at: string;
  updated_at: string;
  template_count?: number;
}

interface PromptTemplate {
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

const ORDER_FALLBACK = 32767;

function adaptStageRow(stage: any): PromptStage {
  return {
    ...stage,
    id: stage.id?.toString?.() ?? String(stage.id),
    order_index:
      stage.order_index === null || stage.order_index === undefined
        ? null
        : typeof stage.order_index === 'number'
          ? stage.order_index
          : Number(stage.order_index),
    template_count: stage.template_count,
  };
}

function adaptTemplateRow(row: any): PromptTemplate {
  let variables: Record<string, unknown> = {};
  const rawVariables = row.variables;
  if (typeof rawVariables === 'string') {
    try {
      variables = rawVariables ? JSON.parse(rawVariables) : {};
    } catch (error) {
      console.warn('提示词变量解析失败, 使用空对象代替', { error, templateId: row.id });
      variables = {};
    }
  } else if (rawVariables && typeof rawVariables === 'object') {
    variables = rawVariables as Record<string, unknown>;
  }

  return {
    ...row,
    id: row.id,
    stage_id: row.stage_id?.toString?.() ?? String(row.stage_id),
    variables,
    is_active:
      typeof row.is_active === 'boolean'
        ? row.is_active
        : row.is_active === 'true' || row.is_active === true || row.is_active === 1,
    version:
      typeof row.version === 'number'
        ? row.version
        : Number(row.version) || 1,
  };
}

function parseStageId(value: string) {
  const id = Number.parseInt(value, 10);
  if (Number.isNaN(id)) {
    return null;
  }
  return id;
}

function normalizeVariables(input: unknown): Record<string, unknown> {
  if (input === undefined || input === null || input === '') {
    return {};
  }

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      throw new Error('INVALID_VARIABLES');
    } catch (error) {
      if ((error as Error).message === 'INVALID_VARIABLES') {
        throw error;
      }
      throw new Error('INVALID_VARIABLES');
    }
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  throw new Error('INVALID_VARIABLES');
}

export const getPromptStages = async (req: AdminRequest, res: Response) => {
  try {
    const [rows] = await query<PromptStage & { template_count: string | number }>(
      pool,
      `SELECT ps.*, (
        SELECT COUNT(*) FROM prompt_templates pt WHERE pt.stage_id = ps.id
      ) AS template_count
      FROM prompt_stages ps
      ORDER BY COALESCE(ps.order_index, ?), ps.created_at ASC`,
      [ORDER_FALLBACK]
    );

    const stages = rows.map((stage) => ({
      ...adaptStageRow(stage),
      template_count: Number(stage.template_count) || 0,
    }));

    res.json({ stages });
  } catch (error) {
    console.error('获取提示词阶段失败:', error);
    res.status(500).json({ error: '获取提示词阶段失败' });
  }
};

export const createPromptStage = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      return res.status(401).json({ error: '未授权' });
    }

    const { code, displayName, description, orderIndex } = req.body as {
      code?: string;
      displayName?: string;
      description?: string;
      orderIndex?: number | null;
    };

    if (!code || !displayName) {
      return res.status(400).json({ error: '阶段编码和名称不能为空' });
    }

    const [rows] = await query<PromptStage>(
      pool,
      `INSERT INTO prompt_stages (code, display_name, description, order_index)
       VALUES (?, ?, ?, ?)
       RETURNING *`,
      [
        code.trim(),
        displayName.trim(),
        description?.trim() || null,
        typeof orderIndex === 'number' ? orderIndex : null,
      ]
    );

    const stage = adaptStageRow(rows[0]);

    await logAdminOperation(
      adminId,
      'create_prompt_stage',
      'prompt_stage',
      stage.id?.toString(),
      { code: stage.code }
    );

    res.status(201).json(stage);
  } catch (error) {
    if ((error as any)?.code === '23505') {
      return res.status(409).json({ error: '阶段编码已存在' });
    }

    console.error('创建提示词阶段失败:', error);
    res.status(500).json({ error: '创建提示词阶段失败' });
  }
};

export const updatePromptStage = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      return res.status(401).json({ error: '未授权' });
    }

    const { stageId } = req.params;
    const stageNumericId = parseStageId(stageId);

    if (stageNumericId === null) {
      return res.status(400).json({ error: '无效的阶段ID' });
    }

    const { code, displayName, description, orderIndex } = req.body as {
      code?: string;
      displayName?: string;
      description?: string | null;
      orderIndex?: number | null;
    };

    const fields: string[] = [];
    const values: unknown[] = [];

    if (code !== undefined) {
      fields.push('code = ?');
      values.push(code.trim());
    }
    if (displayName !== undefined) {
      fields.push('display_name = ?');
      values.push(displayName.trim());
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description?.trim() || null);
    }
    if (orderIndex !== undefined) {
      fields.push('order_index = ?');
      values.push(typeof orderIndex === 'number' ? orderIndex : null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: '未提供更新内容' });
    }

    values.push(stageNumericId);

    const [rows] = await query<PromptStage>(
      pool,
      `UPDATE prompt_stages
       SET ${fields.join(', ')}
       WHERE id = ?
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '阶段不存在' });
    }

    const stage = adaptStageRow(rows[0]);

    await logAdminOperation(
      adminId,
      'update_prompt_stage',
      'prompt_stage',
      stage.id?.toString(),
      { code: stage.code }
    );

    res.json(stage);
  } catch (error) {
    if ((error as any)?.code === '23505') {
      return res.status(409).json({ error: '阶段编码已存在' });
    }

    console.error('更新提示词阶段失败:', error);
    res.status(500).json({ error: '更新提示词阶段失败' });
  }
};

export const deletePromptStage = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      return res.status(401).json({ error: '未授权' });
    }

    const { stageId } = req.params;
    const stageNumericId = parseStageId(stageId);

    if (stageNumericId === null) {
      return res.status(400).json({ error: '无效的阶段ID' });
    }

    const [stages] = await query<PromptStage>(
      pool,
      'SELECT * FROM prompt_stages WHERE id = ?',
      [stageNumericId]
    );

    if (stages.length === 0) {
      return res.status(404).json({ error: '阶段不存在' });
    }

    await query(
      pool,
      'DELETE FROM prompt_stages WHERE id = ?',
      [stageNumericId]
    );

    await logAdminOperation(
      adminId,
      'delete_prompt_stage',
      'prompt_stage',
      stages[0].id?.toString(),
      { code: stages[0].code }
    );

    res.status(204).send();
  } catch (error) {
    console.error('删除提示词阶段失败:', error);
    res.status(500).json({ error: '删除提示词阶段失败' });
  }
};

export const getTemplatesByStage = async (req: AdminRequest, res: Response) => {
  try {
    const { stageId } = req.params;
    const stageNumericId = parseStageId(stageId);

    if (stageNumericId === null) {
      return res.status(400).json({ error: '无效的阶段ID' });
    }

    const [stageRows] = await query<PromptStage>(
      pool,
      'SELECT * FROM prompt_stages WHERE id = ?',
      [stageNumericId]
    );

    if (stageRows.length === 0) {
      return res.status(404).json({ error: '阶段不存在' });
    }

    const [templates] = await query<PromptTemplate>(
      pool,
      `SELECT * FROM prompt_templates
       WHERE stage_id = ?
       ORDER BY created_at DESC`,
      [stageNumericId]
    );

    res.json({ templates: templates.map((tpl) => adaptTemplateRow(tpl)) });
  } catch (error) {
    console.error('获取阶段提示词失败:', error);
    res.status(500).json({ error: '获取阶段提示词失败' });
  }
};

export const createPromptTemplate = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      return res.status(401).json({ error: '未授权' });
    }

    const { stageId, languageCode, title, content, variables, isActive } = req.body as {
      stageId?: number | string;
      languageCode?: string;
      title?: string;
      content?: string;
      variables?: unknown;
      isActive?: boolean;
    };

    if (!stageId) {
      return res.status(400).json({ error: '阶段ID不能为空' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: '提示词标题和内容不能为空' });
    }

    const stageNumericId = parseStageId(String(stageId));

    if (stageNumericId === null) {
      return res.status(400).json({ error: '无效的阶段ID' });
    }

    const [stageRows] = await query<PromptStage>(
      pool,
      'SELECT * FROM prompt_stages WHERE id = ?',
      [stageNumericId]
    );

    if (stageRows.length === 0) {
      return res.status(404).json({ error: '阶段不存在' });
    }

    let normalizedVariables: Record<string, unknown>;
    try {
      normalizedVariables = normalizeVariables(variables);
    } catch (error) {
      return res.status(400).json({ error: '变量格式不正确，需为对象或JSON字符串' });
    }

    const [rows] = await query<PromptTemplate>(
      pool,
      `INSERT INTO prompt_templates
       (id, scope, stage_id, language_code, title, content, variables, is_active)
       VALUES (?, 'system', ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [
        uuidv4(),
        stageNumericId,
        (languageCode || 'zh-CN').trim(),
        title.trim(),
        content,
        JSON.stringify(normalizedVariables),
        isActive === false ? false : true,
      ]
    );

    const template = adaptTemplateRow(rows[0]);

    await logAdminOperation(
      adminId,
      'create_prompt_template',
      'prompt_template',
      template.id,
      { stageId: stageNumericId, title: template.title }
    );

    res.status(201).json(template);
  } catch (error) {
    console.error('创建提示词失败:', error);
    res.status(500).json({ error: '创建提示词失败' });
  }
};

export const updatePromptTemplate = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      return res.status(401).json({ error: '未授权' });
    }

    const { templateId } = req.params;
    const { languageCode, title, content, variables, isActive, stageId } = req.body as {
      languageCode?: string;
      title?: string;
      content?: string;
      variables?: unknown;
      isActive?: boolean;
      stageId?: number | string;
    };

    const [existingTemplates] = await query<PromptTemplate>(
      pool,
      'SELECT * FROM prompt_templates WHERE id = ?',
      [templateId]
    );

    if (existingTemplates.length === 0) {
      return res.status(404).json({ error: '提示词不存在' });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let shouldIncreaseVersion = false;

    if (stageId !== undefined) {
      const stageNumericId = parseStageId(String(stageId));
      if (stageNumericId === null) {
        return res.status(400).json({ error: '无效的阶段ID' });
      }

      const [stageRows] = await query<PromptStage>(
        pool,
        'SELECT id FROM prompt_stages WHERE id = ?',
        [stageNumericId]
      );

      if (stageRows.length === 0) {
        return res.status(404).json({ error: '目标阶段不存在' });
      }

      fields.push('stage_id = ?');
      values.push(stageNumericId);
    }

    if (languageCode !== undefined) {
      fields.push('language_code = ?');
      values.push(languageCode.trim());
    }

    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title.trim());
      shouldIncreaseVersion = true;
    }

    if (content !== undefined) {
      fields.push('content = ?');
      values.push(content);
      shouldIncreaseVersion = true;
    }

    if (variables !== undefined) {
      let normalizedVariables: Record<string, unknown>;
      try {
        normalizedVariables = normalizeVariables(variables);
      } catch (error) {
        return res.status(400).json({ error: '变量格式不正确，需为对象或JSON字符串' });
      }
      fields.push('variables = ?');
      values.push(JSON.stringify(normalizedVariables));
      shouldIncreaseVersion = true;
    }

    if (isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(Boolean(isActive));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: '未提供更新内容' });
    }

    if (shouldIncreaseVersion) {
      fields.push('version = version + 1');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    values.push(templateId);

    const [rows] = await query<PromptTemplate>(
      pool,
      `UPDATE prompt_templates
       SET ${fields.join(', ')}
       WHERE id = ?
       RETURNING *`,
      values
    );

    const template = adaptTemplateRow(rows[0]);

    await logAdminOperation(
      adminId,
      'update_prompt_template',
      'prompt_template',
      template.id,
      { stageId: template.stage_id, title: template.title }
    );

    res.json(template);
  } catch (error) {
    console.error('更新提示词失败:', error);
    res.status(500).json({ error: '更新提示词失败' });
  }
};

export const deletePromptTemplate = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      return res.status(401).json({ error: '未授权' });
    }

    const { templateId } = req.params;

    const [templates] = await query<PromptTemplate>(
      pool,
      'SELECT * FROM prompt_templates WHERE id = ?',
      [templateId]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: '提示词不存在' });
    }

    await query(pool, 'DELETE FROM prompt_templates WHERE id = ?', [templateId]);

    await logAdminOperation(
      adminId,
      'delete_prompt_template',
      'prompt_template',
      templateId,
      { stageId: templates[0].stage_id, title: templates[0].title }
    );

    res.status(204).send();
  } catch (error) {
    console.error('删除提示词失败:', error);
    res.status(500).json({ error: '删除提示词失败' });
  }
};
