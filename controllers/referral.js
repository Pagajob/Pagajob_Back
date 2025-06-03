import { db } from '../connect.js';

export const getReferralDashboard = async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. Récupère le code de parrainage de l'utilisateur
    const [[user]] = await db.query(
      "SELECT referralCode FROM users WHERE id = ?", [userId]
    );
    if (!user) return res.status(404).json({ message: "User not found" });

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

    res.status(200).json({
      referralCode: user.referralCode,
      stats: {
        totalEarnings: Number(totalEarn.totalEarnings || 0),
        activeReferrals,
        pendingReferrals,
        monthlyEarnings: Number(monthlyEarn.monthlyEarnings || 0)
      },
      referrals
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Gère la commission de parrainage
export async function handleReferralCommission({ referredBy, userId, refTier, session }) {
  let percent = 0;
  if (refTier === 'boost') percent = 0.15;
  if (refTier === 'elite') percent = 0.30;

  if (percent > 0) {
    // Calcule le montant de la commission
    let subscriptionAmount = 0;
    if (session.amount_total) {
      subscriptionAmount = session.amount_total / 100;
    } else if (session.amount_paid) {
      subscriptionAmount = session.amount_paid / 100;
    } else if (session.amount_due) {
      subscriptionAmount = session.amount_due / 100;
    } else if (session.display_items && session.display_items[0]?.amount) {
      subscriptionAmount = session.display_items[0].amount / 100;
    } else if (session.lines?.data?.[0]?.amount_total) {
      subscriptionAmount = session.lines.data[0].amount_total / 100;
    } else if (session.total) {
      subscriptionAmount = session.total / 100;
    }

    const commission = Math.round(subscriptionAmount * percent * 100) / 100;

    const [walletRows] = await db.query('SELECT id FROM wallets WHERE userId = ?', [referredBy]);
    const walletId = walletRows[0]?.id;

    if (walletId && commission > 0) {
      // Récupère les infos du filleul
      const [filleulRows] = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [userId]);
      const filleul = filleulRows[0];
      const filleulName = filleul ? `${filleul.firstName} ${filleul.lastName}` : `Utilisateur #${userId}`;
      const description = `Parrainage : abonnement de ${filleulName} (id:${userId})`;

      await db.query(
        "INSERT INTO wallet_transactions (walletId, type, amount, description, createdAt) VALUES (?, 'referral', ?, ?, ?)",
        [walletId, commission, description, new Date()]
      );
      await db.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [commission, walletId]);
      await db.query(
        "INSERT INTO referral_earnings (referrerId, referredId, amount, subscriptionType, createdAt) VALUES (?, ?, ?, ?, NOW())",
        [referredBy, userId, commission, refTier]
      );
    }
    return walletId;
  }
  return null;
}

// Gère le bonus de 50€ pour boost/elite
export async function handleReferralBonus({ referredBy, walletId }) {
  // Vérifie le nombre de parrainages actifs
  const [activeReferralsRows] = await db.query(
    `SELECT COUNT(*) as activeCount
     FROM users
     WHERE referredBy = ? AND (subscriptionTier = 'boost' OR subscriptionTier = 'elite')`,
    [referredBy]
  );
  const activeCount = activeReferralsRows[0]?.activeCount || 0;

  // Vérifie si le bonus a déjà été attribué
  const [bonusRows] = await db.query(
    "SELECT id FROM wallet_transactions WHERE walletId = ? AND type = 'referral_bonus'",
    [walletId]
  );

  if (activeCount >= 5 && bonusRows.length === 0) {
    await db.query(
      "INSERT INTO wallet_transactions (walletId, type, amount, description, createdAt) VALUES (?, 'referral_bonus', 50, 'Bonus 5 parrainages actifs', NOW())",
      [walletId]
    );
    await db.query(
      "UPDATE wallets SET balance = balance + 50 WHERE id = ?",
      [walletId]
    );
  }
}

// Gère l'offre boost 2 mois pour les parrains free
export async function handleFreeToBoost({ referredBy }) {
  // Vérifie le nombre de parrainages actifs
  const [activeReferralsRows] = await db.query(
    `SELECT COUNT(*) as activeCount
     FROM users
     WHERE referredBy = ? AND (subscriptionTier = 'boost' OR subscriptionTier = 'elite')`,
    [referredBy]
  );
  const activeCount = activeReferralsRows[0]?.activeCount || 0;

  // Récupère le type d'abonnement du parrain
  const [refRows] = await db.query('SELECT subscriptionTier FROM users WHERE id = ?', [referredBy]);
  const refTier = refRows[0]?.subscriptionTier;

  // Récupère le walletId du parrain
  const [walletRows] = await db.query('SELECT id FROM wallets WHERE userId = ?', [referredBy]);
  const walletId = walletRows[0]?.id;

  // Vérifie si l'offre a déjà été attribuée
  const [offerRows] = await db.query(
    "SELECT id FROM wallet_transactions WHERE walletId = ? AND type = 'free_to_boost'",
    [walletId]
  );

  if (refTier === 'free' && activeCount >= 3 && offerRows.length === 0) {
    const boostExpiration = new Date();
    boostExpiration.setMonth(boostExpiration.getMonth() + 2);

    await db.query(
      "UPDATE users SET subscriptionTier = 'boost', boostExpiration = ? WHERE id = ?",
      [boostExpiration, referredBy]
    );
    // Trace dans wallet_transactions
    await db.query(
      "INSERT INTO wallet_transactions (walletId, type, amount, description, createdAt) VALUES (?, 'free_to_boost', 0, 'Offre Boost 2 mois offerte après 3 filleuls actifs', NOW())",
      [walletId]
    );
  }
}