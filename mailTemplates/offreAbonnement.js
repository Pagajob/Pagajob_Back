export function offreAbonnement ({ firstName, offerLink}) {
  return {
    subject: `On a une offre pour toi, ${firstName} ! 🚀`,
    html: `
        <p>Hello ${firstName},
        <br>
        Tu as commencé ton inscription sur Pagajob mais tu n’as pas selectionné notre offre Boost ou Elite.
        <br>
        Rien que pour toi, on te propose ton premier mois Boost à 9,99€ !
        <br>
        Rejoins-nous et découvre des missions faciles + le Jackpot Pajer à gagner !
        <br>
        Rejoins-nous et découvre des missions faciles + le Jackpot Pajer à gagner !
        <br>
        Finalise ton inscription ici : ${offerLink} 
        <br>         
        À tout de suite !</p>
    `
  };
}