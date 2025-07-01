import express from 'express';
import { orderGiftCard, getXoxodayBrands } from '../controllers/xoxoday.js';

const router = express.Router();

router.post('/order', orderGiftCard);
router.get('/brands', getXoxodayBrands);
router.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook Xoxoday reçu:', JSON.stringify(req.body, null, 2));
    // Xoxoday envoie généralement un body JSON avec le statut de la commande
    const event = req.body;

    // Exemple de structure attendue (à adapter selon la doc Xoxoday)
    const orderId = event.orderId;
    const deliveryStatus = event.deliveryStatus; // ex: "delivered"
    const voucherCode = event.voucherCode; // si fourni

    // Mets à jour la commande dans ta BDD
    /*await db.query(
      'UPDATE giftcard_orders SET deliveryStatus = ?, voucherCode = ? WHERE orderId = ?',
      [deliveryStatus, voucherCode || null, orderId]
    );*/

    // Tu peux aussi notifier l'utilisateur ici (mail, notification...)

    res.json({ received: true });
  } catch (err) {
    console.error('Erreur webhook Xoxoday:', err);
    res.status(500).json({ error: 'Erreur webhook Xoxoday' });
  }
});

export default router;