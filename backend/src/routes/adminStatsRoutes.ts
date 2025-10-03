import express from 'express';
import {
  getSystemOverview,
  getUserGrowthTrend,
  getRevenueTrend,
  getCreditConsumptionStats,
  getTopUsers,
  getPackageSalesStats,
  getRealtimeData
} from '../controllers/adminStatsController';
import { adminAuthMiddleware } from '../middleware/adminAuth';

const router = express.Router();

// 所有路由都需要管理员认证
router.use(adminAuthMiddleware);

// 获取系统概览
router.get('/overview', getSystemOverview);

// 获取用户增长趋势
router.get('/user-growth', getUserGrowthTrend);

// 获取收入趋势
router.get('/revenue-trend', getRevenueTrend);

// 获取积分消费统计
router.get('/credit-consumption', getCreditConsumptionStats);

// 获取热门用户排行
router.get('/top-users', getTopUsers);

// 获取充值套餐销售统计
router.get('/package-sales', getPackageSalesStats);

// 获取实时数据
router.get('/realtime', getRealtimeData);

export default router;
