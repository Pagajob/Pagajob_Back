import express from 'express';
import { getWalletByUserId, getWalletTransactions } from '../controllers/wallets.js';

const router = express.Router();

router.get('/wallet/:userId', getWalletByUserId);
router.get('/transactions/:userId', getWalletTransactions);

export default router;