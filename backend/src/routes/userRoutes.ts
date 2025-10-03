import { Router } from 'express';
import {
  checkin,
  generateInviteCode,
  redeemInviteCode,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有用户接口都需要认证
router.use(authenticate);

/**
 * @route   POST /api/user/checkin
 * @desc    每日签到
 * @access  Private
 */
router.post('/checkin', checkin);

/**
 * @route   GET /api/user/invite-code
 * @desc    生成/获取邀请码
 * @access  Private
 */
router.get('/invite-code', generateInviteCode);

/**
 * @route   POST /api/user/redeem-invite
 * @desc    使用邀请码
 * @access  Private
 */
router.post('/redeem-invite', redeemInviteCode);

export default router;
