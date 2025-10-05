import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as aiService from '../services/aiService';
import {
  TokenDeductionResult,
  deductCreditsByTokens,
  getUserCreditStatus,
} from './creditsController';

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

    if (!(await ensureCreditsActive(userId, res))) {
      return;
    }

    // 调用AI服务
    const result = await aiService.polishText(text, type);

    const deduction = await deductCreditsByTokens(
      userId,
      {
        totalTokens: result.usage.totalTokens,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        serviceType: 'polish',
        model: result.model,
      },
      '段落润色'
    );

    if (!deduction.ok) {
      handleDeductionFailure(res, deduction);
      return;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        credits_cost: deduction.cost,
        credits_remaining: deduction.remaining,
        token_usage: result.usage,
        token_to_credit_ratio: deduction.ratio,
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

    if (!(await ensureCreditsActive(userId, res))) {
      return;
    }

    // 调用AI服务
    const outlineResult = await aiService.generateOutline(topic, paper_type);

    const deduction = await deductCreditsByTokens(
      userId,
      {
        totalTokens: outlineResult.usage.totalTokens,
        promptTokens: outlineResult.usage.promptTokens,
        completionTokens: outlineResult.usage.completionTokens,
        serviceType: 'outline',
        model: outlineResult.model,
      },
      '生成大纲'
    );

    if (!deduction.ok) {
      handleDeductionFailure(res, deduction);
      return;
    }

    return res.status(200).json({
      success: true,
      data: {
        outline: outlineResult.outline,
        credits_cost: deduction.cost,
        credits_remaining: deduction.remaining,
        token_usage: outlineResult.usage,
        token_to_credit_ratio: deduction.ratio,
        model: outlineResult.model,
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

    if (!(await ensureCreditsActive(userId, res))) {
      return;
    }

    // 调用AI服务
    const grammarResult = await aiService.checkGrammar(text, level);

    const deduction = await deductCreditsByTokens(
      userId,
      {
        totalTokens: grammarResult.usage.totalTokens,
        promptTokens: grammarResult.usage.promptTokens,
        completionTokens: grammarResult.usage.completionTokens,
        serviceType: 'grammar',
        model: grammarResult.model,
      },
      '语法检查'
    );

    if (!deduction.ok) {
      handleDeductionFailure(res, deduction);
      return;
    }

    return res.status(200).json({
      success: true,
      data: {
        errors: grammarResult.errors,
        credits_cost: deduction.cost,
        credits_remaining: deduction.remaining,
        token_usage: grammarResult.usage,
        token_to_credit_ratio: deduction.ratio,
        model: grammarResult.model,
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

    if (!(await ensureCreditsActive(userId, res))) {
      return;
    }

    // 调用AI服务
    const referencesResult = await aiService.generateReferences(topic, count, format);

    const deduction = await deductCreditsByTokens(
      userId,
      {
        totalTokens: referencesResult.usage.totalTokens,
        promptTokens: referencesResult.usage.promptTokens,
        completionTokens: referencesResult.usage.completionTokens,
        serviceType: 'references',
        model: referencesResult.model,
      },
      '生成参考文献'
    );

    if (!deduction.ok) {
      handleDeductionFailure(res, deduction);
      return;
    }

    return res.status(200).json({
      success: true,
      data: {
        references: referencesResult.references,
        credits_cost: deduction.cost,
        credits_remaining: deduction.remaining,
        token_usage: referencesResult.usage,
        token_to_credit_ratio: deduction.ratio,
        model: referencesResult.model,
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

    if (!(await ensureCreditsActive(userId, res))) {
      return;
    }

    // 调用AI服务
    const result = await aiService.rewriteText(text, similarity_threshold);

    const deduction = await deductCreditsByTokens(
      userId,
      {
        totalTokens: result.usage.totalTokens,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        serviceType: 'rewrite',
        model: result.model,
      },
      '降重改写'
    );

    if (!deduction.ok) {
      handleDeductionFailure(res, deduction);
      return;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        credits_cost: deduction.cost,
        credits_remaining: deduction.remaining,
        token_usage: result.usage,
        token_to_credit_ratio: deduction.ratio,
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
