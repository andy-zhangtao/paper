import express from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import {
  getPromptStages,
  createPromptStage,
  updatePromptStage,
  deletePromptStage,
  getTemplatesByStage,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
} from '../controllers/adminPromptTemplateController';

const router = express.Router();

router.use(adminAuthMiddleware);

router.get('/stages', getPromptStages);
router.post('/stages', createPromptStage);
router.put('/stages/:stageId', updatePromptStage);
router.delete('/stages/:stageId', deletePromptStage);

router.get('/stages/:stageId/templates', getTemplatesByStage);
router.post('/templates', createPromptTemplate);
router.put('/templates/:templateId', updatePromptTemplate);
router.delete('/templates/:templateId', deletePromptTemplate);

export default router;
