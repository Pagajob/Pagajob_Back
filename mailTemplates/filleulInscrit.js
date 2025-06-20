export function filleulInscrit ({ filleulName, firstName, linkParrainage }) {
  return {
    subject: `🎉 Ton filleul ${filleulName} s’est inscrit !`,
    html: `
        <p>Bravo ${firstName},
        <br> 
        Ton filleul ${filleulName} vient de s’inscrire sur Pagajob. Dès qu’il prendra un abonnement, tu gagnes ta prime de parrainage !
        <br>        
        Invite encore plus d’amis : <a href="${linkParrainage}">Lien de parrainage</a>
        <br>        
        Pagajob</p>
    `
  };
}