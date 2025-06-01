import express from 'express';
import { getReferralDashboard } from '../controllers/referral.js';

const router = express.Router();

router.get('/referral-dashboard/:userId', getReferralDashboard);

export default router;