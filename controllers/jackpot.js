import { db } from '../connect.js';

// GET /api/jackpot/eligible-users
export const getEligibleUsers = async (req, res) => {
  // Boost ou Elite
  const [[{ boostEliteCount }]] = await db.query(
    "SELECT COUNT(*) as boostEliteCount FROM users WHERE subscriptionTier IN ('boost', 'elite')"
  );
  // Free avec parrainage validé (exemple : 3 filleuls Boost/Elite OU 5 filleuls Free)
  const [[{ freeParrainCount }]] = await db.query(`
    SELECT COUNT(DISTINCT u.id) as freeParrainCount
    FROM users u
    LEFT JOIN users f ON f.referredBy = u.id
    WHERE u.subscriptionTier = 'free'
      AND (
        (SELECT COUNT(*) FROM users WHERE referredBy = u.id AND subscriptionTier IN ('boost', 'elite')) >= 3
        OR
        (SELECT COUNT(*) FROM users WHERE referredBy = u.id AND subscriptionTier = 'free') >= 5
      )
  `);
  res.json({ eligibleCount: boostEliteCount + freeParrainCount });
};

// GET /api/jackpot/is-eligible/:userId
export const isUserEligible = async (req, res) => {
  const { userId } = req.params;
  // Récupère le tier
  const [[user]] = await db.query("SELECT subscriptionTier FROM users WHERE id = ?", [userId]);
  if (!user) return res.json({ eligible: false });

  if (user.subscriptionTier === 'boost' || user.subscriptionTier === 'elite') {
    return res.json({ eligible: true, tier: user.subscriptionTier, participations: user.subscriptionTier === 'elite' ? 2 : 1 });
  }
  // Vérifie parrainage
  const [[{ boostEliteCount }]] = await db.query(
    "SELECT COUNT(*) as boostEliteCount FROM users WHERE referredBy = ? AND subscriptionTier IN ('boost', 'elite')",
    [userId]
  );
  const [[{ freeCount }]] = await db.query(
    "SELECT COUNT(*) as freeCount FROM users WHERE referredBy = ? AND subscriptionTier = 'free'",
    [userId]
  );
  if (boostEliteCount >= 3 || freeCount >= 5) {
    return res.json({ eligible: true, tier: 'free', participations: 1 });
  }
  return res.json({ eligible: false });
};