import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, // ex: mail.tondomaine.com
  port: 465, // ou 587
  secure: true, // true pour 465, false pour 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Pagajob" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};