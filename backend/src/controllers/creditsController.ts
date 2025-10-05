import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { execute, query } from '../utils/pgQuery';
import { AuthRequest } from '../middleware/auth';
import { getTokenToCreditRatio } from '../services/creditSettingsService';

/**
 * 查询积分余额
 */
export const getBalance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [users] = await query<{ credits: number; is_vip: boolean | number; credits_expire_at: Date | string | null }>(
      pool,
      'SELECT credits, is_vip, credits_expire_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    const user = users[0];
    const expiresAt = user.credits_expire_at ? new Date(user.credits_expire_at) : null;
    const ratio = await getTokenToCreditRatio();

    return res.status(200).json({
      success: true,
      data: {
        credits: user.credits,
        is_vip: Boolean(user.is_vip),
        credits_expire_at: expiresAt ? expiresAt.toISOString() : null,
        token_to_credit_ratio: ratio,
      },
    });
  } catch (error) {
    console.error('查询积分余额错误:', error);
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
 * 查询积分流水
 */
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [transactions] = await query<{
      id: string;
      type: string;
      amount: number;
      balance_after: number;
      description: string | null;
      created_at: Date;
    }>(
      pool,
      `SELECT id, type, amount, balance_after, description, created_at
       FROM credit_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await query<{ total: number }>(
      pool,
      'SELECT COUNT(*) as total FROM credit_transactions WHERE user_id = ?',
      [userId]
    );

    const total = countResult[0]?.total ?? 0;

    return res.status(200).json({
      success: true,
      data: {
        items: transactions,
        pagination: {
          total,
          page,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('查询积分流水错误:', error);
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
 * 扣除积分（内部方法）
 * @param userId 用户ID
 * @param amount 扣除数量（正数）
 * @param description 操作描述
 * @returns 扣除后的余额，如果积分不足返回null
 */
export type DeductCreditsFailureReason = 'NOT_FOUND' | 'INSUFFICIENT' | 'EXPIRED';

export interface DeductCreditsResult {
  ok: boolean;
  balance?: number;
  reason?: DeductCreditsFailureReason;
}

export const deductCredits = async (
  userId: string,
  amount: number,
  description: string
): Promise<DeductCreditsResult> => {
  const connection = await pool.connect();

  try {
    await connection.query('BEGIN');

    // 查询当前余额
    const [users] = await query<{ credits: number; credits_expire_at: Date | string | null }>(
      connection,
      'SELECT credits, credits_expire_at FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    if (users.length === 0) {
      await connection.query('ROLLBACK');
      return { ok: false, reason: 'NOT_FOUND' };
    }

    const currentCredits = users[0].credits;
    const expireAt = users[0].credits_expire_at ? new Date(users[0].credits_expire_at) : null;

    if (expireAt && expireAt.getTime() < Date.now()) {
      await connection.query('ROLLBACK');
      return { ok: false, reason: 'EXPIRED' };
    }

    if (amount <= 0) {
      await connection.query('ROLLBACK');
      return { ok: true, balance: currentCredits };
    }

    // 检查余额是否足够
    if (currentCredits < amount) {
      await connection.query('ROLLBACK');
      return { ok: false, reason: 'INSUFFICIENT' };
    }

    const newBalance = currentCredits - amount;

    // 更新用户余额
    await execute(
      connection,
      'UPDATE users SET credits = ?, updated_at = ? WHERE id = ?',
      [newBalance, new Date(), userId]
    );

    // 记录流水
    await execute(
      connection,
      `INSERT INTO credit_transactions (id, user_id, type, amount, balance_after, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        'consume',
        -amount,
        newBalance,
        description,
        new Date(),
      ]
    );

    await connection.query('COMMIT');
    return { ok: true, balance: newBalance };
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 增加积分（内部方法）
 * @param userId 用户ID
 * @param amount 增加数量（正数）
 * @param description 操作描述
 * @returns 增加后的余额
 */
export const addCredits = async (
  userId: string,
  amount: number,
  description: string
): Promise<number> => {
  const connection = await pool.connect();

  try {
    await connection.query('BEGIN');

    // 查询当前余额
    const [users] = await query<{ credits: number }>(
      connection,
      'SELECT credits FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    const currentCredits = users.length > 0 ? users[0].credits : 0;
    const newBalance = currentCredits + amount;

    // 更新用户余额
    await execute(
      connection,
      'UPDATE users SET credits = ?, updated_at = ? WHERE id = ?',
      [newBalance, new Date(), userId]
    );

    // 记录流水
    await execute(
      connection,
      `INSERT INTO credit_transactions (id, user_id, type, amount, balance_after, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        'recharge',
        amount,
        newBalance,
        description,
        new Date(),
      ]
    );

    await connection.query('COMMIT');
    return newBalance;
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
};

export interface TokenUsageSummary {
  totalTokens: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  serviceType?: string;
  model?: string | null;
  paperId?: string | null;
}

export interface TokenDeductionResult {
  ok: boolean;
  cost: number;
  ratio: number;
  remaining?: number;
  reason?: DeductCreditsFailureReason;
}

export interface UserCreditStatus {
  credits: number;
  creditsExpireAt: Date | null;
  isExpired: boolean;
}

export const getUserCreditStatus = async (userId: string): Promise<UserCreditStatus | null> => {
  const [rows] = await query<{ credits: number; credits_expire_at: Date | string | null }>(
    pool,
    'SELECT credits, credits_expire_at FROM users WHERE id = ?',
    [userId]
  );

  if (!rows || rows.length === 0) {
    return null;
  }

  const expireAt = rows[0].credits_expire_at ? new Date(rows[0].credits_expire_at) : null;

  return {
    credits: rows[0].credits,
    creditsExpireAt: expireAt,
    isExpired: Boolean(expireAt && expireAt.getTime() < Date.now()),
  };
};

export const deductCreditsByTokens = async (
  userId: string,
  usage: TokenUsageSummary,
  description: string
): Promise<TokenDeductionResult> => {
  const ratio = await getTokenToCreditRatio();

  const totalTokens = Math.max(0, Math.ceil(usage.totalTokens || 0));
  const cost = Math.ceil(totalTokens * ratio);

  if (cost <= 0) {
    const [users] = await query<{ credits: number }>(
      pool,
      'SELECT credits FROM users WHERE id = ?',
      [userId]
    );

    return {
      ok: true,
      cost: 0,
      ratio,
      remaining: users[0]?.credits ?? 0,
    };
  }

  const deduction = await deductCredits(userId, cost, description);

  if (!deduction.ok) {
    return {
      ok: false,
      cost,
      ratio,
      reason: deduction.reason,
    };
  }

  try {
    await execute(
      pool,
      `INSERT INTO ai_usage_logs (id, user_id, paper_id, service_type, credits_consumed, input_tokens, output_tokens, model, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        uuidv4(),
        userId,
        usage.paperId || null,
        usage.serviceType || 'chat',
        cost,
        usage.promptTokens ?? null,
        usage.completionTokens ?? null,
        usage.model ?? null,
        new Date(),
      ]
    );
  } catch (error) {
    console.error('记录AI使用日志失败:', error);
    // 日志写入失败不影响主流程
  }

  return {
    ok: true,
    cost,
    ratio,
    remaining: deduction.balance,
  };
};
