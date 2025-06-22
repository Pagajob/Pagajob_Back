import { db } from '../connect.js';
import dotenv from 'dotenv';
import { sendMail } from "./utils.js";
import { abonnementPaid } from "../mailTemplates/abonnementPaid.js";
import { abonnementExpire } from "../mailTemplates/abonnementExpire.js";
import { newCandidature } from "../mailTemplates/newCandidature.js";
import { missionComplete } from "../mailTemplates/missionComplete.js";
import { filleulInscrit } from "../mailTemplates/filleulInscrit.js";
import { filleulAbonnement } from "../mailTemplates/filleulAbonnement.js";
import { offreAbonnement } from "../mailTemplates/offreAbonnement.js";
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL;



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

export const sendMailNewCandidature = async (email, firstName, nameMission) => {
  
  const mail = newCandidature({ firstName: firstName, nameMission: nameMission });
  await sendMail({
    to: email,
    subject: mail.subject,
    html: mail.html
  });
};

export const sendMailMissionComplete = async (email, firstName, nameMission, Earned) => {
  
  const mail = missionComplete({ firstName: firstName, nameMission: nameMission, Earned: Earned });
  await sendMail({
    to: email,
    subject: mail.subject,
    html: mail.html
  });
};

export const sendMailfilleulInscrit = async (email, filleulName, firstName, linkParrainage) => {
  
  const mail = filleulInscrit({ filleulName: filleulName, firstName: firstName, linkParrainage:  linkParrainage});
  await sendMail({
    to: email,
    subject: mail.subject,
    html: mail.html
  });
};

export const sendMailFilleulAbonnement = async (email, filleulName, firstName, amountPrime, codeParrainage) => {
  
  const mail = filleulAbonnement({ filleulName: filleulName, firstName: firstName, amountPrime: amountPrime, linkParrainage: codeParrainage });
  await sendMail({
    to: email,
    subject: mail.subject,
    html: mail.html
  });
};

export const sendMailoffreAbonnement = async (email, firstName, offerLink) => {
  
  const mail = offreAbonnement({ firstName: firstName, offerLink: offerLink });
  await sendMail({
    to: email,
    subject: mail.subject,
    html: mail.html
  });
};