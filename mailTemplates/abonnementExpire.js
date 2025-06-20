export function abonnementExpire({ firstName, renewalLink }) {
  return {
    subject: `⚠ Ton abonnement Pagajob est expiré !`,
    html: `<p>Bonjour ${firstName},
            <br>
            <p> Ton abonnement Pagajob est arrivé à expiration. Renouvelle-le dès maintenant pour continuer à profiter des missions exclusives et rester inscrit au Jackpot Pajer.
            <br>
            Renouveler : <a href=${renewalLink}>${renewalLink}</a>
            <br>
            L’équipe Pagajob</p>
           `
  };
}