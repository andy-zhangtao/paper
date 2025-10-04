import { Response } from 'express';
import pool from '../config/database';
import { query } from '../utils/pgQuery';
import { AdminRequest } from '../middleware/adminAuth';

// 获取系统概览统计
export const getSystemOverview = async (req: AdminRequest, res: Response) => {
  try {
    type UserOverviewRow = {
      total_users: number | null;
      active_users: number | null;
      banned_users: number | null;
      today_new_users: number | null;
    };
    type PaperOverviewRow = {
      total_papers: number | null;
      today_new_papers: number | null;
      total_words: number | null;
    };
    type CreditOverviewRow = {
      total_recharge: number | null;
      total_consume: number | null;
      today_recharge: number | null;
      today_consume: number | null;
    };
    type RevenueOverviewRow = {
      total_revenue: number | null;
      today_revenue: number | null;
      total_orders: number | null;
      success_orders: number | null;
    };

    // 用户统计
    const [userStats] = await query<UserOverviewRow>(
      pool,
      `SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'banned' THEN 1 END) as banned_users,
        COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today_new_users
      FROM users`
    );

    // 论文统计
    const [paperStats] = await query<PaperOverviewRow>(
      pool,
      `SELECT
        COUNT(*) as total_papers,
        COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today_new_papers,
        SUM(word_count) as total_words
      FROM papers`
    );

    // 积分统计
    const [creditStats] = await query<CreditOverviewRow>(
      pool,
      `SELECT
        SUM(CASE WHEN type = 'recharge' THEN amount ELSE 0 END) as total_recharge,
        SUM(CASE WHEN type = 'consume' THEN amount ELSE 0 END) as total_consume,
        SUM(CASE WHEN type = 'recharge' AND created_at::date = CURRENT_DATE THEN amount ELSE 0 END) as today_recharge,
        SUM(CASE WHEN type = 'consume' AND created_at::date = CURRENT_DATE THEN amount ELSE 0 END) as today_consume
      FROM credit_transactions`
    );

    // 收入统计（假设1000积分=10元）
    const [revenueStats] = await query<RevenueOverviewRow>(
      pool,
      `SELECT
        SUM(amount) as total_revenue,
        SUM(CASE WHEN created_at::date = CURRENT_DATE THEN amount ELSE 0 END) as today_revenue,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success_orders
      FROM recharge_orders
      WHERE status = 'success'`
    );

    const revenue = revenueStats[0];

    res.json({
      users: userStats[0],
      papers: paperStats[0],
      credits: creditStats[0],
      revenue: {
        ...revenue,
        total_revenue: Number(revenue?.total_revenue || 0),
        today_revenue: Number(revenue?.today_revenue || 0)
      }
    });
  } catch (error) {
    console.error('获取系统概览失败:', error);
    res.status(500).json({ error: '获取系统概览失败' });
  }
};

// 获取用户增长趋势
export const getUserGrowthTrend = async (req: AdminRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const [trend] = await query<{
      date: string;
      new_users: number | null;
      cumulative_users: number | string | null;
    }>(
      pool,
      `SELECT
        created_at::date as date,
        COUNT(*) as new_users,
        SUM(COUNT(*)) OVER (ORDER BY created_at::date) as cumulative_users
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL ' 1 day' * ?
      GROUP BY created_at::date
      ORDER BY date ASC`,
      [Number(days)]
    );

    res.json({ trend });
  } catch (error) {
    console.error('获取用户增长趋势失败:', error);
    res.status(500).json({ error: '获取用户增长趋势失败' });
  }
};

// 获取收入趋势
export const getRevenueTrend = async (req: AdminRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const [trend] = await query<{
      date: string;
      daily_revenue: number | null;
      daily_orders: number | null;
    }>(
      pool,
      `SELECT
        created_at::date as date,
        SUM(amount) as daily_revenue,
        COUNT(*) as daily_orders
      FROM recharge_orders
      WHERE status = 'success'
        AND created_at >= CURRENT_DATE - INTERVAL ' 1 day' * ?
      GROUP BY created_at::date
      ORDER BY date ASC`,
      [Number(days)]
    );

    res.json({ trend });
  } catch (error) {
    console.error('获取收入趋势失败:', error);
    res.status(500).json({ error: '获取收入趋势失败' });
  }
};

