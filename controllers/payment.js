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

  // Liste des priceId du moins cher au plus cher
  const priceOrder = [
    'price_1RIWFnIvfEt7sDt4rIeqm0Kk', // Free
    'price_1RLxVcIiItaN4R7RHNQF98Rg', // Boost
    'price_1RLxVlIiItaN4R7RSw6U0E4G', // Elite
  ];

  if (!priceId) {
    return res.status(400).json({ error: "❌ Price ID manquant dans la requête" });
  }

  // Vérifie si l'utilisateur a déjà un abonnement actif
  const [rows] = await db.query('SELECT subscriptionId FROM users WHERE id = ?', [userId]);
  const hasActiveSubscription = rows.length && rows[0].subscriptionId;

  try {
    if (hasActiveSubscription) {
      // Récupère l'abonnement Stripe
      const subscription = await stripe.subscriptions.retrieve(rows[0].subscriptionId);
      const subscriptionItemId = subscription.items.data[0].id;
      const currentPriceId = subscription.items.data[0].price.id;

      if (currentPriceId === priceId) {
        return res.status(400).json({ error: "Vous avez déjà cet abonnement." });
      }

      // Détermine si c'est un upgrade ou un downgrade
      const isUpgrade = priceOrder.indexOf(priceId) > priceOrder.indexOf(currentPriceId);

      // Met à jour l'abonnement Stripe
      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscriptionItemId,
          price: priceId,
        }],
        proration_behavior: isUpgrade ? 'create_prorations' : 'none',
      });

      if (isUpgrade) {
        // Récupère la dernière facture générée pour ce subscription
        const invoices = await stripe.invoices.list({
          subscription: subscription.id,
          limit: 1,
        });
        let invoice = invoices.data[0];

        // Si la facture est en draft, il faut la finaliser
        if (invoice && invoice.status === 'draft') {
          invoice = await stripe.invoices.finalizeInvoice(invoice.id);
        }

        if (invoice && invoice.status === 'open' && invoice.hosted_invoice_url) {
          // Renvoie l'URL de paiement de la facture du prorata
          return res.status(200).json({ url: invoice.hosted_invoice_url });
        }
        // Si pas de facture à payer, recharge la page comme avant
        return res.status(200).json({ message: "Abonnement mis à jour !" });
      }

      return res.status(200).json({ message: "Abonnement mis à jour !" });
    } else {
      // Pas d'abonnement actif, crée une session Checkout
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${FRONTEND_URL}/subscription/success`,
        cancel_url: `${FRONTEND_URL}/subscription/cancel`,
        metadata: {
          userId: req.userId,
          priceId: req.body.priceId
        }
      });

      return res.status(200).json({ url: session.url });
    }
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la gestion de l'abonnement Stripe" });
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