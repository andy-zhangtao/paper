import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { execute, query } from '../utils/pgQuery';
import { AdminRequest } from '../middleware/adminAuth';
import { logAdminOperation } from './adminAuthController';
import { formatCredit, roundCredit } from '../utils/creditMath';

interface User {
  id: string;
  email: string;
  phone: string;
  credits: number;
  credits_expire_at: Date | string | null;
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

    const normalizedUsers = users.map(user => ({
      ...user,
      credits_expire_at: user.credits_expire_at ? new Date(user.credits_expire_at).toISOString() : null,
    }));

    // 查询总数
    const [countResult] = await query<{ total: number }>(
      pool,
      `SELECT COUNT(DISTINCT u.id) as total FROM users u ${whereClause}`,
      queryParams
    );

    const total = countResult[0]?.total ?? 0;

    res.json({
      users: normalizedUsers,
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
    const normalizedUser = {
      ...user,
      credits_expire_at: user.credits_expire_at ? new Date(user.credits_expire_at).toISOString() : null,
    };

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
      user: normalizedUser,
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
    const amountNumber = Number(amount);

    if (!Number.isFinite(amountNumber)) {
      return res.status(400).json({ error: '积分数值无效' });
    }

    const delta = roundCredit(amountNumber);
    const newBalance = roundCredit(user.credits + delta);

    // 开启事务
    const connection = await pool.connect();
    await connection.query('BEGIN');

    try {
      // 更新用户积分
      await execute(
        connection,
        'UPDATE users SET credits = ? WHERE id = ?',
        [formatCredit(newBalance), userId]
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
          formatCredit(delta),
          formatCredit(newBalance),
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
        {
          amount: delta,
          description,
          balanceBefore: roundCredit(user.credits),
          balanceAfter: newBalance,
        },
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

// 直接设置用户积分与有效期
export const updateUserCredits = async (req: AdminRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { credits, expires_at, reason } = req.body as {
      credits: number;
      expires_at?: string | null;
      reason?: string;
    };
    const adminId = req.adminId!;

    const creditsNumber = Number(credits);
    if (!Number.isFinite(creditsNumber) || creditsNumber < 0) {
      return res.status(400).json({ error: '积分必须是大于等于0的数字' });
    }
    const normalizedCredits = roundCredit(creditsNumber);

    let expireDate: Date | null = null;
    if (expires_at) {
      const parsed = new Date(expires_at);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: '有效期格式不正确' });
      }
      expireDate = parsed;
    }

    const [users] = await query<User>(
      pool,
      'SELECT id, credits, credits_expire_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = users[0];
    const currentCredits = roundCredit(user.credits);
    const delta = roundCredit(normalizedCredits - currentCredits);

    const connection = await pool.connect();

    try {
      await connection.query('BEGIN');

      await execute(
        connection,
        'UPDATE users SET credits = ?, credits_expire_at = ?, updated_at = ? WHERE id = ?',
        [formatCredit(normalizedCredits), expireDate, new Date(), userId]
      );

      if (delta !== 0) {
        await execute(
          connection,
          `INSERT INTO credit_transactions
           (id, user_id, type, amount, balance_after, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)` ,
          [
            uuidv4(),
            userId,
            'adjustment',
            formatCredit(delta),
            formatCredit(normalizedCredits),
            reason || '管理员手动调整',
            new Date(),
          ]
        );
      }

      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }

    const expiresBefore = user.credits_expire_at
      ? new Date(user.credits_expire_at).toISOString()
      : null;

    await logAdminOperation(
      adminId,
      'update_user_credits',
      'user',
      userId,
      {
        reason,
        creditsBefore: currentCredits,
        creditsAfter: normalizedCredits,
        delta,
        expiresBefore,
        expiresAfter: expireDate ? expireDate.toISOString() : null,
      },
      req.ip
    );

    res.json({
      message: '用户积分已更新',
      credits: normalizedCredits,
      credits_expire_at: expireDate ? expireDate.toISOString() : null,
    });
  } catch (error) {
    console.error('更新用户积分失败:', error);
    res.status(500).json({ error: '更新用户积分失败' });
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
