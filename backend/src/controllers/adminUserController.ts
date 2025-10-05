import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { execute, query } from '../utils/pgQuery';
import { AdminRequest } from '../middleware/adminAuth';
import { logAdminOperation } from './adminAuthController';

interface User {
  id: string;
  email: string;
  phone: string;
  credits: number;
  status: 'active' | 'banned';
  created_at: Date;
  updated_at: Date;
}

interface UserWithStats extends User {
  total_papers: number;
  total_consumption: number;
  total_recharge: number;
}

// 获取用户列表
export const getUserList = async (req: AdminRequest, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      keyword,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    // 构建查询条件
    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    if (status) {
      whereConditions.push('u.status = ?');
      queryParams.push(status);
    }

    if (keyword) {
      whereConditions.push('(u.email LIKE ? OR u.phone LIKE ?)');
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // 查询用户列表（带统计信息）
    const [users] = await query<UserWithStats>(
      pool,
      `SELECT
        u.*,
        COUNT(DISTINCT p.id) as total_papers,
        COALESCE(SUM(CASE WHEN ct.type = 'consume' THEN ct.amount ELSE 0 END), 0) as total_consumption,
        COALESCE(SUM(CASE WHEN ct.type = 'recharge' THEN ct.amount ELSE 0 END), 0) as total_recharge
      FROM users u
      LEFT JOIN papers p ON u.id = p.user_id
      LEFT JOIN credit_transactions ct ON u.id = ct.user_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // 查询总数
    const [countResult] = await query<{ total: number }>(
      pool,
      `SELECT COUNT(DISTINCT u.id) as total FROM users u ${whereClause}`,
      queryParams
    );

    const total = countResult[0]?.total ?? 0;

    res.json({
      users,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize))
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
};

// 获取用户详情
export const getUserDetail = async (req: AdminRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // 查询用户基本信息
    const [users] = await query<User>(
      pool,
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = users[0];

    // 查询用户论文数量
    const [paperCount] = await query<{ count: number }>(
      pool,
      'SELECT COUNT(*) as count FROM papers WHERE user_id = ?',
      [userId]
    );

    // 查询用户积分消费统计
    const [consumeStats] = await query<{ total_consume: number | null; total_recharge: number | null }>(
      pool,
      `SELECT
        SUM(CASE WHEN type = 'consume' THEN amount ELSE 0 END) as total_consume,
        SUM(CASE WHEN type = 'recharge' THEN amount ELSE 0 END) as total_recharge
      FROM credit_transactions WHERE user_id = ?`,
      [userId]
    );

    // 查询最近的积分记录
    const [recentTransactions] = await query(
      pool,
      `SELECT * FROM credit_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    // 查询最近的论文
    const [recentPapers] = await query(
      pool,
      `SELECT id, title, word_count, created_at, updated_at
       FROM papers
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      user,
      stats: {
        totalPapers: paperCount[0]?.count ?? 0,
        totalConsume: consumeStats[0]?.total_consume || 0,
        totalRecharge: consumeStats[0]?.total_recharge || 0
      },
      recentTransactions,
      recentPapers
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({ error: '获取用户详情失败' });
  }
};

// 封禁/解封用户
export const toggleUserStatus = async (req: AdminRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.adminId!;

    // 查询用户当前状态
    const [users] = await query<User>(
      pool,
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = users[0];
    const newStatus = user.status === 'active' ? 'banned' : 'active';

    // 更新用户状态
    await query(pool, 
      'UPDATE users SET status = ? WHERE id = ?',
      [newStatus, userId]
    );

    // 记录操作日志
    await logAdminOperation(
      adminId,
      newStatus === 'banned' ? 'ban_user' : 'unban_user',
      'user',
      userId,
      { reason, oldStatus: user.status, newStatus },
      req.ip
    );

    res.json({
      message: newStatus === 'banned' ? '用户已封禁' : '用户已解封',
      status: newStatus
    });
  } catch (error) {
    console.error('修改用户状态失败:', error);
    res.status(500).json({ error: '修改用户状态失败' });
  }
};

// 为用户充值积分
export const rechargeCredits = async (req: AdminRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, description } = req.body;
    const adminId = req.adminId!;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: '充值金额必须大于0' });
    }

    // 查询用户
    const [users] = await query<User>(
      pool,
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = users[0];
    const newBalance = user.credits + Number(amount);

    // 开启事务
    const connection = await pool.connect();
    await connection.query('BEGIN');

    try {
      // 更新用户积分
      await execute(
        connection,
        'UPDATE users SET credits = ? WHERE id = ?',
        [newBalance, userId]
      );

      // 记录积分流水
      await execute(
        connection,
        `INSERT INTO credit_transactions
         (id, user_id, type, amount, balance_after, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          'bonus',
          Number(amount),
          newBalance,
          description || '管理员充值'
        ]
      );

      await connection.query('COMMIT');

      // 记录操作日志
      await logAdminOperation(
        adminId,
        'recharge_credits',
        'user',
        userId,
        { amount, description, balanceBefore: user.credits, balanceAfter: newBalance },
        req.ip
      );

      res.json({
        message: '充值成功',
        credits: newBalance
      });
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('充值积分失败:', error);
    res.status(500).json({ error: '充值积分失败' });
  }
};

// 获取用户积分流水
export const getUserTransactions = async (req: AdminRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, pageSize = 20, type } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let whereClause = 'WHERE user_id = ?';
    let queryParams: any[] = [userId];

    if (type) {
      whereClause += ' AND type = ?';
      queryParams.push(type);
    }

    // 查询流水记录
    const [transactions] = await query(
      pool,
      `SELECT * FROM credit_transactions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // 查询总数
    const [countResult] = await query<{ total: number }>(
      pool,
      `SELECT COUNT(*) as total FROM credit_transactions ${whereClause}`,
      queryParams
    );

    const total = countResult[0]?.total ?? 0;

    res.json({
      transactions,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize))
      }
    });
  } catch (error) {
    console.error('获取积分流水失败:', error);
    res.status(500).json({ error: '获取积分流水失败' });
  }
};
