import { db } from "../connect.js";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;

// Configuration CORS pour autoriser le frontend
const corsOptions = {
  origin: FRONTEND_URL, // Ton frontend
  credentials: true,               
};


// Fonction pour vérifier si un utilisateur est authentifié et est une entreprise
const verifyTokenAndCompany = async (req, res, next) => {
  // Récupérer le token depuis les cookies
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(403).json("Token is missing or invalid!");
  }

  try {
    // Vérification du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Décoder le token
    req.userId = decoded.id; // Stocker l'id de l'utilisateur dans la requête pour l'utiliser plus tard

    // Vérifier si l'utilisateur est une entreprise
    const query = "SELECT * FROM users WHERE id = ? AND role = 'company'"; // Vérifier le rôle dans la base de données
    const [user] = await db.query(query, [req.userId]);

    if (!user) {
      return res.status(403).json("Access denied: You must be a company to create a mission.");
    }

    next(); // Passer à la fonction suivante si l'utilisateur est authentifié et est une entreprise
  } catch (err) {
    return res.status(500).json("Failed to authenticate token.");
  }
};

export const getApplicationStatus = async (req, res) => {
  const { missionId, userId } = req.query;
  try {
    const [rows] = await db.query(
      "SELECT status FROM applications WHERE missionId = ? AND usersId = ?",
      [missionId, userId]
    );
    if (!rows.length) return res.json({ hasApplied: false });
    return res.json({ hasApplied: true, status: rows[0].status });
  } catch (err) {
    res.status(500).json(err);
  }
};

export const countApplicationsThisMonth = async (req, res) => {
  const { userId } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count FROM applications
       WHERE usersId = ? AND appliedAt >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
      [userId]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    res.status(500).json(err);
  }
};

