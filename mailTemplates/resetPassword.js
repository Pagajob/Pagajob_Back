export function resetPasswordMail({ firstName, resetLink }) {
  return {
    subject: "Réinitialisation de votre mot de passe",
    html: `<p>Bonjour ${firstName},</p>
           <p>Pour réinitialiser votre mot de passe, cliquez ici : <a href="${resetLink}">Réinitialiser</a></p>`
  };
}