import { db } from '../connect.js';

export const getWalletByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    // Récupère le wallet
    const [walletRows] = await db.query("SELECT id, balance, pending FROM wallets WHERE userId = ?", [userId]);
    if (!walletRows.length) return res.status(404).json({ error: "Wallet non trouvé" });
    const wallet = walletRows[0];

    // Calcule les revenus totaux et missions complétées
    const [statsRows] = await db.query(
      "SELECT IFNULL(SUM(amount),0) as totalEarnings, SUM(type = 'release') as completedMissions FROM wallet_transactions WHERE walletId = ? AND (type = 'release' OR type = 'referral')",
      [wallet.id]
    );
    const stats = statsRows[0];

    res.json({
      balance: wallet.balance,
      pending: wallet.pending,
      totalEarnings: Number(stats.totalEarnings) || 0,
      completedMissions: Number(stats.completedMissions) || 0
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération du wallet" });
  }
};



export const getWalletTransactions = async (req, res) => {
  const { userId } = req.params;
  try {
    // Récupère l'id du wallet de l'utilisateur
    const [walletRows] = await db.query("SELECT id FROM wallets WHERE userId = ?", [userId]);
    if (!walletRows.length) return res.json([]);
    const walletId = walletRows[0].id;

    // Récupère les transactions
    const [rows] = await db.query(
      "SELECT * FROM wallet_transactions WHERE walletId = ? ORDER BY createdAt DESC",
      [walletId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des transactions" });
  }
};
