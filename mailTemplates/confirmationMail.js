export function confirmationMail ({ confirmLink }) {
  return {
    subject: `Confirmez votre adresse email !`,
    html: `
      <p>Veuillez cliquer sur le lien suivant pour confirmer votre adresse email : 
      <a href="${confirmLink}">Confirmer mon adresse</a>
      </p>
    `
  };
}