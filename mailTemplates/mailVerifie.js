export function mailVerifie ({ firstName}) {
  return {
    subject: `✅ Ton email est confirmé, [Prénom] !`,
    html: `
        <p>Bonjour ${firstName},</p>
 
        <p>Ton adresse email est bien confirmée. Bienvenue dans l’aventure Pagajob !</p>
        
        <p> Découvre dès maintenant les missions disponibles : <br>
        <a href="https://pagajob.com/student/missions">Voir les missions</a></p>
        
        <p>Prend un de nos abonnements pour gagner le Jackpot Pajer !</p>
        
        <p>L’équipe Pagajob</p>
    `
  };
}