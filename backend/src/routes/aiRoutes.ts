import { Router } from 'express';
import {
  polishText,
  generateOutline,
  checkGrammar,
  generateReferences,
  rewriteText,
} from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有AI接口都需要认证
router.use(authenticate);

/**
 * @route   POST /api/ai/polish
 * @desc    段落润色
 * @access  Private
 */
router.post('/polish', polishText);

/**
 * @route   POST /api/ai/generate-outline
 * @desc    生成大纲
 * @access  Private
 */
router.post('/generate-outline', generateOutline);

/**
 * @route   POST /api/ai/check-grammar
 * @desc    语法检查
 * @access  Private
 */
router.post('/check-grammar', checkGrammar);

/**
 * @route   POST /api/ai/generate-references
 * @desc    生成参考文献
 * @access  Private
 */
router.post('/generate-references', generateReferences);

/**
 * @route   POST /api/ai/rewrite
 * @desc    降重改写
 * @access  Private
 */
router.post('/rewrite', rewriteText);

export default router;
