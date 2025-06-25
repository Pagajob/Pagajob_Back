import { db } from "../connect.js";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Ceci remplace __dirname :
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASE_URL = process.env.BACK_URL || 'http://localhost:8800';

// Configurer le dossier de destination et le nom de fichier
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/app/storage');
  },
  filename: (req, file, cb) => {
    cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
  }
});

export const uploadMissionFile = async (req, res) => {
  try {
    const { missionId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const url = `${BASE_URL}/uploads/${req.file.filename}`;
    const name = req.file.originalname;

    await db.query(
      "INSERT INTO mission_files (missionId, name, url) VALUES (?, ?, ?)",
      [missionId, name, url]
    );
    res.status(200).json({ url, name });
  } catch (err) {
    res.status(500).json(err);
  }
};

export const upload = multer({ storage });
