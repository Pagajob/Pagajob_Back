import express from 'express';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productsRoutes from './routes/products.js';
import missionsRoutes from './routes/missions.js';
import messagesRoutes from './routes/messages.js';
import conversationsRoutes from './routes/conversations.js';
import companiesRoutes from './routes/companies.js';
import applicationsRoutes from './routes/applications.js';
import paymentRoutes from './routes/payment.js';
import stripeWebhookRoutes from './routes/stripeWebhook.js';
import notificationsRoutes from './routes/notifications.js';
import walletsRoutes from './routes/wallets.js';
import referralRoutes from './routes/referral.js';
import xoxodayRoutes from './routes/xoxoday.js';
import studentsRoutes from './routes/students.js';

import cors from 'cors';
import cookieParser from 'cookie-parser';

import path from 'path';
import { fileURLToPath } from 'url';
import { upload } from './middlewares/upload.js';
import { uploadMissionFile } from './middlewares/upload.js';
import dotenv from 'dotenv';

dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;

const app = express();
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.post('/api/missions/uploadFile', upload.single('file'), uploadMissionFile);

// a placer avant d'utiliser express.json() et cookieParser()
app.use('/api/stripe', stripeWebhookRoutes);


app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/wallets', walletsRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/xoxoday', xoxodayRoutes);
app.use('/api/students', studentsRoutes);

const port = process.env.PORT || 8800;
app.listen(port, () => {
  console.log('Server running on port', port);
});