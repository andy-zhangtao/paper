import { Response } from 'express'
import pool from '../config/database'
import { query } from '../utils/pgQuery'
import { AuthRequest } from '../middleware/auth'
import {
  PAPER_CREATION_STAGES,
  isValidPaperCreationStage,
  PaperCreationStageCode,
} from '../config/paperCreation'
import * as aiService from '../services/aiService'

interface PromptTemplateRow {
  id: string
  scope: 'system' | 'user'
  title: string
  content: string
  owner_user_id: string | null
  created_at: string
}

interface PromptStageRow {
  id: string
  code: string
  display_name: string
  description: string | null
}

interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export const listStagePrompts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权',
        },
      })
    }

    const { stage } = req.query
    let stageCodes: PaperCreationStageCode[] = PAPER_CREATION_STAGES.map((s) => s.code)

    if (typeof stage === 'string') {
      if (!isValidPaperCreationStage(stage)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STAGE',
            message: '提示词阶段无效',
          },
        })
      }
      stageCodes = [stage]
    }

    const stageResults = [] as Array<{
      code: PaperCreationStageCode
      displayName: string
      description: string | null
      prompts: Array<{
        id: string
        title: string
        scope: 'system' | 'user'
        content?: string
      }>
    }>

    for (const code of stageCodes) {
      const stageConfig = PAPER_CREATION_STAGES.find((s) => s.code === code)

      const [stageRows] = await query<PromptStageRow>(
        pool,
        'SELECT id, code, display_name, description FROM prompt_stages WHERE code = ?',
        [code]
      )

      if (!stageRows.length) {
        // 阶段可能还未在数据库中初始化，跳过但保留空结构
        stageResults.push({
          code,
          displayName: stageConfig?.displayName || code,
          description: stageConfig?.description ?? null,
          prompts: [],
        })
        continue
      }

      const stageRow = stageRows[0]

      const [promptRows] = await query<PromptTemplateRow>(
        pool,
        `SELECT id, scope, title, content, owner_user_id, created_at
         FROM prompt_templates
         WHERE stage_id = ?
           AND is_active = TRUE
           AND (
             scope = 'system'
             OR (scope = 'user' AND owner_user_id = ?)
           )
         ORDER BY scope ASC, created_at DESC`,
        [stageRow.id, userId]
      )

      const prompts = promptRows.map((row) => ({
        id: row.id,
        title: row.title,
        scope: row.scope,
        ...(row.scope === 'user' ? { content: row.content } : {}),
      }))

      stageResults.push({
        code: code,
        displayName: stageRow.display_name || stageConfig?.displayName || code,
        description: stageRow.description ?? stageConfig?.description ?? null,
        prompts,
      })
    }

    return res.json({
      success: true,
      data: {
        stages: stageResults,
      },
    })
  } catch (error) {
    console.error('获取论文创建提示词失败:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取提示词失败',
      },
    })
  }
}

export const chatWithPrompt = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权',
        },
      })
    }

    const { stage, promptId, message, history } = req.body as {
      stage?: string
      promptId?: string
      message?: string
      history?: ChatHistoryItem[]
    }

    if (!stage || !isValidPaperCreationStage(stage)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STAGE',
          message: '提示词阶段无效',
        },
      })
    }

    if (!promptId || typeof promptId !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PROMPT',
          message: '提示词ID无效',
        },
      })
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: '消息内容不能为空',
        },
      })
    }

    const [promptRows] = await query<PromptTemplateRow & { prompt_stage_code: string }>(
      pool,
      `SELECT pt.id, pt.scope, pt.title, pt.content, pt.owner_user_id, pt.created_at, ps.code as prompt_stage_code
       FROM prompt_templates pt
       JOIN prompt_stages ps ON pt.stage_id = ps.id
       WHERE pt.id = ?
         AND ps.code = ?
         AND pt.is_active = TRUE
         AND (
           pt.scope = 'system'
           OR (pt.scope = 'user' AND pt.owner_user_id = ?)
         )
       LIMIT 1`,
      [promptId, stage, userId]
    )

    if (!promptRows.length) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROMPT_NOT_FOUND',
          message: '提示词不存在或无权访问',
        },
      })
    }

    const prompt = promptRows[0]

    const safeHistory: ChatHistoryItem[] = Array.isArray(history)
      ? history
          .filter((item): item is ChatHistoryItem => {
            return !!item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'assistant')
          })
          .map((item) => ({
            role: item.role,
            content: item.content,
          }))
      : []

    const messages = [
      { role: 'system' as const, content: prompt.content },
      ...safeHistory.map((item) => ({
        role: item.role,
        content: item.content,
      })),
      { role: 'user' as const, content: message.trim() },
    ]

    const aiResponse = await aiService.chatCompletion(messages)

    return res.json({
      success: true,
      data: {
        reply: aiResponse,
      },
    })
  } catch (error) {
    console.error('论文创建对话失败:', error)
    return res.status(503).json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI服务暂时不可用',
      },
    })
  }
}
