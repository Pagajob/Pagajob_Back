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
    const { brandCode, amount, email, userId } = req.body;

    // Vérifie le solde du wallet
    const [walletRows] = await db.query('SELECT balance FROM wallets WHERE userId = ?', [userId]);
    if (!walletRows.length || walletRows[0].balance < amount) {
      return res.status(400).json({ error: "Solde insuffisant" });
    }

    const token = await getXoxoToken();

    // Récupère dynamiquement le campaignId selon la marque
    const campaignId = await getCampaignIdByBrand(brandCode, token);

    if (!campaignId) {
      return res.status(404).json({ error: "Aucune campagne trouvée pour cette marque" });
    }

    const orderRes = await axios.post(
      `${XOXO_BASE_URL}/v1/oauth/api`,
      {
        tag: "xoxo_link",
        query: "xoxo_link.mutation.generateLinkEmail",
        variables: {
          data: {
            campaignId: campaignId,
            email_ids: email,
            link_expiry: "31-12-2025"
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

    // Récupère nom et prénom de l'utilisateur
    const [userRows] = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [userId]);
    const user = userRows[0];
    const description = `Carte cadeau ${brandCode} - ${user.firstName} ${user.lastName} (id:${userId})`;

    // Si succès, débite le wallet et ajoute une transaction
    if (orderRes.data.status === 'SUCCESS') {
      await db.query(
        "UPDATE wallets SET balance = balance - ? WHERE userId = ?",
        [amount, userId]
      );
      await db.query(
        "INSERT INTO wallet_transactions (walletId, type, amount, description, createdAt) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'giftcard', ?, ?, ?)",
        [userId, amount, description, new Date()]
      );
    }

    res.json(orderRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la commande de la carte cadeau' });
  }
};

export async function getXoxodayBrands(req, res) {
  try {
    const accessToken = process.env.ACCESS_TOKEN;
    console.log('Token utilisé pour Xoxoday:', accessToken);
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
    console.log('Réponse brute Xoxoday:', JSON.stringify(response.data, null, 2));
    res.json(response.data); // Pour debug, retourne tout
  } catch (err) {
    console.error('Erreur Xoxoday:', err.response?.data || err);
    res.status(500).json({ error: "Erreur lors de la récupération des marques Xoxoday", details: err.response?.data || err.message });
  }
}