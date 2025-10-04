import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { listStagePrompts, chatWithPrompt, chatWithPromptStream } from '../controllers/paperCreationController'

const router = Router()

router.use(authenticate)

router.get('/prompts', listStagePrompts)
router.post('/chat', chatWithPrompt)
router.post('/chat/stream', chatWithPromptStream)

export default router