// 获取积分消费统计
export const getCreditConsumptionStats = async (req: AdminRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;

    // 按服务类型统计消费
    const [serviceStats] = await query<{
      service_type: string;
      usage_count: number | null;
      total_credits: number | null;
      avg_credits: number | null;
    }>(
      pool,
      `SELECT
        service_type,
        COUNT(*) as usage_count,
        SUM(credits_consumed) as total_credits,
        AVG(credits_consumed) as avg_credits
      FROM ai_usage_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL ' 1 day' * ?
      GROUP BY service_type
      ORDER BY total_credits DESC`,
      [Number(days)]
    );

    // 按日期统计消费
    const [dailyStats] = await query<{
      date: string;
      usage_count: number | null;
      total_credits: number | null;
    }>(
      pool,
      `SELECT
        created_at::date as date,
        COUNT(*) as usage_count,
        SUM(credits_consumed) as total_credits
      FROM ai_usage_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL ' 1 day' * ?
      GROUP BY created_at::date
      ORDER BY date ASC`,
      [Number(days)]
    );

    res.json({
      byService: serviceStats,
      byDate: dailyStats
    });
  } catch (error) {
    console.error('获取积分消费统计失败:', error);
    res.status(500).json({ error: '获取积分消费统计失败' });
  }
};

// 获取热门用户排行
export const getTopUsers = async (req: AdminRequest, res: Response) => {
  try {
    const { limit = 20, sortBy = 'consumption' } = req.query;

    let orderByClause = '';
    switch (sortBy) {
      case 'consumption':
        orderByClause = 'total_consumption DESC';
        break;
      case 'recharge':
        orderByClause = 'total_recharge DESC';
        break;
      case 'papers':
        orderByClause = 'total_papers DESC';
        break;
      default:
        orderByClause = 'total_consumption DESC';
    }

    const [users] = await query<{
      id: string;
      email: string;
      credits: number;
      status: string;
      total_papers: number | null;
      total_consumption: number | null;
      total_recharge: number | null;
    }>(
      pool,
      `SELECT
        u.id,
        u.email,
        u.credits,
        u.status,
        COUNT(DISTINCT p.id) as total_papers,
        COALESCE(SUM(CASE WHEN ct.type = 'consume' THEN ct.amount ELSE 0 END), 0) as total_consumption,
        COALESCE(SUM(CASE WHEN ct.type = 'recharge' THEN ct.amount ELSE 0 END), 0) as total_recharge
      FROM users u
      LEFT JOIN papers p ON u.id = p.user_id
      LEFT JOIN credit_transactions ct ON u.id = ct.user_id
      GROUP BY u.id
      ORDER BY ${orderByClause}
      LIMIT ?`,
      [Number(limit)]
    );

    res.json({ users });
  } catch (error) {
    console.error('获取热门用户排行失败:', error);
    res.status(500).json({ error: '获取热门用户排行失败' });
  }
};

// 获取充值套餐销售统计
export const getPackageSalesStats = async (req: AdminRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const [stats] = await query<{
      package_id: string;
      credits: number;
      price: number;
      sales_count: number | null;
      total_revenue: number | null;
    }>(
      pool,
      `SELECT
        rp.id as package_id,
        rp.credits,
        rp.price,
        COUNT(ro.id) as sales_count,
        SUM(ro.amount) as total_revenue
      FROM recharge_packages rp
      LEFT JOIN recharge_orders ro ON rp.id = ro.package_id
        AND ro.status = 'success'
        AND ro.created_at >= CURRENT_DATE - INTERVAL ' 1 day' * ?
      WHERE rp.is_active = TRUE
      GROUP BY rp.id
      ORDER BY total_revenue DESC`,
      [Number(days)]
    );

    res.json({ stats });
  } catch (error) {
    console.error('获取套餐销售统计失败:', error);
    res.status(500).json({ error: '获取套餐销售统计失败' });
  }
};

// 获取实时数据
export const getRealtimeData = async (req: AdminRequest, res: Response) => {
  try {
    // 最近1小时的数据
    const [realtimeStats] = await query<{
      new_users_1h: number | null;
      new_papers_1h: number | null;
      revenue_1h: number | null;
      consumption_1h: number | null;
    }>(
      pool,
      `SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour') as new_users_1h,
        (SELECT COUNT(*) FROM papers WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour') as new_papers_1h,
        (SELECT COALESCE(SUM(amount), 0) FROM recharge_orders WHERE status = 'success' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour') as revenue_1h,
        (SELECT COALESCE(SUM(credits_consumed), 0) FROM ai_usage_logs WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour') as consumption_1h
      `
    );

    // 最近活跃用户
    const [activeUsers] = await query<{
      id: string;
      email: string;
      last_activity: Date;
    }>(
      pool,
      `SELECT DISTINCT
        u.id,
        u.email,
        al.created_at as last_activity
      FROM ai_usage_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      ORDER BY al.created_at DESC
      LIMIT 10`
    );

    res.json({
      stats: realtimeStats[0],
      activeUsers
    });
  } catch (error) {
    console.error('获取实时数据失败:', error);
    res.status(500).json({ error: '获取实时数据失败' });
  }
};
