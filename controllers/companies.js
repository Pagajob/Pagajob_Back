import { db } from "../connect.js";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;

// Configuration CORS pour autoriser le frontend
const corsOptions = {
  origin: FRONTEND_URL, // Ton frontend
  credentials: true,               // Permet l'envoi des cookies
};


// Fonction pour vérifier si un utilisateur est authentifié et est une entreprise
const verifyTokenAndCompany = async (req, res, next) => {
  // Récupérer le token depuis les cookies
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(403).json("Token is missing or invalid!");
  }

  try {
    // Vérification du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Décoder le token
    req.userId = decoded.idUser; // Stocker l'id de l'utilisateur dans la requête pour l'utiliser plus tard

    // Vérifier si l'utilisateur est une entreprise
    const query = "SELECT * FROM users WHERE id = ? AND role = 'company'"; // Vérifier le rôle dans la base de données
    const [user] = await db.query(query, [req.userId]);

    if (!user) {
      return res.status(403).json("Access denied: You must be a company to create a mission.");
    }

    next(); // Passer à la fonction suivante si l'utilisateur est authentifié et est une entreprise
  } catch (err) {
    return res.status(500).json("Failed to authenticate token.");
  }
};


export const setCompanies = async (req, res) => {
  try {
    await verifyTokenAndCompany(req, res, async () => {
      // Vérifie si la société existe déjà pour cet utilisateur
      const q = "SELECT * FROM companies WHERE idUser = ?";
      const [data] = await db.query(q, [req.body.idUser]);

      if (data.length) {
        // Company existe => on fait une mise à jour

        // Récupérer l'ancien logo s'il existe
        let logoPath = data[0].logo; // l'ancien logo dans la BDD

        // Ici, on ne regarde plus req.file, mais juste req.body.logo
        if (req.body.logo) {
        logoPath = req.body.logo;  // on prend directement le lien envoyé
        }

        // Puis la suite : update avec logoPath
        const updateQuery = `
        UPDATE companies SET
            idUser = ?,
            name = ?, 
            legalName = ?,
            siret = ?,
            siren = ?,
            legalRepresentative = ?,
            street = ?,
            city = ?,
            postalCode = ?,
            country = ?,
            phone = ?,
            website = ?,
            email = ?,
            description = ?,
            logo = ?
        WHERE idUser = ?
        `;

        const updateValues = [
        req.body.idUser,
        req.body.name,
        req.body.legalName,
        req.body.siret,
        req.body.siren,
        req.body.legalRepresentative,
        req.body.street,
        req.body.city,
        req.body.postalCode,
        req.body.country,
        req.body.phone,
        req.body.website,
        req.body.email,
        req.body.description,
        logoPath,
        req.body.idUser
        ];

        await db.query(updateQuery, updateValues);
        return res.status(200).json("Company has been updated.");
      } else {
        // Company n'existe pas => on insère

        let logoPath = null;
        if (req.file) {
          logoPath = req.file.path;
        }

        const insertQuery = `
          INSERT INTO companies
          (idUser, name, legalName, siret, siren, legalRepresentative, street, city, postalCode, country, phone, website, email, description, logo)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `;

        const insertValues = [
          req.body.idUser,
          req.body.name,
          req.body.legalName,
          req.body.siret,
          req.body.siren,
          req.body.legalRepresentative,
          req.body.street,
          req.body.city,
          req.body.postalCode,
          req.body.country,
          req.body.phone,
          req.body.website,
          req.body.email,
          req.body.description,
          logoPath
        ];

        await db.query(insertQuery, insertValues);
        return res.status(200).json("Company has been created.");
      }
    });
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const getCompanyByUserId = async (req, res) => {
  try {
    const { idUser } = req.params;
    const q = "SELECT * FROM companies WHERE idUser = ?";
    const [data] = await db.query(q, [idUser]);

    if (data.length === 0) {
      return res.status(404).json("Company not found");
    }

    return res.status(200).json(data[0]);
  } catch (err) {
    return res.status(500).json(err);
  }
};

