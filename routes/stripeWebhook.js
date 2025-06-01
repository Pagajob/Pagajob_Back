import express from 'express';
import Stripe from 'stripe';
import { updateUserSubscription } from '../controllers/users.js';
import { db } from '../connect.js';
import { handleReferralCommission, handleReferralBonus, handleFreeToBoost } from '../controllers/referral.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gère l'événement de paiement réussi d'un abonnement
  if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
    const session = event.data.object;
    
    const userId = session.metadata?.userId;
    const priceId = session.metadata?.priceId || session.lines?.data[0]?.price?.id;
    const subscriptionId = session.subscription;

    if (userId && priceId && subscriptionId) {
      await updateUserSubscription(userId, priceId, subscriptionId);

      // --- Parrainage : versement au parrain si applicable ---
      // 1. Récupère le parrain de l'utilisateur
      const [userRows] = await db.query('SELECT referredBy FROM users WHERE id = ?', [userId]);
      const referredBy = userRows[0]?.referredBy;

      if (referredBy) {
        // 2. Récupère le type d'abonnement du parrain
        const [refRows] = await db.query('SELECT subscriptionTier FROM users WHERE id = ?', [referredBy]);
        const refTier = refRows[0]?.subscriptionTier;

        // Commission de parrainage
        const walletId = await handleReferralCommission({ referredBy, userId, refTier, session });

        // Bonus 50€ pour boost/elite
        if (walletId && (refTier === 'boost' || refTier === 'elite')) {
          await handleReferralBonus({ referredBy, walletId });
        }

        // Offre boost 2 mois pour free
        if (refTier === 'free') {
          await handleFreeToBoost({ referredBy });
        }
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    // Récupère l'userId via la BDD (en cherchant subscriptionId)
    const [rows] = await db.query('SELECT id FROM users WHERE subscriptionId = ?', [subscription.id]);
    if (rows.length) {
      const userId = rows[0].id;
      await db.query('UPDATE users SET subscriptionTier = ?, subscriptionId = NULL WHERE id = ?', ['free', userId]);
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const tempMissionId = paymentIntent.metadata.tempMissionId;

    // Passe la mission de "draft" à "paid" et la rends visible
    await db.query(
      "UPDATE missions SET paymentStatus = 'paid', status = 'pending' WHERE id = ?",
      [tempMissionId]
    );

    // Ajoute 90% du montant dans le wallet du company
    // Récupère la mission pour avoir le companyId et le budget
    const [missions] = await db.query("SELECT * FROM missions WHERE id = ?", [tempMissionId]);
    if (missions.length) {
      const mission = missions[0];
      const companyId = mission.companyId;
      const amountToAdd = Number(mission.budget) * 0.9;
      let iduser = null;

      const [rows] = await db.query("SELECT iduser FROM companies WHERE id = ?", [companyId]);
      if (rows.length > 0) {
        iduser = rows[0].iduser;
      } 
      
      // Ajoute au wallet
      await db.query(
        "UPDATE wallets SET balance = balance + ? WHERE userId = ?",
        [amountToAdd, iduser]
      );
      // (Optionnel) Historique
      await db.query(
        "INSERT INTO wallet_transactions (walletId, type, amount, missionId, description, createdAt) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'credit', ?, ?, 'Paiement de la mission (90% de la valeur de la mission)', NOW())",
        [iduser, amountToAdd, tempMissionId]
      );
    }
  }

  if (event.type === 'refund.succeeded') {
    const charge = event.data.object;
    const paymentIntentId = charge.payment_intent; 

    // Récupère la mission liée à ce paymentIntentId
    const [missions] = await db.query(
      "SELECT * FROM missions WHERE stripePaymentIntentId = ?",
      [paymentIntentId]
    );

    if (missions.length) {
      const mission = missions[0];
      const missionId = mission.id;
      const companyId = mission.companyId;
      let iduser = null;

      // Soustrait le montant remboursé du wallet (Stripe donne le montant en centimes)
      const refundAmount = Number(charge.amount_refunded) / 100;

      const [rows] = await db.query("SELECT iduser FROM companies WHERE id = ?", [companyId]);
      if (rows.length > 0) {
        iduser = rows[0].iduser;
      }

      await db.query(
        "UPDATE wallets SET balance = balance - ? WHERE userId = ?",
        [refundAmount, iduser]
      );
      // Historique
      await db.query(
        "INSERT INTO wallet_transactions (walletId, type, amount, missionId, description) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'refund', ?, ?, 'Remboursement de la mission')",
        [iduser, refundAmount, missionId]
      );

      // Suppression des données liées à la mission
      await db.query("DELETE FROM applications WHERE missionId = ?", [missionId]);
      await db.query("DELETE FROM conversations WHERE missionId = ?", [missionId]);
      await db.query("DELETE FROM mission_files WHERE missionId = ?", [missionId]);
      await db.query("DELETE FROM missions WHERE id = ?", [missionId]);
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const paymentIntentId = charge.payment_intent; 

    // Récupère la mission liée à ce paymentIntentId
    const [missions] = await db.query(
      "SELECT * FROM missions WHERE stripePaymentIntentId = ?",
      [paymentIntentId]
    );

    if (missions.length) {
      const mission = missions[0];
      const missionId = mission.id;
      const companyId = mission.companyId;
      let iduser = null;

      // Soustrait le montant remboursé du wallet (Stripe donne le montant en centimes)
      const refundAmount = Number(charge.amount_refunded) / 100;

      const [rows] = await db.query("SELECT iduser FROM companies WHERE id = ?", [companyId]);
      if (rows.length > 0) {
        iduser = rows[0].iduser;
      }

      await db.query(
        "UPDATE wallets SET balance = balance - ? WHERE userId = ?",
        [refundAmount, iduser]
      );
      // Historique
      await db.query(
        "INSERT INTO wallet_transactions (walletId, type, amount, missionId, description) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'refund', ?, ?, 'Remboursement de la mission')",
        [iduser, refundAmount, missionId]
      );

      // Suppression des données liées à la mission
      await db.query("DELETE FROM applications WHERE missionId = ?", [missionId]);
      await db.query("DELETE FROM conversations WHERE missionId = ?", [missionId]);
      await db.query("DELETE FROM mission_files WHERE missionId = ?", [missionId]);
      await db.query("DELETE FROM missions WHERE id = ?", [missionId]);
    }
  }

  res.json({ received: true });
});

export default router;