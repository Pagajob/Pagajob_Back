import { db } from "../connect.js";

export const setStudent = async (req, res) => {
  try {
    // Vérifie si l'étudiant existe déjà pour cet utilisateur
    const q = "SELECT * FROM students WHERE idUser = ?";
    const [data] = await db.query(q, [req.body.idUser]);

    if (data.length) {
      // Student existe => on fait une mise à jour
      const updateQuery = `
        UPDATE students SET
          school = ?,
          fieldOfStudy = ?,
          degree = ?,
          graduationYear = ?
        WHERE idUser = ?
      `;
      const updateValues = [
        req.body.school,
        req.body.fieldOfStudy,
        req.body.degree,
        req.body.graduationYear,
        req.body.idUser
      ];
      await db.query(updateQuery, updateValues);
      return res.status(200).json("Student has been updated.");
    } else {
      // Student n'existe pas => on insère
      const insertQuery = `
        INSERT INTO students
          (idUser, school, fieldOfStudy, degree, graduationYear)
        VALUES (?, ?, ?, ?, ?)
      `;
      const insertValues = [
        req.body.idUser,
        req.body.school,
        req.body.fieldOfStudy,
        req.body.degree,
        req.body.graduationYear
      ];
      await db.query(insertQuery, insertValues);
      return res.status(200).json("Student has been created.");
    }
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const getStudentByUserId = async (req, res) => {
  try {
    const { idUser } = req.params;
    const q = "SELECT * FROM students WHERE idUser = ?";
    const [data] = await db.query(q, [idUser]);

    if (data.length === 0) {
      return res.status(404).json("Student not found");
    }

    return res.status(200).json(data[0]);
  } catch (err) {
    return res.status(500).json(err);
  }
};

