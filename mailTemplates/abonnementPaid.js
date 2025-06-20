export function abonnementPaid({ subscriptionTier, firstName, percentage }) {
  return {
    subject: `✅ Ton abonnement ${subscriptionTier} est actif !`,
    html: `<p>Bravo  ${firstName},
          <br>
          Ton abonnement ${subscriptionTier} est maintenant actif. Tu as désormais accès aux missions exclusives et tu participes automatiquement au Jackpot Pajer de ce mois-ci.
          <br>
          Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe (valable 30 minutes) :
          <br>          
          💡 Pense à parrainer : tu gagnes ${percentage} sur chaque filleul abonné.
          <br>          
          Découvre tes missions : <a href="https://pagajob.com/student/missions">Voir les missions</a>
          <br>          
          Merci pour ta confiance !</p>
    `
  };
}