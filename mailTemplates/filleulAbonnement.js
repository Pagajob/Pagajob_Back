export function filleulAbonnement ({ filleulName, firstName, amountPrime, codeParrainage }) {
  return {
    subject: `💰 Tu viens de gagner une prime de parrainage !`,
    html: `
        <p>Félicitations ${firstName},
        <br> 
        Ton filleul ${filleulName} vient de souscrire un abonnement. Tu gagnes ta prime : ${amountPrime}€ qu'on te versera tous les mois !
        <br>        
        Continue à parrainer pour multiplier les gains :  <a href="https://pagajob.com/signup?ref=${codeParrainage}">Lien de parrainage</a>
        <br>         
        L’équipe Pagajob</p>
    `
  };
}