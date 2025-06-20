export function confirmationMail ({ firstName, confirmLink }) {
  return {
    subject: `👉 Confirme ton compte Pagajob dès maintenant`,
    html: `
        <p>Salut ${firstName},
        <br>
        Merci de ton inscription sur Pagajob !
        <br>
        Clique ici pour confirmer ton compte et activer ton accès : <a href="${confirmLink}">Confirmer mon adresse</a>
        <br>
        Une fois confirmé, découvre les missions et tente ta chance au Jackpot Pajer.
        <br>
        À tout de suite !
        <br>
        L’équipe Pagajob</p>
    `
  };
}