import { addProgrammeDays, isProgrammeDateKey } from "@/lib/programme-period";
export function discordWeek(date:string){
 if(!isProgrammeDateKey(date))throw new Error("Date de programme invalide.");
 const weekday=(new Date(date+"T12:00:00Z").getUTCDay()+6)%7;
 return addProgrammeDays(date,-weekday);
}
export function discordWeekDates(monday:string){
 return Array.from({length:7},(_,i)=>addProgrammeDays(monday,i));
}
export function parisDay(date:Date){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return values.year+"-"+values.month+"-"+values.day;
}
export function displayWeek(monday:string){
 return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"})
 .format(new Date(monday+"T12:00:00Z"));
}
