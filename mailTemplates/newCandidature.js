export function newCandidature ({ firstName, nameMission}) {
  return {
    subject: `🎉 Vous avez une nouvelle candidature !`,
    html: `
        <p>Bonjour ${firstName},
        <br> 
        Vous avez recu une nouvelle candidature pour votre mission ${nameMission}.
        <br>        
        Vous pouvez dès maintenant analyser celle ci en cliquant ici.
        <br>         
        L’équipe Pagajob</p>
    `
  };
}