import { isProgrammeDateKey } from "@/lib/programme-period";
import { discordWeek } from "@/lib/discord/week";
export type PosterPeriod="day"|"week";
export type PosterKind="programme"|"results";
export function validPeriod(v:unknown):v is PosterPeriod{return v==="day"||v==="week";}
export function validKind(v:unknown):v is PosterKind{return v==="programme"||v==="results";}
export function posterDate(date:string,period:PosterPeriod){
 if(!isProgrammeDateKey(date))throw new Error("Date de publication invalide.");
 return period==="day"?date:discordWeek(date);
}
export function posterWeek(date:string){return discordWeek(date);}
