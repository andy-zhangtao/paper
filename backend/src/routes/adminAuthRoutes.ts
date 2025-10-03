import express from 'express';
import { adminLogin, getAdminProfile, changeAdminPassword } from '../controllers/adminAuthController';
import { adminAuthMiddleware } from '../middleware/adminAuth';

const router = express.Router();

// 管理员登录（无需认证）
router.post('/login', adminLogin);

// 获取当前管理员信息（需要认证）
router.get('/profile', adminAuthMiddleware, getAdminProfile);

// 修改管理员密码（需要认证）
router.put('/password', adminAuthMiddleware, changeAdminPassword);

export default router;
