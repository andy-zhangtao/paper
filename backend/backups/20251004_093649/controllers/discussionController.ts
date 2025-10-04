import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { deductCredits } from './creditsController';
import * as aiService from '../services/aiService';
import { AI_CREDITS_COST } from '../config/constants';

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
    const [papers] = await pool.query(
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

    // 扣除积分
    const newBalance = await deductCredits(userId, AI_CREDITS_COST.discussion, 'AI讨论');

    if (newBalance === null) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: '积分不足，请充值',
          details: {
            required: AI_CREDITS_COST.discussion,
          },
        },
      });
    }

    // 调用AI生成回答
    const prompt = context_text
      ? `用户选中了以下段落：\n${context_text}\n\n用户问题：${question}\n\n请作为论文写作助手，给出专业的建议和回答。`
      : `用户问题：${question}\n\n请作为论文写作助手，给出专业的建议和回答。`;

    const aiReply = await aiService.generateDiscussionReply(prompt);

    // 保存讨论记录
    const discussionId = uuidv4();
    const now = new Date();

    await pool.query(
      `INSERT INTO discussions (id, paper_id, user_id, question, context_text, ai_reply, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [discussionId, paperId, userId, question, context_text || null, aiReply, now]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: discussionId,
        question,
        ai_reply: aiReply,
        credits_cost: AI_CREDITS_COST.discussion,
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
    const [papers] = await pool.query(
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
    const [discussions] = await pool.query(
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
