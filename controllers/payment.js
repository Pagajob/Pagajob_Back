import { db } from "../connect.js";
import jwt from "jsonwebtoken";
import Stripe from 'stripe';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // clé secrète

// Configuration CORS pour autoriser le frontend
const corsOptions = {
  origin: FRONTEND_URL, 
  credentials: true, 
};

// Fonction pour vérifier si un utilisateur est authentifié et est un étudiant
export const verifyTokenAndStudent = async (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).json("Non authentifié !");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    // Vérifier si l'utilisateur est un étudiant
    const [user] = await db.query("SELECT * FROM users WHERE id = ? AND role = 'student'", [req.userId]);
    if (!user.length) {
      return res.status(403).json("Accès refusé : vous devez être étudiant pour souscrire un abonnement.");
    }
    next();
  } catch (err) {
    return res.status(403).json("Token invalide !");
  }
};

export const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).json("Non authentifié !");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(403).json("Token invalide !");
  }
};

export const setPayment = async (req, res) => {
  const { priceId } = req.body;
  const userId = req.userId;

  if (!priceId) {
    return res.status(400).json({ error: "❌ Price ID manquant dans la requête" });
  }

  // Vérifie si l'utilisateur a déjà un abonnement actif
  const [rows] = await db.query('SELECT subscriptionId FROM users WHERE id = ?', [userId]);
  if (rows.length && rows[0].subscriptionId) {
    // Annule l'ancien abonnement Stripe
    await stripe.subscriptions.cancel(rows[0].subscriptionId);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', 
      payment_method_types: ['card'], 
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:5173/subscription/success', 
      cancel_url: 'http://localhost:5173/subscription/cancel',
      metadata: {
        userId: req.userId, 
        priceId: req.body.priceId
      }
    });

    res.status(200).json({ url: session.url }); 
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la création de la session Stripe" });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    // Récupère l'id utilisateur depuis le token (middleware d'auth)
    const userId = req.userId;
    // Récupère le subscriptionId en BDD
    const [rows] = await db.query('SELECT subscriptionId FROM users WHERE id = ?', [userId]);
    if (!rows.length || !rows[0].subscriptionId) {
      return res.status(400).json({ error: "Aucun abonnement actif trouvé." });
    }
    const subscriptionId = rows[0].subscriptionId;
    // Annule l'abonnement Stripe
    const result = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    res.status(200).json({ message: "Abonnement annulé avec succès." });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'annulation de l'abonnement." });
  }
};


export default router;