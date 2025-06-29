import axios from 'axios';
import { db } from '../connect.js';

const XOXO_CLIENT_ID = process.env.XOXO_CLIENT_ID;
const XOXO_CLIENT_SECRET = process.env.XOXO_CLIENT_SECRET;
const XOXO_BASE_URL = 'https://canvas.xoxoday.com/chef'; 

// 1. Authentification
async function getXoxoToken() {
  const res = await axios.post(`${XOXO_BASE_URL}/v1/oauth/token`, {
    client_id: XOXO_CLIENT_ID,
    client_secret: XOXO_CLIENT_SECRET,
    grant_type: 'client_credentials'
  });
  return res.data.access_token;
}

async function getCampaignIdByBrand(brandCode, token) {
  try {
    const res = await axios.post(
      `${XOXO_BASE_URL}/v1/oauth/api`,
      {
        tag: "xoxo_link",
        query: "xoxo_link.query.campaignList",
        variables: { add_data: { limit: 100, offset: 0 } }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const campaigns = res.data?.data?.campaignList?.data || [];
    const found = campaigns.find(c =>
      c.campaignName.toLowerCase().includes(brandCode.toLowerCase())
    );
    return found ? found.campaignId : null;
  } catch (err) {
    throw err;
  }
}

// 2. Commander une carte cadeau
export const orderGiftCard = async (req, res) => {
  try {
    console.log('Réception commande carte cadeau:', req.body);

    const { brandCode, amount, email, userId } = req.body;

    // Vérifie le solde du wallet
    const [walletRows] = await db.query('SELECT balance FROM wallets WHERE userId = ?', [userId]);
    console.log('Résultat requête wallet:', walletRows);
    if (!walletRows.length || walletRows[0].balance < amount) {
      console.warn('Solde insuffisant pour userId:', userId);
      return res.status(400).json({ error: "Solde insuffisant" });
    }

    const token = await getXoxoToken();
    console.log('Token Xoxoday récupéré:', token ? 'OK' : 'KO');

    // Appel à Xoxoday
    console.log('Envoi de la commande à Xoxoday:', {
      productId: brandCode,
      quantity: 1,
      denomination: amount,
      email: email
    });

    const orderRes = await axios.post(
      'https://canvas.xoxoday.com/chef/v1/oauth/api',
      {
        query: "plumProAPI.mutation.placeOrder",
        tag: "plumProAPI",
        variables: {
          data: {
            productId: brandCode,
            quantity: 1,
            denomination: amount,
            email: email,
            contact: "",
            tag: "",
            poNumber: "",
            notifyReceiverEmail: 0
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Réponse Xoxoday:', JSON.stringify(orderRes.data, null, 2));
    res.json(orderRes.data);
  } catch (err) {
    console.error('Erreur lors de la commande carte cadeau:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Erreur lors de la commande de la carte cadeau', details: err.response?.data || err.message });
  }
};

export async function getXoxodayBrands(req, res) {
  try {
    const accessToken = process.env.ACCESS_TOKEN;
    const response = await axios.post(
      'https://canvas.xoxoday.com/chef/v1/oauth/api',
      {
        "query": "plumProAPI.mutation.getVouchers",
        "tag": "plumProAPI",
        "variables": {
          "data": {
            "limit": 0,
            "page": 0,
            "includeProducts": "",
            "excludeProducts": "",
            "exchangeRate": "1",
            "sort": { "field": "", "order": "" },
            "filters": [{ "key": "", "value": "" }]
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Retourne uniquement le tableau des cartes cadeaux
    const vouchers = response.data?.data?.getVouchers?.data || [];
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des marques Xoxoday", details: err.response?.data || err.message });
  }
}