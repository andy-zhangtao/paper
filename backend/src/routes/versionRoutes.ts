import { Router } from 'express';
import {
  createVersion,
  getVersions,
  compareVersions,
  restoreVersion,
} from '../controllers/versionController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

// 所有版本接口都需要认证
router.use(authenticate);

/**
 * @route   POST /api/papers/:paperId/versions
 * @desc    保存版本
 * @access  Private
 */
router.post('/', createVersion);

/**
 * @route   GET /api/papers/:paperId/versions
 * @desc    获取版本列表
 * @access  Private
 */
router.get('/', getVersions);

/**
 * @route   GET /api/papers/:paperId/versions/compare
 * @desc    版本对比
 * @access  Private
 */
router.get('/compare', compareVersions);

/**
 * @route   POST /api/papers/:paperId/versions/:versionId/restore
 * @desc    回滚版本
 * @access  Private
 */
router.post('/:versionId/restore', restoreVersion);

export default router;
