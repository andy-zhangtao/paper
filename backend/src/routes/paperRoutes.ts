import { Router } from 'express';
import {
  createPaper,
  getPapers,
  getPaper,
  updatePaper,
  deletePaper,
} from '../controllers/paperController';
import { authenticate } from '../middleware/auth';
import discussionRoutes from './discussionRoutes';
import versionRoutes from './versionRoutes';

const router = Router();

// 所有论文接口都需要认证
router.use(authenticate);

/**
 * @route   POST /api/papers
 * @desc    创建论文
 * @access  Private
 */
router.post('/', createPaper);

/**
 * @route   GET /api/papers
 * @desc    获取论文列表
 * @access  Private
 */
router.get('/', getPapers);

/**
 * @route   GET /api/papers/:id
 * @desc    获取论文详情
 * @access  Private
 */
router.get('/:id', getPaper);

/**
 * @route   PATCH /api/papers/:id
 * @desc    更新论文
 * @access  Private
 */
router.patch('/:id', updatePaper);

/**
 * @route   DELETE /api/papers/:id
 * @desc    删除论文
 * @access  Private
 */
router.delete('/:id', deletePaper);

/**
 * 讨论区路由(嵌套)
 */
router.use('/:paperId/discussions', discussionRoutes);

/**
 * 版本管理路由(嵌套)
 */
router.use('/:paperId/versions', versionRoutes);

export default router;
