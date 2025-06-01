import express from 'express';
import { getConversationByMissionAndUser, getConversationsByUser, deleteConversation } from '../controllers/conversations.js';

const router = express.Router();

router.get('/byMissionAndUser', getConversationByMissionAndUser);
router.get('/byUser', getConversationsByUser);
router.delete('/:conversationId', deleteConversation);

export default router;