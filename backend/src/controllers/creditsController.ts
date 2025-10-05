import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { execute, query } from '../utils/pgQuery';
import { AuthRequest } from '../middleware/auth';

/**
 * 查询积分余额
 */
export const getBalance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [users] = await query<{ credits: number; is_vip: boolean | number }>(
      pool,
      'SELECT credits, is_vip FROM users WHERE id = ?',
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

    return res.status(200).json({
      success: true,
      data: {
        credits: user.credits,
        is_vip: Boolean(user.is_vip),
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
export const deductCredits = async (
  userId: string,
  amount: number,
  description: string
): Promise<number | null> => {
  const connection = await pool.connect();

  try {
    await connection.query('BEGIN');

    // 查询当前余额
    const [users] = await query<{ credits: number }>(
      connection,
      'SELECT credits FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    if (users.length === 0) {
      await connection.query('ROLLBACK');
      return null;
    }

    const currentCredits = users[0].credits;

    // 检查余额是否足够
    if (currentCredits < amount) {
      await connection.query('ROLLBACK');
      return null;
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
    return newBalance;
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
