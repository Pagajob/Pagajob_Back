import { db } from "../connect.js";
import jwt from "jsonwebtoken";
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { sendMailMissionComplete } from '../controllers/senderMail.js';
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;

// Configuration CORS pour autoriser le frontend
const corsOptions = {
  origin: FRONTEND_URL, // Ton frontend
  credentials: true,               // Permet l'envoi des cookies
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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


export const setMissions = async (req, res) => {
  try {
    // Vérification de l'utilisateur et du rôle avant de créer la mission
    await verifyTokenAndCompany(req, res, async () => {
      // Vérifier si la mission existe déjà
      const q = "SELECT * FROM missions WHERE title = ?";
      const [data] = await db.query(q, [req.body.title]);
      if (data.length) return res.status(409).json("Mission already exists!");
      
      const insertQuery = `
        INSERT INTO missions (
          companyId, title, description, budget, startMission, deadline, category,
          type, country, postalCode, city, adress, status, skills, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        req.body.companyId,
        req.body.title,
        req.body.description,
        req.body.budget,
        req.body.startMission ? new Date(req.body.startMission) : null,
        req.body.deadline ? new Date(req.body.deadline) : null,
        req.body.category,
        req.body.type,
        req.body.type !== 'remote' ? req.body.country : '',
        req.body.type !== 'remote'
          ? (req.body.postalCode !== '' ? parseInt(req.body.postalCode, 10) : null)
          : null,
        req.body.type !== 'remote' ? req.body.city : '',
        req.body.type !== 'remote' ? req.body.adress : '',
        req.body.status,
        req.body.skills,
        new Date()
      ];

      await db.query(insertQuery, values);
      return res.status(200).json("Mission has been created.");
    });
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const modifyMissions = async (req, res) => {
  try {
    await verifyTokenAndCompany(req, res, async () => {
      const { id } = req.params;
      const {
        title,
        description,
        budget,
        deadline,
        startMission,
        category,
        country,
        postalCode,
        city,
        adress,
        skills,
        type,
        status
      } = req.body;

      // Vérifier si la mission existe
      const missionQuery = "SELECT * FROM missions WHERE id = ?";
      const [mission] = await db.query(missionQuery, [id]);
      if (!mission.length) {
        return res.status(404).json("Mission not found.");
      }

      // Requête de mise à jour avec tous les champs pertinents
      const updateQuery = `
        UPDATE missions 
        SET 
          title = ?, 
          description = ?, 
          budget = ?, 
          deadline = ?, 
          startMission = ?, 
          category = ?, 
          country = ?, 
          postalCode = ?, 
          city = ?, 
          adress = ?, 
          skills = ?, 
          type = ?, 
          status = ?
        WHERE id = ?
      `;
      const values = [
        title || mission[0].title,
        description || mission[0].description,
        budget || mission[0].budget,
        deadline || mission[0].deadline,
        startMission || mission[0].startMission,
        category || mission[0].category,
        country || mission[0].country,
        postalCode || mission[0].postalCode,
        city || mission[0].city,
        adress || mission[0].adress,
        skills || mission[0].skills,
        type || mission[0].type,
        status || mission[0].status,
        id
      ];

      await db.query(updateQuery, values);
      return res.status(200).json("Mission has been updated.");
    });
  } catch (err) {
    return res.status(500).json(err);
  }
};


export const deleteMissions = async (req, res) => {
  try {
    // Vérification de l'utilisateur et du rôle avant de supprimer la mission
    await verifyTokenAndCompany(req, res, async () => {
      const { id } = req.params; // ID de la mission à supprimer

      // Vérifier si la mission existe
      const missionQuery = "SELECT * FROM missions WHERE id = ?";
      const [mission] = await db.query(missionQuery, [id]);
      if (!mission.length) {
        return res.status(404).json("Mission not found.");
      }

      // 1. Supprimer les candidatures liées à cette mission
      await db.query("DELETE FROM applications WHERE missionId = ?", [id]);
      // 2. Supprimer les conversations liées à cette mission
      await db.query("DELETE FROM conversations WHERE missionId = ?", [id]);
      // 3. Supprimer les fichiers liés à cette mission
      await db.query("DELETE FROM mission_files WHERE missionId = ?", [id]);
      // 4. Supprimer les notifications liées à cette mission
      await db.query("DELETE FROM notifications WHERE missionId = ?", [id]);
      // 5. Supprimer la mission
      await db.query("DELETE FROM missions WHERE id = ?", [id]);

      return res.status(200).json("Mission and all related data have been deleted.");
    });
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const getMissions = async (req, res) => {
  try {
    // JOIN pour récupérer le logo et le nom de l'entreprise + nombre de candidatures
    const { companyId } = req.query;
    const q = `
      SELECT 
        missions.*, 
        companies.logo AS companyLogo, 
        companies.name AS companyName,
        (SELECT COUNT(*) FROM applications WHERE missionId = missions.id) AS applicationsCount
      FROM missions
      LEFT JOIN companies ON missions.companyId = companies.id
      ${companyId ? 'WHERE missions.companyId = ?' : ''}
    `;
    const [missions] = companyId
      ? await db.query(q, [companyId])
      : await db.query(q);

    // Structure les données pour le front
    const missionsWithCompany = missions.map(mission => ({
      ...mission,
      companyInfo: {
        name: mission.companyName,
        logo: mission.companyLogo,
      }
    }));

    return res.status(200).json(missionsWithCompany);
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const getMissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT 
        missions.*, 
        companies.name AS companyName, 
        companies.logo AS companyLogo
      FROM missions
      LEFT JOIN companies ON missions.companyId = companies.id
      WHERE missions.id = ?
    `;
    const [missions] = await db.query(q, [id]);
    if (!missions.length) return res.status(404).json("Mission not found.");
    // Structure pour le front
    const mission = {
      ...missions[0],
      companyInfo: {
        name: missions[0].companyName,
        logo: missions[0].companyLogo,
      }
    };
    return res.status(200).json(mission);
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const getMissionFiles = async (req, res) => {
  try {
    const { id } = req.params; 
    const [files] = await db.query(
      "SELECT id, name, url, uploadedAt FROM mission_files WHERE missionId = ?",
      [id]
    );
    res.status(200).json(files);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const updateMissionStatus = async (req, res) => {
  const { missionId, status } = req.body;
  try {
    await db.query(
      'UPDATE missions SET status = ? WHERE id = ?',
      [status, missionId]
    );

    // Si la mission passe en "in_progress", effectue le transfert
    if (status === "in_progress") {
      // Récupère la mission et l'application acceptée
      const [[mission]] = await db.query("SELECT * FROM missions WHERE id = ?", [missionId]);
      const [[application]] = await db.query(
        "SELECT * FROM applications WHERE missionId = ? AND status = 'accepted' LIMIT 1",
        [missionId]
      );
      if (mission && application) {
        const companyId = mission.companyId;
        const title = mission.title;
        const studentId = application.usersId;
        const amount = Number(mission.budget) * 0.9;
        let iduser = null;

        const [rows] = await db.query("SELECT iduser FROM companies WHERE id = ?", [companyId]);
        if (rows.length > 0) {
          iduser = rows[0].iduser;
        }

        // Débite le wallet de l'entreprise
        await db.query(
          "UPDATE wallets SET balance = balance - ? WHERE userId = ?",
          [amount, iduser]
        );
        // Ajoute le montant en pending dans le wallet de l'entreprise
        await db.query(
          "UPDATE wallets SET pending = pending + ? WHERE userId = ?",
          [amount, iduser]
        );
        // Transaction entreprise
        await db.query(
          "INSERT INTO wallet_transactions (walletId, type, amount, missionId, description, createdAt) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'transfer_comp_stud_pend_out', ?, ?, 'Transfère du montant de la mission en pending', ?)",
          [iduser, amount, missionId, new Date()]
        );
        // Ajoute le montant en pending dans le wallet de l'étudiant
        await db.query(
          "UPDATE wallets SET pending = pending + ? WHERE userId = ?",
          [amount, studentId]
        );
        // Transaction pending étudiant
        await db.query(
          "INSERT INTO wallet_transactions (walletId, type, amount, missionId, description, createdAt) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'transfer_comp_stud_pend_in', ?, ?, ?, ?)",
          [studentId, amount, missionId, `Montant en attente de la fin de mission - ${title}`, new Date()]
        );
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut de la mission." });
  }
};

export const validateMissionCompany = async (req, res) => {
  const { missionId, companyId } = req.body;
  try {

    // Met à jour la colonne "companyValidated"
    await db.query(
      'UPDATE missions SET companyValidated = 1 WHERE id = ? AND companyId = ?',
      [missionId, companyId]
    );

    // Récupère l'id de l'étudiant (user) lié à cette mission
    const [appRows] = await db.query(
      'SELECT usersId FROM applications WHERE missionId = ? AND status = "accepted" LIMIT 1',
      [missionId]
    );
    if (appRows.length) {
      const studentUserId = appRows[0].usersId;

      // Récupère le legalName de la société
      const [companyRows] = await db.query(
        'SELECT legalName FROM companies WHERE id = ? LIMIT 1',
        [companyId]
      );
      const legalName = companyRows.length ? companyRows[0].legalName : '';

      // Crée la notification pour l'étudiant avec le nom de l'entreprise
      await db.query(
        `INSERT INTO notifications (userId, type, missionId, companyId, \`read\`, createdAt, message)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [
          studentUserId,
          'mission_validated_by_company',
          missionId,
          companyId,
          new Date(),
          `L'entreprise ${legalName} a validé la mission. Vous pouvez la clôturer si ce n'est pas déjà fait.`
        ]
      );
    }
    // Vérifie si l'étudiant a aussi validé
    const [rows] = await db.query(
      'SELECT studentValidated FROM missions WHERE id = ?', [missionId]
    );
    if (rows.length && rows[0].studentValidated) {

      await db.query(
        'UPDATE missions SET status = "complete" WHERE id = ?', [missionId]
      );

      // Libération du paiement ici aussi
      const [[application]] = await db.query(
        "SELECT usersId FROM applications WHERE missionId = ? AND status = 'accepted' LIMIT 1",
        [missionId]
      );

      await db.query(
        'UPDATE applications SET status = "completed" WHERE missionId = ? AND status = "accepted"',
        [missionId]
      );
      if (application) {
        const studentUserId = application.usersId;
        const [[mission]] = await db.query('SELECT budget, title FROM missions WHERE id = ?', [missionId]);
        const amount = Number(mission.budget) * 0.9;
        const missionTitle = mission.title;

        const [res1] = await db.query(
          "UPDATE wallets SET balance = balance + ?, pending = pending - ? WHERE userId = ?",
          [amount, amount, studentUserId]
        );

        let iduser = null;
        const [rows] = await db.query("SELECT idUser FROM companies WHERE id = ?", [companyId]);
        if (rows.length > 0) {
          iduser = rows[0].idUser;
        }

        const [res2] = await db.query(
          "UPDATE wallets SET pending = pending - ? WHERE userId = ?",
          [amount, iduser]
        );

        const [res3] = await db.query(
          "INSERT INTO wallet_transactions (walletId, type, amount, missionId, description, createdAt) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'release', ?, ?, ?, ?)",
          [studentUserId, amount, missionId, `Libération du paiement mission terminée - ${missionTitle}`, new Date()]
        );

        const [res4] = await db.query(
          "INSERT INTO wallet_transactions (walletId, type, amount, missionId, description, createdAt) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'release', ?, ?, ?, ?)",
          [iduser, amount, missionId, `Libération du paiement mission terminée - ${missionTitle}`, new Date()]
        );

        const [res5] = await db.query(
          "DELETE FROM wallet_transactions WHERE missionId = ? AND type IN ('transfer_comp_stud_pend_out', 'transfer_comp_stud_pend_in')",
          [missionId]
        );
      }
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

export const validateMissionStudent = async (req, res) => {
  const { missionId, userId } = req.body;
  try {

    // Met à jour la colonne "studentValidated"
    await db.query(
      'UPDATE missions SET studentValidated = 1 WHERE id = ?', [missionId]
    );

    // Récupère l'id de la société liée à cette mission
    const [appRows] = await db.query(
      'SELECT companyId FROM missions WHERE id = ? LIMIT 1',
      [missionId]
    );

    let companyUserId = null;
    if (appRows.length) {
      // Il faut l'id du user entreprise, pas l'id de la société
      const [companyUser] = await db.query(
        'SELECT idUser FROM companies WHERE id = ? LIMIT 1',
        [appRows[0].companyId]
      );
      if (companyUser.length) {
        companyUserId = companyUser[0].idUser;
        // Crée la notification pour l'entreprise
        await db.query(
          `INSERT INTO notifications (userId, type, missionId, companyId, \`read\`, createdAt, message)
           VALUES (?, ?, ?, ?, 0, ?, ?)`,
          [
            companyUserId,
            'mission_validated_by_student',
            missionId,
            appRows[0].companyId,
            new Date(),
            "L'étudiant a validé la mission. Vous pouvez la clôturer si ce n'est pas déjà fait."
          ]
        );
      }
    }

    // Vérifie si la société a aussi validé
    const [rows] = await db.query(
      'SELECT companyValidated FROM missions WHERE id = ?', [missionId]
    );

    if (rows.length && rows[0].companyValidated) {

      await db.query(
        'UPDATE missions SET status = "complete" WHERE id = ?', [missionId]
      );

      // Libération du paiement ici aussi (copie la logique de validateMissionCompany)
      const [[application]] = await db.query(
        "SELECT usersId FROM applications WHERE missionId = ? AND status = 'accepted' LIMIT 1",
        [missionId]
      );

      await db.query(
        'UPDATE applications SET status = "completed" WHERE missionId = ? AND status = "accepted"',
        [missionId]
      );

      if (application) {
        const studentUserId = application.usersId;
        const [[mission]] = await db.query('SELECT budget, title, companyId FROM missions WHERE id = ?', [missionId]);
        const amount = Number(mission.budget) * 0.9;
        const missionTitle = mission.title;

        const [res1] = await db.query(
          "UPDATE wallets SET balance = balance + ?, pending = pending - ? WHERE userId = ?",
          [amount, amount, studentUserId]
        );

        const [res2] = await db.query(
          "INSERT INTO wallet_transactions (walletId, type, amount, missionId, description, createdAt) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'release', ?, ?, ?, ?)",
          [studentUserId, amount, missionId, `Libération du paiement mission terminée - ${missionTitle}`, new Date()]
        );

        // Débiter le pending de la company
        let iduser = null;
        const [companyRows] = await db.query("SELECT idUser FROM companies WHERE id = ?", [mission.companyId]);
        if (companyRows.length > 0) {
          iduser = companyRows[0].idUser;
          const [res3] = await db.query(
            "UPDATE wallets SET pending = pending - ? WHERE userId = ?",
            [amount, iduser]
          );

          const [res4] = await db.query(
            "INSERT INTO wallet_transactions (walletId, type, amount, missionId, description, createdAt) VALUES ((SELECT id FROM wallets WHERE userId = ?), 'release', ?, ?, ?, ?)",
            [iduser, amount, missionId, `Libération du paiement mission terminée - ${missionTitle}`, new Date()]
          );

          const [res5] = await db.query(
            "DELETE FROM wallet_transactions WHERE missionId = ? AND type IN ('transfer_comp_stud_pend_out', 'transfer_comp_stud_pend_in')",
            [missionId]
          );

          const [user] = await db.query('SELECT email, firstName FROM users WHERE id = ?', [studentUserId]);

          //envoi du mail mission complete
          await sendMailMissionComplete(user[0].email, user[0].firstName , missionTitle, amount);

        }
      }
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Nouvelle route pour initier le paiement et stocker la mission en brouillon
export const initiateMissionPayment = async (req, res) => {
  try {
    // 1. Stocke la mission en "draft" (ou dans une table temporaire)
    const {
      companyId, title, description, budget, startMission, deadline, category,
      type, country, postalCode, city, adress, status, skills
    } = req.body;

    const postalCodeValue =
      type !== 'remote'
        ? (postalCode !== '' && postalCode !== undefined && postalCode !== null
            ? parseInt(postalCode, 10)
            : null)
        : null;

    // Insère la mission en statut "draft" et paymentStatus "pending"
    const [result] = await db.query(
      `INSERT INTO missions (companyId, title, description, budget, startMission, deadline, category,
        type, country, postalCode, city, adress, status, skills, paymentStatus, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        title,
        description,
        budget,
        startMission,
        deadline,
        category,
        type,
        type !== 'remote' ? country : '',
        postalCodeValue,
        type !== 'remote' ? city : '',
        type !== 'remote' ? adress : '',
        'draft',
        skills,
        'pending',
        new Date() // Ajoute la date du jour ici
      ]
    );
    const tempMissionId = result.insertId;

    // 2. Crée le PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(budget) * 100), // en centimes
      currency: 'eur',
      metadata: { tempMissionId: tempMissionId.toString() }
    });

    // 3. Stocke l'id Stripe dans la mission
    await db.query(
      "UPDATE missions SET stripePaymentIntentId = ? WHERE id = ?",
      [paymentIntent.id, tempMissionId]
    );

    res.json({ clientSecret: paymentIntent.client_secret, tempMissionId });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'initiation du paiement" });
  }
};

export const payMission = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Récupère la mission
    const [missions] = await db.query("SELECT * FROM missions WHERE id = ?", [id]);
    if (!missions.length) return res.status(404).json({ error: "Mission introuvable." });

    const mission = missions[0];

    // 2. Vérifie que la mission est en draft (non payée)
    if (mission.status !== 'draft') {
      return res.status(400).json({ error: "Mission déjà payée ou non éligible au paiement." });
    }

    // 3. Crée un PaymentIntent Stripe (ou récupère l'existant)
    let paymentIntentId = mission.stripePaymentIntentId;
    let paymentIntent;

    if (paymentIntentId) {
      // Récupère le PaymentIntent existant
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      // Si le PaymentIntent est annulé ou payé, en crée un nouveau
      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'canceled') {
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(Number(mission.budget) * 100),
          currency: 'eur',
          metadata: { tempMissionId: mission.id.toString() }
        });
        paymentIntentId = paymentIntent.id;
        await db.query(
          "UPDATE missions SET stripePaymentIntentId = ? WHERE id = ?",
          [paymentIntentId, mission.id]
        );
      }
    } else {
      // Crée un nouveau PaymentIntent
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(Number(mission.budget) * 100),
        currency: 'eur',
        metadata: { tempMissionId: mission.id.toString() }
      });
      paymentIntentId = paymentIntent.id;
      await db.query(
        "UPDATE missions SET stripePaymentIntentId = ? WHERE id = ?",
        [paymentIntentId, mission.id]
      );
    }
    // 4. Retourne le client_secret au front
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'initialisation du paiement Stripe." });
  }
};

export const refundMission = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Récupère la mission
    const [missions] = await db.query("SELECT * FROM missions WHERE id = ?", [id]);
    if (!missions.length) return res.status(404).json({ error: "Mission introuvable." });

    const mission = missions[0];

    // 2. Vérifie que la mission est payée
    if (mission.paymentStatus !== 'paid') {
      return res.status(400).json({ error: "Mission non payée, remboursement impossible." });
    }

    // 3. Récupère le PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      mission.stripePaymentIntentId,
      { expand: ['charges'] }
    );
    let chargeId = null;
    if (
      paymentIntent.charges &&
      paymentIntent.charges.data &&
      paymentIntent.charges.data.length
    ) {
      chargeId = paymentIntent.charges.data[0].id;
    } else if (paymentIntent.latest_charge) {
      chargeId = paymentIntent.latest_charge;
    } else {
      return res.status(400).json({ error: "Aucune charge Stripe trouvée pour ce paiement. Impossible de rembourser." });
    }

    // 4. Calcule le montant à rembourser (90%)
    const refundAmount = Math.round(Number(mission.budget) * 0.95 * 100); // en centimes

    // 5. Crée le remboursement Stripe
    await stripe.refunds.create({
      charge: chargeId,
      amount: refundAmount,
      metadata: { missionId: mission.id.toString() }
    });

    // 6. Mets à jour la mission (statut temporaire, le webhook confirmera)
    await db.query(
      "UPDATE missions SET paymentStatus = 'refunding', status = 'refunding' WHERE id = ?",
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors du remboursement Stripe." });
  }
};