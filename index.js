import express from 'express';
import { db } from './connect.js';

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
import jackpotRoutes from './routes/jackpot.js';
import utilsRoutes from './routes/utils.js';
import ambassadeurRoutes from './routes/ambassadeur.js';

import { sendMailOfferToFreeUsers } from './taskPlanifie/sendMailOffer.js';

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
const allowedOrigins = [
  "https://pagajob.com",
  "https://www.pagajob.com",
  "https://api.pagajob.com",
  "https://l.instagram.com",
  "https://lm.instagram.com",
  "https://web.facebook.com",
  "https://t.co",
];

app.use(cors({
  origin: function(origin, callback) {
    // Autorise les requêtes sans origin (ex: Postman) ou si l'origine est dans la liste
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use('/api/stripe', stripeWebhookRoutes);


app.use(express.json());
app.use(cookieParser());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static('/app/storage'));
app.post('/api/missions/uploadFile', upload.single('file'), uploadMissionFile);


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
app.use('/api/jackpot', jackpotRoutes);
app.use('/api/utils', utilsRoutes);
app.use('/api/ambassadeur', ambassadeurRoutes);

const port = process.env.PORT || 8800;
app.listen(port, () => {
  console.log('Server running on port', port);
});

// Ping MySQL toutes les 10 minutes pour éviter la mise en veille
setInterval(() => {
  db.query('SELECT 1')
    .then(() => console.log('Ping MySQL OK'))
    .catch(err => console.error('Ping MySQL failed:', err));
}, 300 * 1000); // 5 minutes

setInterval(() => {
  sendMailOfferToFreeUsers()
    .then(() => console.log('Offres envoyées'))
    .catch(err => console.error('Erreur lors de l\'envoi des offres :', err));
}, 3600 * 1000); // 1 heure