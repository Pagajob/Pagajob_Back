import express from 'express';
import { getMessagesByConversation, sendMessage, markMessagesAsRead } from '../controllers/messages.js';

const router = express.Router();

router.get('/:conversationId', getMessagesByConversation);
router.post('/', sendMessage);
router.post('/markAsRead', markMessagesAsRead);

export default router;