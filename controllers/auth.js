import { db } from "../connect.js";
import bcrypt from "bcryptjs"; 
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from 'dotenv';
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;


// Configuration CORS pour autoriser le frontend
const corsOptions = {
  origin: FRONTEND_URL, // Ton frontend
  credentials: true,               // Permet l'envoi des cookies
};

export const register = async (req, res) => {
  try {
    // Vérifier si l'utilisateur existe déjà
    const q = "SELECT * FROM users WHERE email = ?";
    const [data] = await db.query(q, [req.body.email]);
    if (data.length) return res.status(409).json("email already exists !");

    // Générer un code de parrainage unique
    let referralCode;
    let isUnique = false;
    while (!isUnique) {
      const firstLetter = (req.body.firstName?.[0] || 'X').toUpperCase();
      const lastLetter = (req.body.lastName?.[0] || 'X').toUpperCase();
      referralCode = firstLetter + lastLetter + crypto.randomBytes(3).toString("hex").toUpperCase();
      const [existing] = await db.query("SELECT id FROM users WHERE referralCode = ?", [referralCode]);
      if (existing.length === 0) isUnique = true;
    }

    // Chercher l'id du parrain si un code de parrainage a été fourni
    let referredBy = null;
    if (req.body.referralCode) {
      const [refRows] = await db.query("SELECT id FROM users WHERE referralCode = ?", [req.body.referralCode]);
      if (refRows.length > 0) {
        referredBy = refRows[0].id;
      }
    }

    // Créer un nouvel utilisateur
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(req.body.password, salt);

    const insertQuery = "INSERT INTO users (`firstName`, `lastName`, `email`, `role`, `password`, `referralCode`, `referredBy`, `subscriptionTier`, `companyName`, `createdAt`) VALUES (?)";
    const values = [
      req.body.firstName,
      req.body.lastName,
      req.body.email,
      req.body.role,
      hashedPassword,
      referralCode,
      referredBy,
      req.body.subscriptionTier,
      req.body.companyName,
      new Date() 
    ];

    // Insère l'utilisateur et récupère l'id
    const [result] = await db.query(insertQuery, [values]);
    const userId = result.insertId;

    // Crée le wallet à 0 pour ce user
    await db.query(
      "INSERT INTO wallets (userId, balance, updateAt) VALUES (?, 0, NOW())",
      [userId]
    );

    // Après avoir créé l'utilisateur et récupéré userId
    if (req.body.role === 'company') {
      await db.query(
        "INSERT INTO companies (idUser, companyName) VALUES (?, ?)",
        [userId, req.body.companyName]
      );
    }

    if (req.body.role === 'student') {
      await db.query(
        "INSERT INTO student (idUser) VALUES (?)",
        [userId]
      );
    }

    return res.status(200).json("User has been created.");
  } catch (err) {
    return res.status(500).json(err);
  }
};


export const login = async (req, res) => {
    const q = "SELECT * FROM users WHERE email = ?";
    try {
        const [data] = await db.query(q, [req.body.email]);
        if (data.length === 0) return res.status(404).json("Utilisateur non trouvé !");

        let user = data[0];

        // Vérification de l'expiration du boost
        if (
            user.subscriptionTier === 'boost' &&
            user.boostExpiration &&
            new Date(user.boostExpiration) < new Date()
        ) {
            // Expiré : repasse en free
            await db.query(
                "UPDATE users SET subscriptionTier = 'free', boostExpiration = NULL WHERE id = ?",
                [user.id]
            );
            user.subscriptionTier = 'free';
            user.boostExpiration = null;
        }

        const isPasswordCorrect = bcrypt.compareSync(req.body.password, user.password);
        if (!isPasswordCorrect) return res.status(400).json("Mauvais mot de passe ou email !");

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

        const { password, ...other } = user;

        res.cookie("access_token", token, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
        }).status(200).json(other);

    } catch (err) {
        return res.status(500).json(err);
    }
};

export const logout = async (req, res) => {
    res.clearCookie("access_token", {
        sameSite: "none",
        secure: true,
    }).status(200).json("Déconnecté avec succès");
}