import { db } from '../connect.js';
import { sendMailoffreAbonnement } from '../controllers/senderMail.js';
import dotenv from 'dotenv';
import Stripe from 'stripe';
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

export async function sendMailOfferToFreeUsers() {
  console.log('Déclenchement de l\'envoi des offres d\'abonnement aux utilisateurs free inscrits depuis 72h');
  const [users] = await db.query(`
    SELECT id, firstName, email FROM users
    WHERE subscriptionTier = 'free'
      AND TIMESTAMPDIFF(HOUR, createdAt, NOW()) >= 72
      AND offerSent IS NULL
  `);

  for (const user of users) {
    try {
      const offerLink = await createPromoCheckoutLink(user);
      await sendMailoffreAbonnement(user.email, user.firstName, offerLink);
      await db.query('UPDATE users SET offerSent = NOW() WHERE id = ?', [user.id]);
      console.log(`Offre envoyée à ${user.email}`);
    } catch (err) {
      console.error(`Erreur pour l'utilisateur ${user.email} :`, err);
    }
  }
}