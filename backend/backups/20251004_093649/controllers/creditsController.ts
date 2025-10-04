import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

/**
 * 查询积分余额
 */
export const getBalance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const [users] = await pool.query(
      'SELECT credits, is_vip FROM users WHERE id = ?',
      [userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    const user = users[0] as any;

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

    const [transactions] = await pool.query(
      `SELECT id, type, amount, balance_after, description, created_at
       FROM credit_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM credit_transactions WHERE user_id = ?',
      [userId]
    );

    const total = (countResult as any)[0].total;

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
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 查询当前余额
    const [users] = await connection.query(
      'SELECT credits FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      await connection.rollback();
      return null;
    }

    const currentCredits = (users[0] as any).credits;

    // 检查余额是否足够
    if (currentCredits < amount) {
      await connection.rollback();
      return null;
    }

    const newBalance = currentCredits - amount;

    // 更新用户余额
    await connection.query(
      'UPDATE users SET credits = ?, updated_at = ? WHERE id = ?',
      [newBalance, new Date(), userId]
    );

    // 记录流水
    await connection.query(
      `INSERT INTO credit_transactions (id, user_id, type, amount, balance_after, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        require('uuid').v4(),
        userId,
        'consume',
        -amount,
        newBalance,
        description,
        new Date(),
      ]
    );

    await connection.commit();
    return newBalance;
  } catch (error) {
    await connection.rollback();
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
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 查询当前余额
    const [users] = await connection.query(
      'SELECT credits FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    const currentCredits = Array.isArray(users) && users.length > 0
      ? (users[0] as any).credits
      : 0;
    const newBalance = currentCredits + amount;

    // 更新用户余额
    await connection.query(
      'UPDATE users SET credits = ?, updated_at = ? WHERE id = ?',
      [newBalance, new Date(), userId]
    );

    // 记录流水
    await connection.query(
      `INSERT INTO credit_transactions (id, user_id, type, amount, balance_after, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        require('uuid').v4(),
        userId,
        'recharge',
        amount,
        newBalance,
        description,
        new Date(),
      ]
    );

    await connection.commit();
    return newBalance;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
