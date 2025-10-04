import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as aiService from '../services/aiService';
import { deductCredits } from './creditsController';

/**
 * 段落润色
 */
export const polishText = async (req: AuthRequest, res: Response) => {
  try {
    const { text, type } = req.body;
    const userId = req.userId!;

    if (!text || !type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必要参数',
        },
      });
    }

    if (!['grammar', 'logic', 'style'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'type参数必须是 grammar、logic 或 style',
        },
      });
    }

    // 扣除积分
    const creditsCost = aiService.AI_CREDITS_COST.polish;
    const newBalance = await deductCredits(userId, creditsCost, '段落润色');

    if (newBalance === null) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: '积分不足，请充值',
          details: {
            required: creditsCost,
          },
        },
      });
    }

    // 调用AI服务
    const result = await aiService.polishText(text, type);

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        credits_cost: creditsCost,
        credits_remaining: newBalance,
      },
    });
  } catch (error: any) {
    console.error('段落润色错误:', error);
    return res.status(503).json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI服务暂时不可用',
      },
    });
  }
};

/**
 * 生成大纲
 */
export const generateOutline = async (req: AuthRequest, res: Response) => {
  try {
    const { topic, paper_type } = req.body;
    const userId = req.userId!;

    if (!topic || !paper_type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必要参数',
        },
      });
    }

    if (!['research', 'review', 'thesis'].includes(paper_type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'paper_type参数必须是 research、review 或 thesis',
        },
      });
    }

    // 扣除积分
    const creditsCost = aiService.AI_CREDITS_COST.outline;
    const newBalance = await deductCredits(userId, creditsCost, '生成大纲');

    if (newBalance === null) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: '积分不足，请充值',
          details: {
            required: creditsCost,
          },
        },
      });
    }

    // 调用AI服务
    const outline = await aiService.generateOutline(topic, paper_type);

    return res.status(200).json({
      success: true,
      data: {
        outline,
        credits_cost: creditsCost,
        credits_remaining: newBalance,
      },
    });
  } catch (error: any) {
    console.error('生成大纲错误:', error);
    return res.status(503).json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI服务暂时不可用',
      },
    });
  }
};

/**
 * 语法检查
 */
export const checkGrammar = async (req: AuthRequest, res: Response) => {
  try {
    const { text, level } = req.body;
    const userId = req.userId!;

    if (!text || !level) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必要参数',
        },
      });
    }

    if (!['basic', 'standard', 'strict'].includes(level)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'level参数必须是 basic、standard 或 strict',
        },
      });
    }

    // 扣除积分
    const creditsCost = aiService.AI_CREDITS_COST.grammar;
    const newBalance = await deductCredits(userId, creditsCost, '语法检查');

    if (newBalance === null) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: '积分不足，请充值',
          details: {
            required: creditsCost,
          },
        },
      });
    }

    // 调用AI服务
    const errors = await aiService.checkGrammar(text, level);

    return res.status(200).json({
      success: true,
      data: {
        errors,
        credits_cost: creditsCost,
        credits_remaining: newBalance,
      },
    });
  } catch (error: any) {
    console.error('语法检查错误:', error);
    return res.status(503).json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI服务暂时不可用',
      },
    });
  }
};

/**
 * 生成参考文献
 */
export const generateReferences = async (req: AuthRequest, res: Response) => {
  try {
    const { topic, count, format } = req.body;
    const userId = req.userId!;

    if (!topic || !count || !format) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必要参数',
        },
      });
    }

    if (!['gb7714', 'apa', 'mla'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'format参数必须是 gb7714、apa 或 mla',
        },
      });
    }

    // 扣除积分
    const creditsCost = aiService.AI_CREDITS_COST.references;
    const newBalance = await deductCredits(userId, creditsCost, '生成参考文献');

    if (newBalance === null) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: '积分不足，请充值',
          details: {
            required: creditsCost,
          },
        },
      });
    }

    // 调用AI服务
    const references = await aiService.generateReferences(topic, count, format);

    return res.status(200).json({
      success: true,
      data: {
        references,
        credits_cost: creditsCost,
        credits_remaining: newBalance,
      },
    });
  } catch (error: any) {
    console.error('生成参考文献错误:', error);
    return res.status(503).json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI服务暂时不可用',
      },
    });
  }
};

/**
 * 降重改写
 */
export const rewriteText = async (req: AuthRequest, res: Response) => {
  try {
    const { text, similarity_threshold } = req.body;
    const userId = req.userId!;

    if (!text || similarity_threshold === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必要参数',
        },
      });
    }

    // 扣除积分
    const creditsCost = aiService.AI_CREDITS_COST.rewrite;
    const newBalance = await deductCredits(userId, creditsCost, '降重改写');

    if (newBalance === null) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: '积分不足，请充值',
          details: {
            required: creditsCost,
          },
        },
      });
    }

    // 调用AI服务
    const result = await aiService.rewriteText(text, similarity_threshold);

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        credits_cost: creditsCost,
        credits_remaining: newBalance,
      },
    });
  } catch (error: any) {
    console.error('降重改写错误:', error);
    return res.status(503).json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI服务暂时不可用',
      },
    });
  }
};
