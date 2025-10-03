import { Router } from 'express';
import { createDiscussion, getDiscussions } from '../controllers/discussionController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true }); // mergeParams用于访问父路由的参数

// 所有讨论接口都需要认证
router.use(authenticate);

/**
 * @route   POST /api/papers/:paperId/discussions
 * @desc    创建讨论(AI自动回答)
 * @access  Private
 */
router.post('/', createDiscussion);

/**
 * @route   GET /api/papers/:paperId/discussions
 * @desc    获取讨论列表
 * @access  Private
 */
router.get('/', getDiscussions);

export default router;
