export function welcomeMail({ firstName, confirmLink }) {
  return {
    subject: `🎉 Bienvenue sur Pagajob, ${firstName} !`,
    html: `
      <h1>🎉 Bienvenue sur Pagajob, ${firstName} !</h1>
      <p>Ton compte Pagajob est bien créé. Il ne te reste plus qu'à confirmer ton adresse email :</p>
      <a href="${confirmLink}">Confirmer mon adresse</a>
      <p>🚀 Pagajob, c’est + de missions, + de gains.</p>
      <p>À tout de suite !</p>
    `
  };
}