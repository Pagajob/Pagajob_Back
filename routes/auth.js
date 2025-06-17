import express from 'express';
import { register, login, logout, getCurrentUser, resetPassword, changePasswordWithToken } from '../controllers/auth.js';

const router = express.Router();

router.post('/register', register); 
router.post('/login', login); 
router.post('/logout', logout); 
router.get('/me', getCurrentUser);
router.get('/resetPassword', resetPassword);
router.get('/changePasswordWithToken', changePasswordWithToken);

export default router;
