// api/routes/ambassador.js
import express from 'express';
import { getAmbassadorStats } from '../controllers/ambassadeur.js';

const router = express.Router();
router.get('/stats', getAmbassadorStats);
export default router;