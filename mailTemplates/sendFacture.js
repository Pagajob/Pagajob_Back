export function sendFacture ({ firstName, amountPrime, linkParrainage }) {
  return {
    subject: `📄 Votre facture Pagajob`,
    html: `
        <p>Bonjour ${firstName},
        <br> 
        Vous trouverez en pièce jointe votre facture Pagajob.
        <br>        
        Merci pour votre confiance.
        <br>         
        L’équipe Pagajob</p>
    `
  };
}