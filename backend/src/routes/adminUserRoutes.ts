import express from 'express';
import {
  getUserList,
  getUserDetail,
  toggleUserStatus,
  rechargeCredits,
  getUserTransactions
} from '../controllers/adminUserController';
import { adminAuthMiddleware } from '../middleware/adminAuth';

const router = express.Router();

// 所有路由都需要管理员认证
router.use(adminAuthMiddleware);

// 获取用户列表
router.get('/', getUserList);

// 获取用户详情
router.get('/:userId', getUserDetail);

// 封禁/解封用户
router.put('/:userId/status', toggleUserStatus);

// 为用户充值积分
router.post('/:userId/recharge', rechargeCredits);

// 获取用户积分流水
router.get('/:userId/transactions', getUserTransactions);

export default router;
