import express from 'express';
import { setCompanies, getCompanyByUserId } from '../controllers/companies.js';
import { upload } from '../middlewares/upload.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const BASE_URL = process.env.BACK_URL || 'http://localhost:8800';

// Importer le middleware d'upload
router.post('/logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Pas de fichier reçu' });
  }

  // Exemple : URL accessible du fichier (adapter selon ton serveur / config)
  const url = `${BASE_URL}/uploads/${req.file.filename}`;

  res.json({ url });
});

router.post('/setCompanies', setCompanies); 
router.get('/:idUser', getCompanyByUserId);


export default router;