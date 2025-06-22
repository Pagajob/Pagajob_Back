// cron/sendPromoOffer.js
import cron from 'node-cron';
import { db } from '../connect.js';
import { createPromoCheckoutLink } from '../utils/stripe.js';
import { sendMailoffreAbonnement } from '../controllers/senderMail.js';
import dotenv from 'dotenv';
import Stripe from 'stripe';
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

cron.schedule('0 * * * *', async () => { // Exécute toutes les heures
  console.log('Exécution de la tâche planifiée pour envoyer les offres d\'abonnement aux utilisateurs free inscrits depuis 72h');
  // Sélectionne les users free inscrits depuis 72h et n'ayant pas déjà reçu l'offre
  const [users] = await db.query(`
    SELECT id, firstName, email FROM users
    WHERE subscriptionTier = 'free'
      AND TIMESTAMPDIFF(HOUR, createdAt, NOW()) >= 72
      AND offerSent IS NULL
  `);

  for (const user of users) {
    const offerLink = await createPromoCheckoutLink(user);
    await sendMailoffreAbonnement(user.email, user.firstName, offerLink);
    // Marque l'offre comme envoyée pour ne pas spammer
    await db.query('UPDATE users SET offerSent = NOW() WHERE id = ?', [user.id]);
  }
});

export async function createPromoCheckoutLink(user) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: 'price_1RJyD4IobxwiEFS3v9BmlSu3',
        quantity: 1,
      },
    ],
    discounts: [{promotion_code: 'promo_1Rcol1IobxwiEFS36kZhcDd9'}],
    success_url: `${process.env.FRONTEND_URL}/subscription/success`,
    cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
    metadata: {
      userId: user.id,
    },
  });
  return session.url;
}