import express from 'express';
import { orderGiftCard, getXoxodayBrands } from '../controllers/xoxoday.js';

const router = express.Router();

router.post('/order', orderGiftCard);
router.get('/brands', getXoxodayBrands);

export default router;