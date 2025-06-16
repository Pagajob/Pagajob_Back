import express from 'express';
import { transporter } from '../controllers/utils.js';

const router = express.Router();

router.get('/mailer', transporter);

export default router;