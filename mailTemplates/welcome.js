export function welcomeMail({ firstName }) {
  return {
    subject: "Bienvenue sur Pagajob !",
    html: `<h1>Bienvenue ${firstName} !</h1><p>Merci de t'être inscrit sur Pagajob.</p>`
  };
}