import { db } from '../connect.js';

export const getUser = async (req, res) => {   
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [req.params.userId]);
        if (!rows.length) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const setUser = async (req, res) => {
  const {
    idUser,
    firstName,
    lastName,
    birthDate,
    city,
    country,
    phone,
    profilPic, 
    iban,
    accountHolder
  } = req.body;

  // Vérifie que tous les champs requis sont présents
  try {
    await db.query(
      `UPDATE users SET firstName = ?, lastName = ?, birthDate = ?, city = ?, country = ?, phone = ?, profilPic = ?, iban = ?, accountHolder = ? WHERE id = ?`,
      [firstName, lastName, birthDate, city, country, phone, profilPic, iban, accountHolder, idUser]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil étudiant." });
  }
};

export const updateUserSubscription = async (userId, priceId, subscriptionId) => {
  // Mappe priceId vers le nom du tier
  let subscriptionTier = 'free';
  if (priceId === 'price_1ROhcAIiItaN4R7RYMQ62BAa') subscriptionTier = 'boost';
  if (priceId === 'price_1ROhcQIiItaN4R7R37SHV89v') subscriptionTier = 'elite';

  // Mets à jour la colonne subscriptionTier dans la table users
  await db.query(
    'UPDATE users SET subscriptionTier = ?, subscriptionId = ? WHERE id = ?',
    [subscriptionTier, subscriptionId, userId]
  );
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    // Récupère l'utilisateur
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!users.length) return res.status(404).json("User not found");
    const user = users[0];

    // Si c'est une entreprise, récupère le logo
    if (user.role === 'company') {
      const [companies] = await db.query("SELECT logo FROM companies WHERE idUser = ?", [id]);
      if (companies.length) {
        user.logo = companies[0].logo;
      }
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const getUserWithLogo = async (req, res) => {
  const { userId } = req.params;
  try {
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (!users.length) return res.status(404).json("User not found");
    const user = users[0];
    if (user.role === 'company') {
      const [companies] = await db.query("SELECT logo FROM companies WHERE idUser = ?", [userId]);
      if (companies.length) {
        user.logo = companies[0].logo;
      }
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json(err);
  }
};
