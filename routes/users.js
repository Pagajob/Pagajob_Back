import express from 'express';
import { getUser, setUser, getUserWithLogo, changePassword } from '../controllers/users.js';
import { upload } from '../middlewares/upload.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const BASE_URL = process.env.BACK_URL || 'http://localhost:8800';

router.get('/find/:userId', getUser);
router.post('/setUser', setUser);
router.get('/findWithLogo/:userId', getUserWithLogo);
router.post('/change-password', changePassword);

// Upload avatar étudiant
router.post('/avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Pas de fichier reçu' });
  }
  // Exemple : URL accessible du fichier (adapter selon ton serveur / config)
  const url = `${BASE_URL}/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;