import { db } from '../connect.js';
import bcrypt from "bcryptjs";
import { abonnementPaid } from "../mailTemplates/abonnementPaid.js";
import { abonnementExpire } from "../mailTemplates/abonnementExpire.js";
import { sendMail } from "./utils.js";

const FRONTEND_URL = process.env.FRONTEND_URL;

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
  if (priceId === 'price_1RJyD4IobxwiEFS3v9BmlSu3') subscriptionTier = 'boost';
  if (priceId === 'price_1RJyDaIobxwiEFS36lrAIFnI') subscriptionTier = 'elite';

  // Mets à jour la colonne subscriptionTier dans la table users
  await db.query(
    'UPDATE users SET subscriptionTier = ?, subscriptionId = ? WHERE id = ?',
    [subscriptionTier, subscriptionId, userId]
  );
};

export const sendMailUserSubscription = async (userId, priceId) => {
  // Mappe priceId vers le nom du tier
  let subscriptionTier = 'free';
  let percentage = '0%';
  if (priceId === 'price_1RJyD4IobxwiEFS3v9BmlSu3') subscriptionTier = 'boost';
  if (priceId === 'price_1RJyDaIobxwiEFS36lrAIFnI') subscriptionTier = 'elite';
  if (subscriptionTier === 'boost') percentage = '15%'; 
  if (subscriptionTier === 'elite') percentage = '30%';

  const [[user]] = await db.query("SELECT email, firstName FROM users WHERE id = ?", [userId]);
  
  const mail = abonnementPaid({ firstName: user.firstName, subscriptionTier: subscriptionTier, percentage: percentage });
  await sendMail({
    to: user.email,
    subject: mail.subject,
    html: mail.html
  });
};

export const sendMailUserSubscriptionExpire = async (email, firstName) => {
  
  const mail = abonnementExpire({ firstName: firstName, renewalLink: `${FRONTEND_URL}/subscriptions` });
  await sendMail({
    to: email,
    subject: mail.subject,
    html: mail.html
  });
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

export const changePassword = async (req, res) => {
  const { userId } = req.body; 
  const { oldPassword, newPassword } = req.body;

  try {
    // Récupère l'utilisateur
    const [users] = await db.query("SELECT password FROM users WHERE id = ?", [userId]);
    if (!users.length) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const user = users[0];

    // Vérifie l'ancien mot de passe
    const isPasswordCorrect = bcrypt.compareSync(oldPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Ancien mot de passe incorrect" });
    }

    // Hash le nouveau mot de passe
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    // Mets à jour le mot de passe
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    res.json({ success: true, message: "Mot de passe modifié avec succès" });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors du changement de mot de passe" });
  }
};
