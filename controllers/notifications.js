import { db } from "../connect.js";

// Créer une notification
export const createNotification = async (req, res) => {
  const {
    userId,
    type,
    applicationId = null,
    missionId = null,
    companyId = null,
    read = false
  } = req.body;
  try {
    await db.query(
      `INSERT INTO notifications (userId, type, applicationId, missionId, companyId, \`read\`, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, applicationId, missionId, companyId, read, new Date()]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Récupérer les notifications d'un utilisateur
export const getNotifications = async (req, res) => {
  const { userId } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT n.*, m.title AS missionTitle
       FROM notifications n
       LEFT JOIN missions m ON n.missionId = m.id
       WHERE n.userId = ?
       ORDER BY n.createdAt DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
};

// Marquer une notification comme lue
export const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE notifications SET `read` = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Marquer toutes les notifications comme lues pour un utilisateur
export const markAllAsRead = async (req, res) => {
  const { userId } = req.body;
  try {
    await db.query('UPDATE notifications SET `read` = 1 WHERE userId = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Supprimer une notification
export const deleteNotification = async (req, res) => {
  const { notificationId } = req.params;
  try {
    await db.query("DELETE FROM notifications WHERE id = ?", [notificationId]);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Supprimer toutes les notifications pour un utilisateur
export const deleteAllNotificationsForUser = async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query("DELETE FROM notifications WHERE userId = ?", [userId]);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};