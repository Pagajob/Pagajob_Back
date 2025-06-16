import express from 'express';
import { transporter } from '../controllers/utils.js';

const router = express.Router();

router.get('/mailer', (req, res) => {
  res.json({ ok: !!transporter });
});

export default router;