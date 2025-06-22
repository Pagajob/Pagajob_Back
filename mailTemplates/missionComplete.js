export function missionComplete ({ firstName, nameMission, Earned }) {
  return {
    subject: `👏 Mission validée : bravo ${firstName} !`,
    html: `
        <p>Félicitations ${firstName},
        <br> 
        Ta mission "${nameMission}" a été validée ! Tu gagnes ${Earned}€.
        <br>        
        Continue : plus tu fais de missions, plus ta cagnotte se remplit !
        <br>
        Voir les nouvelles missions : <a href="https://pagajob.com/student/missions">Voir les missions</a>
        <br>         
        L’équipe Pagajob</p>
    `
  };
}