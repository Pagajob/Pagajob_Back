export function mailVerifie ({ firstName}) {
  return {
    subject: `✅ Ton email est confirmé, ${firstName} !`,
    html: `
        <p>Bonjour ${firstName},
        <br> 
        Ton adresse email est bien confirmée. Bienvenue dans l’aventure Pagajob !
        <br>        
        Découvre dès maintenant les missions disponibles : <a href="https://pagajob.com/student/missions">Voir les missions</a>
        <br>
        Prend un de nos abonnements pour gagner le Jackpot Pajer !
        <br>
        L’équipe Pagajob</p>
    `
  };
}