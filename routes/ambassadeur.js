// api/routes/ambassador.js
import express from 'express';
import { getAmbassadorStats } from '../controllers/ambassadeur.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.get('/stats', verifyToken, getAmbassadorStats);

export default router;