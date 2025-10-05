import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { query } from '../utils/pgQuery';
import { AuthRequest } from '../middleware/auth';
import {
  TokenDeductionResult,
  deductCreditsByTokens,
  getUserCreditStatus,
} from './creditsController';
import * as aiService from '../services/aiService';

function handleDeductionFailure(res: Response, deduction: TokenDeductionResult) {
  if (deduction.ok) {
    return;
  }

  if (deduction.reason === 'NOT_FOUND') {
    res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      },
    });
    return;
  }

  const isExpired = deduction.reason === 'EXPIRED';

  res.status(402).json({
    success: false,
    error: {
      code: isExpired ? 'CREDITS_EXPIRED' : 'INSUFFICIENT_CREDITS',
      message: isExpired ? '积分已过期，请联系管理员续期' : '积分不足，请充值',
      details: {
        required: deduction.cost,
        ratio: deduction.ratio,
      },
    },
  });
}

async function ensureCreditsActive(userId: string, res: Response) {
  const status = await getUserCreditStatus(userId);

  if (!status) {
    res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      },
    });
    return null;
  }

  if (status.isExpired) {
    res.status(402).json({
      success: false,
      error: {
        code: 'CREDITS_EXPIRED',
        message: '积分已过期，请联系管理员续期',
        details: {
          balance: status.credits,
        },
      },
    });
    return null;
  }

  if (status.credits <= 0) {
    res.status(402).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_CREDITS',
        message: '积分不足，请充值',
        details: {
          balance: status.credits,
        },
      },
    });
    return null;
  }

  return status;
}

/**
 * 提问(AI自动回答)
 */
export const createDiscussion = async (req: AuthRequest, res: Response) => {
  try {
    const { paperId } = req.params;
    const { question, context_text } = req.body;
    const userId = req.userId!;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '问题不能为空',
        },
      });
    }

    // 检查论文是否属于当前用户
    const [papers] = await query(pool, 
      'SELECT id FROM papers WHERE id = ? AND user_id = ?',
      [paperId, userId]
    );

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '论文不存在',
        },
      });
    }

    if (!(await ensureCreditsActive(userId, res))) {
      return;
    }

    // 调用AI生成回答
    const prompt = context_text
      ? `用户选中了以下段落：\n${context_text}\n\n用户问题：${question}\n\n请作为论文写作助手，给出专业的建议和回答。`
      : `用户问题：${question}\n\n请作为论文写作助手，给出专业的建议和回答。`;

    const aiReply = await aiService.generateDiscussionReply(prompt);

    const deduction = await deductCreditsByTokens(
      userId,
      {
        totalTokens: aiReply.usage.totalTokens,
        promptTokens: aiReply.usage.promptTokens,
        completionTokens: aiReply.usage.completionTokens,
        serviceType: 'discussion',
        model: aiReply.model,
        paperId,
      },
      'AI讨论'
    );

    if (!deduction.ok) {
      handleDeductionFailure(res, deduction);
      return;
    }

    // 保存讨论记录
    const discussionId = uuidv4();
    const now = new Date();

    await query(pool, 
      `INSERT INTO discussions (id, paper_id, user_id, question, context_text, ai_reply, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [discussionId, paperId, userId, question, context_text || null, aiReply.reply, now]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: discussionId,
        question,
        ai_reply: aiReply.reply,
        credits_cost: deduction.cost,
        credits_remaining: deduction.remaining,
        token_usage: aiReply.usage,
        token_to_credit_ratio: deduction.ratio,
        created_at: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('创建讨论错误:', error);

    if (error.message === 'AI服务调用失败') {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: 'AI服务暂时不可用',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  }
};

/**
 * 获取讨论列表
 */
export const getDiscussions = async (req: AuthRequest, res: Response) => {
  try {
    const { paperId } = req.params;
    const userId = req.userId!;

    // 检查论文是否属于当前用户
    const [papers] = await query(pool, 
      'SELECT id FROM papers WHERE id = ? AND user_id = ?',
      [paperId, userId]
    );

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '论文不存在',
        },
      });
    }

    // 查询讨论列表
    const [discussions] = await query(pool, 
      `SELECT id, question, ai_reply, created_at
       FROM discussions
       WHERE paper_id = ?
       ORDER BY created_at DESC`,
      [paperId]
    );

    return res.status(200).json({
      success: true,
      data: discussions,
    });
  } catch (error) {
    console.error('获取讨论列表错误:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  }
};
