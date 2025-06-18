export function confirmationMail ({ firstName, confirmLink }) {
  return {
    subject: `👉 Confirme ton compte Pagajob dès maintenant`,
    html: `
        <p>Salut ${firstName},</p>
 
        <p>Merci de ton inscription sur Pagajob !</p>
        
        <p>Clique ici pour confirmer ton compte et activer ton accès :
        <a href="${confirmLink}">Confirmer mon adresse</a></p>
        
        <p>Une fois confirmé, découvre les missions et tente ta chance au Jackpot Pajer.</p>
        
        <p>À tout de suite !</p>
        
        <p>L’équipe Pagajob</p>
    `
  };
}