import { db } from '../connect.js';

// Récupérer une conversation par mission et user, AVEC le titre de la mission
export const getConversationByMissionAndUser = async (req, res) => {
  const { missionId, userId } = req.query;
  try {
    // Jointure pour récupérer le titre de la mission
    const [rows] = await db.query(
      `SELECT c.*, m.title AS missionTitle
       FROM conversations c
       LEFT JOIN missions m ON c.missionId = m.id
       WHERE c.missionId = ? AND FIND_IN_SET(?, c.participants)`,
      [missionId, userId]
    );
    if (!rows.length) return res.json({ conversationExists: false });

    // Trouve l'autre participant
    const participants = rows[0].participants.split(',').map(Number);
    const otherUserId = participants.find(id => id !== Number(userId));

    return res.json({
      conversationExists: true,
      conversationId: rows[0].id,
      otherUserId,
      missionTitle: rows[0].missionTitle // <-- Ajouté ici
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Pour la liste des conversations d'un user, fais aussi la jointure
export const getConversationsByUser = async (req, res) => {
  const { userId } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT c.*, m.title AS missionTitle, m.status AS missionStatus,
        (SELECT MAX(dateSend) FROM messages WHERE conversationId = c.id) AS lastMessageDate
       FROM conversations c
       LEFT JOIN missions m ON c.missionId = m.id
       WHERE FIND_IN_SET(?, c.participants)
       ORDER BY lastMessageDate DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const deleteConversation = async (req, res) => {
  const { conversationId } = req.params;
  try {
    // Supprime d'abord les messages liés à la conversation
    await db.query("DELETE FROM messages WHERE conversationId = ?", [conversationId]);
    // Puis la conversation elle-même
    await db.query("DELETE FROM conversations WHERE id = ?", [conversationId]);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};