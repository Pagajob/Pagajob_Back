import { db } from '../connect.js';

export const getMessagesByConversation = async (req, res) => {
  const { conversationId } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT * FROM messages WHERE conversationId = ? ORDER BY dateSend ASC",
      [conversationId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const sendMessage = async (req, res) => {
  const { conversationId, senderId, recipientId, text } = req.body;
  try {
    // 1. Enregistre le message
    await db.query(
      "INSERT INTO messages (conversationId, senderId, recipientId, text, dateSend, `read`) VALUES (?, ?, ?, ?, NOW(), 0)",
      [conversationId, senderId, recipientId, text]
    );

    // 2. Récupère le nom de l'expéditeur
    const [senderRows] = await db.query(
      "SELECT firstName, lastName FROM users WHERE id = ?",
      [senderId]
    );
    const senderName = senderRows.length
      ? `${senderRows[0].firstName} ${senderRows[0].lastName}`
      : "Un utilisateur";

    // 3. Crée la notification pour le destinataire
    await db.query(
      `INSERT INTO notifications (userId, type, message, conversationId, createdAt, \`read\`)
       VALUES (?, ?, ?, ?, NOW(), 0)`,
      [
        recipientId,
        'message',
        `${senderName} vous a envoyé un message !`,
        conversationId
      ]
    );

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

export const markMessagesAsRead = async (req, res) => {
  const { conversationId, userId } = req.body;
  try {
    await db.query(
      "UPDATE messages SET `read` = 1 WHERE conversationId = ? AND recipientId = ? AND `read` = 0",
      [conversationId, userId]
    );
    // Supprime la notification de message non lu pour cette conversation
    await db.query(
      "DELETE FROM notifications WHERE userId = ? AND type = 'message' AND conversationId = ?",
      [userId, conversationId]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};