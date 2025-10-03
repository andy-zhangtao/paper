import { Router } from 'express';
import { getBalance, getTransactions } from '../controllers/creditsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有积分接口都需要认证
router.use(authenticate);

/**
 * @route   GET /api/credits/balance
 * @desc    查询积分余额
 * @access  Private
 */
router.get('/balance', getBalance);

/**
 * @route   GET /api/credits/transactions
 * @desc    查询积分流水
 * @access  Private
 */
router.get('/transactions', getTransactions);

export default router;
