import express from 'express';
import { verifyTokenAndStudent, cancelSubscription, setPayment, verifyToken } from '../controllers/payment.js';

const router = express.Router();


router.post('/setPayment', verifyTokenAndStudent, setPayment);
router.post('/cancelSubscription', verifyToken, cancelSubscription);


export default router;