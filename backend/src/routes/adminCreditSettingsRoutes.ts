import express from 'express';
import { fetchCreditSettings, updateCreditSettings } from '../controllers/adminCreditSettingsController';
import { adminAuthMiddleware } from '../middleware/adminAuth';

const router = express.Router();

router.use(adminAuthMiddleware);

router.get('/settings', fetchCreditSettings);
router.put('/settings', updateCreditSettings);

export default router;
