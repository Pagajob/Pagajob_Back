// api/controllers/ambassador.js
import { db } from '../connect.js';
import { getReferralDashboard } from './referral.js';

// Utilitaire pour récupérer les stats de parrainage SANS res.json
async function getReferralDashboardRaw(userId) {
  // 1. Récupère le code de parrainage de l'utilisateur
  const [[user]] = await db.query(
    `SELECT referralCode FROM users WHERE id = ?`,
    [userId]
  );
}
  // 2. Récupère la liste des filleuls
  const [referrals] = await db.query(
    `SELECT u.id, u.firstName, u.lastName, u.email, u.subscriptionTier, u.createdAt
     FROM users u
     WHERE u.referredBy = ?`, [userId]
  );

  // 3. Pour chaque filleul, récupère ses gains générés pour le parrain
  for (let ref of referrals) {
    // Statut actif si il a un abonnement payant
    ref.status = (ref.subscriptionTier === 'boost' || ref.subscriptionTier === 'elite') ? 'active' : 'pending';
    // Gains générés pour ce filleul
    const [[earn]] = await db.query(
      `SELECT IFNULL(SUM(amount),0) as earnings
       FROM referral_earnings
       WHERE referrerId = ? AND referredId = ?`,
      [userId, ref.id]
    );
    ref.earnings = Number(earn.earnings || 0);
    ref.name = `${ref.firstName} ${ref.lastName}`;
    ref.subscription = ref.subscriptionTier;
    ref.joinedDate = ref.createdAt;
  }

  // 4. Statistiques globales
  // Gains totaux
  const [[totalEarn]] = await db.query(
    `SELECT IFNULL(SUM(amount),0) as totalEarnings FROM referral_earnings WHERE referrerId = ?`,
    [userId]
  );
  // Filleuls actifs
  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  // Filleuls en attente
  const pendingReferrals = referrals.filter(r => r.status !== 'active').length;
  // Gains du mois en cours
  const [[monthlyEarn]] = await db.query(
    `SELECT IFNULL(SUM(amount),0) as monthlyEarnings
     FROM referral_earnings
     WHERE referrerId = ? AND MONTH(createdAt) = MONTH(NOW()) AND YEAR(createdAt) = YEAR(NOW())`,
    [userId]
  );

  return {
    referralCode: user.referralCode,
    stats: {
      totalEarnings: Number(totalEarn.totalEarnings || 0),
      activeReferrals,
      pendingReferrals,
      monthlyEarnings: Number(monthlyEarn.monthlyEarnings || 0)
    },
    referrals
  };
}

export const getAmbassadorStats = async (req, res) => {
  const userId = req.userId;

  // 1. Stats de parrainage et filleuls
  const referralData = await getReferralDashboardRaw(userId);

  // 2. Commissions boost/elite/missions
  const [[boostCommissions]] = await db.query(
    `SELECT IFNULL(SUM(amount),0) as total FROM referral_earnings WHERE referrerId = ? AND subscriptionType = 'boost'`,
    [userId]
  );
  const [[eliteCommissions]] = await db.query(
    `SELECT IFNULL(SUM(amount),0) as total FROM referral_earnings WHERE referrerId = ? AND subscriptionType = 'elite'`,
    [userId]
  );
  // Missions : si tu as une table dédiée, adapte ici. Sinon, laisse à 0 ou adapte la requête.
  const [[missionCommissions]] = await db.query(
    `SELECT IFNULL(SUM(amount),0) as total FROM wallet_transactions WHERE walletId = (SELECT id FROM wallets WHERE userId = ?) AND type = 'release'`,
    [userId]
  );

  // 3. Historique de paiements ambassadeur
  const [paymentHistory] = await db.query(
    `SELECT id, amount, createdAt, status FROM wallet_transactions WHERE walletId = (SELECT id FROM wallets WHERE userId = ?) AND type IN ('referral', 'release') ORDER BY createdAt DESC LIMIT 20`,
    [userId]
  );

  // 4. Coordonnées bancaires
  const [[bankDetails]] = await db.query(
    `SELECT accountHolder, iban, bic, paypalEmail FROM users WHERE id = ?`,
    [userId]
  );

  // 5. Données pour le chart (gains par mois sur 6 mois)
  const [chartData] = await db.query(
    `SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, SUM(amount) as commissions
     FROM referral_earnings
     WHERE referrerId = ?
     GROUP BY month
     ORDER BY month DESC
     LIMIT 6`,
    [userId]
  );

  res.json({
    boostCommissions: Number(boostCommissions.total || 0),
    eliteCommissions: Number(eliteCommissions.total || 0),
    missionCommissions: Number(missionCommissions.total || 0),
    chartData: chartData.reverse(), // pour avoir du plus ancien au plus récent
    leads: referralData.referrals,
    paymentHistory,
    bankDetails,
    referralCode: referralData.referralCode,
    stats: referralData.stats
  });
};