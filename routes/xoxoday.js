import express from 'express';
import { orderGiftCard } from '../controllers/xoxoday.js';

const router = express.Router();

router.post('/order', orderGiftCard);

export default router;