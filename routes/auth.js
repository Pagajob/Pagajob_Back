import express from 'express';
import { register, login, logout, getCurrentUser, resetPassword, changePasswordWithToken, confirmEmail, resendConfirmation } from '../controllers/auth.js';

const router = express.Router();

router.post('/register', register); 
router.post('/login', login); 
router.post('/logout', logout); 
router.get('/me', getCurrentUser);
router.post('/resetPassword', resetPassword);
router.post('/changePasswordWithToken', changePasswordWithToken);
router.post('/confirm-email', confirmEmail);
router.post("/resend-confirmation", resendConfirmation);

export default router;
