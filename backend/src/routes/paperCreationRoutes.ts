import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { listStagePrompts, chatWithPrompt } from '../controllers/paperCreationController'

const router = Router()

router.use(authenticate)

router.get('/prompts', listStagePrompts)
router.post('/chat', chatWithPrompt)

export default router
