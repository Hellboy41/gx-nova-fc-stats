import { addProgrammeDays } from "@/lib/programme-period";
import type { PosterKind, PosterPeriod } from "@/lib/discord/period";

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


function frenchDate(dateKey:string):string{
 return new Intl.DateTimeFormat("fr-FR",{
  day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"
 }).format(new Date(dateKey+"T12:00:00Z"));
}
export function discordPublicationText(rosterName:string,kind:PosterKind,period:PosterPeriod,dateKey:string){
 const club=discordRosterName(rosterName);
 const title=(kind==="programme"?"Programme":"Résultats")+(period==="week"?" de la semaine":" du jour");
 let dates:string;
 if(period==="week"){
  dates="Du "+frenchDate(dateKey)+" au "+frenchDate(addProgrammeDays(dateKey,6));
 }else{
  const weekday=new Intl.DateTimeFormat("fr-FR",{weekday:"long",timeZone:"UTC"})
   .format(new Date(dateKey+"T12:00:00Z"));
  dates=weekday.charAt(0).toUpperCase()+weekday.slice(1)+" "+frenchDate(dateKey);
 }
 // Mention à la fin, sur sa propre ligne. Sur Discord, elle notifie lors de la
 // première publication si le webhook est autorisé à mentionner @everyone.
 return "**"+club+" · "+title+"**\n"+dates+"\n\n@everyone";
}
