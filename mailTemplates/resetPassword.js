export function resetPasswordMail({ firstName, resetLink }) {
  return {
    subject: "🔑 Réinitialisez votre mot de passe Pagajob",
    html: `<p>Bonjour ${firstName},</p>
 
           <p>Vous avez demandé à réinitialiser votre mot de passe sur Pagajob.</p>
          
            <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe (valable 30 minutes) :</p>
            <p><a href="${resetLink}">Réinitialiser</a></p>
          
            <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          
            <p>L’équipe Pagajob</p>
           `
  };
}