import express from 'express';
import { getEligibleUsers, isUserEligible } from '../controllers/jackpot.js';

const router = express.Router();

router.get('/eligible-users', getEligibleUsers);
router.get('/is-eligible/:userId', isUserEligible);

export default router;