export const applyToMission = async (req, res) => {
  const { missionId, userId } = req.body;
  try {
    // Récupère le companyId de la mission
    const [missions] = await db.query(
      "SELECT companyId FROM missions WHERE id = ?",
      [missionId]
    );
    if (!missions.length) return res.status(404).json({ error: "Mission introuvable." });
    const companyId = missions[0].companyId;

    // Vérifie si déjà postulé
    const [existing] = await db.query(
      "SELECT id FROM applications WHERE missionId = ? AND usersId = ?",
      [missionId, userId]
    );
    if (existing.length) return res.status(400).json({ error: "Déjà postulé à cette mission." });

    // Récupère l'id du user entreprise (responsable)
    const [company] = await db.query(
      "SELECT idUser FROM companies WHERE id = ?",
      [companyId]
    );
    const companyUserId = company.length ? company[0].idUser : null;

    // Insère la candidature et récupère son id
    const [result] = await db.query(
      "INSERT INTO applications (companyId, missionId, usersId, appliedAt, status) VALUES (?, ?, ?, NOW(), 'pending')",
      [companyId, missionId, userId]
    );
    const applicationId = result.insertId;

    // Crée une notification pour l'entreprise (userId = idUser de la company)
    await db.query(
      `INSERT INTO notifications (userId, type, applicationId, missionId, companyId, \`read\`, createdAt, message)
       VALUES (?, ?, ?, ?, ?, 0, NOW(), ?)`,
      [
        companyUserId, // <-- ici c'est bien l'id du user entreprise
        'application',
        applicationId,
        missionId,
        companyId,
        `Un étudiant a postulé à votre mission !`
      ]
    );

    // Après avoir inséré la candidature et récupéré applicationId, companyId, userId, missionId
    // Vérifie si la conversation existe déjà
    const [existingConv] = await db.query(
      "SELECT id FROM conversations WHERE missionId = ? AND FIND_IN_SET(?, participants)",
      [missionId, userId]
    );
    if (!existingConv.length) {
      // Récupère l'id du user entreprise (responsable)
      const [company] = await db.query(
        "SELECT idUser FROM companies WHERE id = ?",
        [companyId]
      );
      const companyUserId = company.length ? company[0].idUser : null;

      // Crée la conversation
      await db.query(
        "INSERT INTO conversations (missionId, participants, createdAt) VALUES (?, ?, NOW())",
        [missionId, `${userId},${companyUserId}`]
      );
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

export const getCompanyApplications = async (req, res) => {
  const { companyId } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT 
        a.id, a.status, a.appliedAt, a.missionId,
        m.title AS missionTitle,
        m.description,
        m.startMission,
        m.deadline,
        m.budget,
        m.city,
        m.adress,
        m.type,
        m.status AS missionStatus,
        m.companyId,
        m.studentValidated,
        m.companyValidated,
        u.id AS studentId, u.firstName, u.lastName, u.email, u.profilPic AS avatar,
        (SELECT COUNT(*) FROM applications a2 
          WHERE a2.usersId = u.id AND a2.status = 'completed') AS completedMissions,
        u.skills,
        s.school, s.degree, s.fieldOfStudy, s.graduationYear
      FROM applications a
      JOIN missions m ON a.missionId = m.id
      JOIN users u ON a.usersId = u.id
      LEFT JOIN students s ON s.idUser = u.id
      WHERE m.companyId = ?
      ORDER BY a.appliedAt DESC`,
      [companyId]
    );

    const applications = rows.map(row => ({
      id: row.id,
      status: row.status,
      appliedAt: row.appliedAt,
      missionId: row.missionId,
      mission: {
        title: row.missionTitle,
        description: row.description,
        startMission: row.startMission,
        deadline: row.deadline,
        budget: row.budget,
        city: row.city,
        adress: row.adress,
        type: row.type,
        status: row.missionStatus,
        companyId: row.companyId,
        studentValidated: !!row.studentValidated,
        companyValidated: !!row.companyValidated,
      },
      student: {
        id: row.studentId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        avatar: row.avatar,
        completedMissions: row.completedMissions || 0,
        skills: row.skills ? row.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        education: row.school ? {
          school: row.school,
          degree: row.degree,
          fieldOfStudy: row.fieldOfStudy,
          graduationYear: row.graduationYear
        } : undefined
      }
    }));

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des candidatures.' });
  }
};


export const updateApplicationStatus = async (req, res) => {
  const { applicationId, status } = req.body;
  try {
    await db.query(
      'UPDATE applications SET status = ? WHERE id = ?',
      [status, applicationId]
    );

    // Récupère l'id de l'étudiant et de la mission pour la notif
    const [rows] = await db.query(
      'SELECT usersId, missionId, companyId FROM applications WHERE id = ?',
      [applicationId]
    );
    if (rows.length) {
      const { usersId, missionId, companyId } = rows[0];
      let legalName = null;

      const [legalName2] = await db.query("SELECT legalName FROM companies WHERE id = ?", [companyId]);
      if (legalName2.length > 0) {
        legalName = legalName2[0].legalName;
      } 
      await db.query(
        `INSERT INTO notifications (userId, type, applicationId, missionId, companyId, \`read\`, createdAt, message)
         VALUES (?, ?, ?, ?, ?, 0, NOW(), '${legalName} a accepté votre candidature à la mission !')`,
        [
          usersId,
          status === 'accepted' ? 'application' : 'rejected', 
          applicationId,
          missionId,
          companyId
        ]
      );
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut de la candidature." });
  }
};

export const getStudentApplications = async (req, res) => {
  const { userId } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT 
        a.id, a.status, a.appliedAt, a.missionId,
        m.title AS missionTitle,
        m.description,
        m.startMission,
        m.deadline,
        m.budget,
        m.city,
        m.adress,
        m.type,
        m.status AS missionStatus,
        m.companyId,
        m.studentValidated,
        m.companyValidated,
        c.name AS companyName,
        c.logo AS companyLogo
      FROM applications a
      JOIN missions m ON a.missionId = m.id
      LEFT JOIN companies c ON m.companyId = c.id
      WHERE a.usersId = ?
      ORDER BY a.appliedAt DESC`,
      [userId]
    );
    // Structure pour le front
    const applications = rows.map(row => ({
      id: row.id,
      status: row.status,
      appliedAt: row.appliedAt,
      missionId: row.missionId,
      mission: {
        title: row.missionTitle,
        description: row.description,
        startMission: row.startMission,
        deadline: row.deadline,
        budget: row.budget,
        city: row.city,
        adress: row.adress,
        type: row.type,
        status: row.missionStatus,
        companyId: row.companyId,
        studentValidated: !!row.studentValidated,
        companyValidated: !!row.companyValidated,
        companyName: row.companyName,
        companyLogo: row.companyLogo,
      }
    }));
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des candidatures." });
  }
};


export const getApplicationsByMission = async (req, res) => {
  const { missionId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.status, a.appliedAt, u.firstName AS studentName, u.email AS studentEmail
       FROM applications a
       JOIN users u ON a.usersId = u.id
       WHERE a.missionId = ?`,
      [missionId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des candidatures." });
  }
};