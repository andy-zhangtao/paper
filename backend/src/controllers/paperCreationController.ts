import { Response } from 'express'
import pool from '../config/database'
import {
  isValidPaperCreationStage,
  PAPER_CREATION_STAGES,
  PaperCreationStageCode,
} from '../config/paperCreation'
import { AuthRequest } from '../middleware/auth'
import * as aiService from '../services/aiService'
import { query } from '../utils/pgQuery'
import {
  deductCreditsByTokens,
  getUserCreditStatus,
  TokenDeductionResult,
} from './creditsController'

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

class HttpError extends Error {
  status: number
  body: any

  constructor(status: number, body: any) {
    super(typeof body === 'object' ? body?.error?.message ?? '请求错误' : String(body))
    this.status = status
    this.body = body
  }
}

function handleDeductionFailure(res: Response, deduction: TokenDeductionResult) {
  if (deduction.ok) {
    return
  }

  if (deduction.reason === 'NOT_FOUND') {
    throw new HttpError(404, {
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      },
    })
  }

  const isExpired = deduction.reason === 'EXPIRED'

  throw new HttpError(402, {
    success: false,
    error: {
      code: isExpired ? 'CREDITS_EXPIRED' : 'INSUFFICIENT_CREDITS',
      message: isExpired ? '积分已过期，请联系管理员续期' : '积分不足，请充值',
      details: {
        required: deduction.cost,
        ratio: deduction.ratio,
      },
    },
  })
}

async function ensureCreditsActive(userId: string): Promise<void> {
  const status = await getUserCreditStatus(userId)

  if (!status) {
    throw new HttpError(404, {
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      },
    })
  }

  if (status.isExpired) {
    throw new HttpError(402, {
      success: false,
      error: {
        code: 'CREDITS_EXPIRED',
        message: '积分已过期，请联系管理员续期',
        details: {
          balance: status.credits,
        },
      },
    })
  }

  if (status.credits <= 0) {
    throw new HttpError(402, {
      success: false,
      error: {
        code: 'INSUFFICIENT_CREDITS',
        message: '积分不足，请充值',
        details: {
          balance: status.credits,
        },
      },
    })
  }
}

interface PreparedChatContext {
  stage: PaperCreationStageCode
  messages: aiService.ChatMessage[]
  stateSnapshot?: aiService.PaperCreationState
}

async function prepareChatContext(req: AuthRequest): Promise<PreparedChatContext> {
  const userId = req.userId
  if (!userId) {
    throw new HttpError(401, {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '未授权',
      },
    })
  }

  const { stage, promptId, message, history, stateSnapshot } = req.body as {
    stage?: string
    promptId?: string
    message?: string
    history?: ChatHistoryItem[]
    stateSnapshot?: aiService.PaperCreationState
  }

  if (!stage || !isValidPaperCreationStage(stage)) {
    throw new HttpError(400, {
      success: false,
      error: {
        code: 'INVALID_STAGE',
        message: '提示词阶段无效',
      },
    })
  }

  if (!promptId || typeof promptId !== 'string') {
    throw new HttpError(400, {
      success: false,
      error: {
        code: 'INVALID_PROMPT',
        message: '提示词ID无效',
      },
    })
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new HttpError(400, {
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
    throw new HttpError(404, {
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

  const messages: aiService.ChatMessage[] = [
    { role: 'system', content: prompt.content },
    ...safeHistory.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    { role: 'user', content: message.trim() },
  ]

  const snapshot =
    stateSnapshot && typeof stateSnapshot === 'object'
      ? (stateSnapshot as aiService.PaperCreationState)
      : undefined

  return {
    stage: stage as PaperCreationStageCode,
    messages,
    stateSnapshot: snapshot,
  }
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
    const userId = req.userId!
    const context = await prepareChatContext(req)
    
    // 检查积分状态
    await ensureCreditsActive(userId)
    
    // 调用 AI 服务
    const aiResponse = await aiService.chatCompletion(context.messages, undefined, context.stateSnapshot)
    
    // 扣除积分
    const deduction = await deductCreditsByTokens(
      userId,
      {
        totalTokens: aiResponse.usage.totalTokens,
        promptTokens: aiResponse.usage.promptTokens,
        completionTokens: aiResponse.usage.completionTokens,
        serviceType: 'paper_creation',
        model: aiResponse.model,
      },
      '论文创建对话'
    )
    
    if (!deduction.ok) {
      handleDeductionFailure(res, deduction)
      return
    }

    return res.json({
      success: true,
      data: {
        reply: aiResponse.reply,
        state: aiResponse.state,
        credits_cost: deduction.cost,
        credits_remaining: deduction.remaining,
        token_usage: aiResponse.usage,
        token_to_credit_ratio: deduction.ratio,
      },
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json(error.body)
    }
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

export const chatWithPromptStream = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const context = await prepareChatContext(req)
    
    // 检查积分状态
    await ensureCreditsActive(userId)

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    if (typeof (res as any).flushHeaders === 'function') {
      ;(res as any).flushHeaders()
    } else {
      res.write('\n')
    }

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const abortController = new AbortController()
    const abortSignal = abortController.signal

    req.on('close', () => {
      abortController.abort()
    })

    let endSent = false
    let aiResult: aiService.PaperCreationChatResult | null = null

    try {
      aiResult = await aiService.chatCompletionStream(
        context.messages,
        undefined,
        context.stateSnapshot,
        {
          onChunk: (chunk) => {
            if (chunk) {
              sendEvent('delta', { content: chunk })
            }
          },
          onComplete: (result) => {
            sendEvent('complete', result)
          },
        },
        abortSignal,
        false,
      )
      
      // 扣除积分
      const deduction = await deductCreditsByTokens(
        userId,
        {
          totalTokens: aiResult.usage.totalTokens,
          promptTokens: aiResult.usage.promptTokens,
          completionTokens: aiResult.usage.completionTokens,
          serviceType: 'paper_creation',
          model: aiResult.model,
        },
        '论文创建对话（流式）'
      )
      
      if (!deduction.ok) {
        sendEvent('error', {
          code: deduction.reason === 'EXPIRED' ? 'CREDITS_EXPIRED' : 'INSUFFICIENT_CREDITS',
          message: deduction.reason === 'EXPIRED' ? '积分已过期' : '积分不足',
          required: deduction.cost,
        })
      } else {
        sendEvent('credits', {
          cost: deduction.cost,
          remaining: deduction.remaining,
          ratio: deduction.ratio,
          usage: aiResult.usage,
        })
      }
      
      sendEvent('end', {})
      endSent = true
    } catch (error: any) {
      if (abortSignal.aborted || error?.message === '请求已被取消') {
        // 客户端断开连接，无需返回错误
      } else {
        console.error('论文创建流式对话失败:', error)
        sendEvent('error', {
          message: 'AI服务暂时不可用',
        })
      }
    } finally {
      if (!endSent) {
        sendEvent('end', {})
      }
      res.end()
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json(error.body)
    }
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
