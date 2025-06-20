export function resetPassword({ firstName, resetLink }) {
  return {
    subject: "🔑 Réinitialisez votre mot de passe Pagajob",
    html: `<p>Bonjour ${firstName},
        <br>
        Vous avez demandé à réinitialiser votre mot de passe sur Pagajob.
        <br>
        Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe (valable 30 minutes) : <a href="${resetLink}">Réinitialiser</a>
        <br>
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
        <br>
        L’équipe Pagajob</p>
  `
  };
}