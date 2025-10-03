import { Router } from 'express';
import { register, login, refreshToken } from '../controllers/authController';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    用户注册（仅限edu.cn邮箱）
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/refresh
 * @desc    刷新访问令牌
 * @access  Public
 */
router.post('/refresh', refreshToken);

export default router;
