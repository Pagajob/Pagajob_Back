import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const db = mysql.createPool({
  host: process.env.DB_HOST_PROD,
  user: process.env.DB_USER_PROD,
  password: process.env.DB_PASSWORD_PROD,
  database: process.env.DB_NAME_PROD,
  timezone: process.env.DB_TIMEZONE,
});

// teste la connexion :
db.getConnection()
  .then(conn => {
    console.log('Connexion MySQL réussie !');
    conn.release();
  })
  .catch(err => {
    console.error('Erreur de connexion MySQL :', err);
  });
