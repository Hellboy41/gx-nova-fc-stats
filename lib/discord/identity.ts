/** Identité du roster affichée dans les messages Discord et leurs noms de fichier.
 * Ne pas confondre l'identité du club avec celle de la plateforme de gestion.
 */
export function discordRosterName(name:string):string {
 const clean=name.replace(/[\r\n\t*_~`<>@]/g," ").replace(/\s+/g," ").trim();
 return (clean||"Club esport").slice(0,80);
}

export function discordPosterFilename(name:string,kind:"programme"|"results",period:"day"|"week",date:string):string {
 const slug=discordRosterName(name)
  .replace(/[Øø]/g,"o")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,52)||"club";
 return `${slug}-${kind}-${period}-${date}.png`;
}
