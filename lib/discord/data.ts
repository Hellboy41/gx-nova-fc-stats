import { createAdminClient } from "@/lib/supabase/admin";
import { programmePeriodWeeks, addProgrammeDays } from "@/lib/programme-period";
import { discordWeekDates, parisDay } from "@/lib/discord/week";
import type { AtyomRoster } from "@/lib/platform/rosters";
import type { PosterPeriod } from "@/lib/discord/period";

export type DiscordLine={
 id:string;date:string;time:string;opponent:string;competition:string;
 score:string|null;status:"upcoming"|"win"|"draw"|"loss"|"forfeit";
 opponentLogoUrl?:string|null;
};
export type DiscordWeekData={
 programme:DiscordLine[];results:DiscordLine[];wins:number;draws:number;losses:number;
};
const timeRegex=/^([01]\d|2[0-3]):[0-5]\d$/;
function resultStatus(value:string,forfeit=false):DiscordLine["status"]{
 return forfeit?"forfeit":value==="V"?"win":value==="N"?"draw":"loss";
}
export async function readDiscordWeek(roster:AtyomRoster,monday:string):Promise<DiscordWeekData>{
 const admin=createAdminClient();
 const days=discordWeekDates(monday);
 const through=days[6],after=addProgrammeDays(through,1);
 // Chercher une marge UTC puis filtrer les dates localisées à Paris.
 const dateStart=new Date(monday+"T00:00:00Z");dateStart.setUTCDate(dateStart.getUTCDate()-1);
 const dateEnd=new Date(after+"T00:00:00Z");dateEnd.setUTCDate(dateEnd.getUTCDate()+1);
 const [manualResult,eaResult]=await Promise.all([
  admin.from("atyom_manual_results").select("event_id,event_date,event_time,opponent_name,competition,goals_for,goals_against,result,kind")
   .eq("roster_id",roster.id).gte("event_date",monday).lte("event_date",through).limit(300),
  admin.from(roster.workspace_mode==="legacy"?"matches":"atyom_roster_results")
   .select(roster.workspace_mode==="legacy"?"id,played_at,opponent_name,goals_for,goals_against,result,competition_id":"ea_match_id,played_at,opponent_name,goals_for,goals_against,result")
   .eq(roster.workspace_mode==="legacy"?"club_id":"roster_id",roster.workspace_mode==="legacy"?roster.ea_club_id:roster.id)
   .gte("played_at",dateStart.toISOString()).lt("played_at",dateEnd.toISOString())
   .order("played_at",{ascending:true}).limit(300),
 ]);
 if(manualResult.error||eaResult.error)throw manualResult.error??eaResult.error;
 const manual=new Map((manualResult.data??[]).map(m=>[m.event_id,m]));
 const programme:DiscordLine[]=[];
 const validEventIds=new Set<string>();
 const linkedEventIds=new Set<string>();
 let competitionNames=new Map<number,string>();
 if(roster.workspace_mode==="legacy"){
  const [weeks,comps]=await Promise.all([
   admin.from("weekly_programs").select("schedule").eq("club_id",roster.ea_club_id)
    .in("week_start",programmePeriodWeeks(monday)),
   admin.from("competitions").select("id,name,short_name").eq("club_id",roster.ea_club_id),
  ]);
  if(weeks.error||comps.error)throw weeks.error??comps.error;
  competitionNames=new Map((comps.data??[]).map(v=>[v.id,v.short_name||v.name]));
  for(const week of weeks.data??[]){
   if(!week.schedule||typeof week.schedule!=="object"||Array.isArray(week.schedule))continue;
   for(const [date,events] of Object.entries(week.schedule as Record<string,unknown>)){
    if(date<monday||date>through||!Array.isArray(events))continue;
    for(const raw of events){
     if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
     const e=raw as Record<string,unknown>;
     if(typeof e.id!=="string")continue;
     validEventIds.add(e.id);
     const linked=Boolean(e.linkedMatchId||e.linkedEaMatchId||e.status==="played");
     if(linked)linkedEventIds.add(e.id);
     const man=!linked?manual.get(e.id):null;
     const competition=typeof e.competitionId==="number"?competitionNames.get(e.competitionId):null;
     const sourceResult=man?.result??(typeof e.result==="string"?e.result:"");
     const score=man?`${man.goals_for} - ${man.goals_against}`:
      typeof e.goalsFor==="number"&&typeof e.goalsAgainst==="number"?`${e.goalsFor} - ${e.goalsAgainst}`:null;
     programme.push({
      id:e.id,date,time:typeof e.time==="string"&&timeRegex.test(e.time)?e.time:"--:--",
      opponent:typeof e.opponentName==="string"&&e.opponentName.trim()?e.opponentName.trim():
       typeof e.title==="string"&&e.title.trim()?e.title.trim():"Adversaire à confirmer",
      competition:competition??(typeof e.title==="string"&&e.title.trim()?e.title.trim():"Événement"),
      score,status:man?.kind==="forfeit"?"forfeit":sourceResult?resultStatus(sourceResult):"upcoming",
      opponentLogoUrl:typeof e.opponentLogoUrl==="string"?e.opponentLogoUrl:null,
     });
    }
   }
  }
 }else{
  const {data,error}=await admin.from("atyom_roster_events")
   .select("id,event_date,event_time,competition,opponent_name").eq("roster_id",roster.id)
   .gte("event_date",monday).lte("event_date",through).order("event_date").order("event_time").limit(250);
  if(error)throw error;
  for(const e of data??[]){
   validEventIds.add(e.id);
   const man=manual.get(e.id);
   programme.push({
    id:e.id,date:e.event_date,time:String(e.event_time).slice(0,5),
    opponent:e.opponent_name,competition:e.competition,
    score:man?`${man.goals_for} - ${man.goals_against}`:null,
    status:man?resultStatus(man.result,man.kind==="forfeit"):"upcoming",
   });
  }
 }
 programme.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const results:DiscordLine[]=[];
 const eaRows=(eaResult.data??[]) as unknown as Array<{
   id?:number;ea_match_id?:string;played_at:string;opponent_name:string;
   goals_for:number;goals_against:number;result:string;competition_id?:number|null;
 }>;
 for(const e of eaRows){
  const date=parisDay(new Date(e.played_at));
  if(date<monday||date>through)continue;
  const id="id" in e?String(e.id):String(e.ea_match_id);
  const comp="competition_id" in e&&typeof e.competition_id==="number"?competitionNames.get(e.competition_id):null;
  const time=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(e.played_at));
  results.push({id:"ea:"+id,date,time,opponent:e.opponent_name??"Adversaire",
   competition:comp??"Match EA",score:`${e.goals_for} - ${e.goals_against}`,status:resultStatus(e.result)});
 }
 for(const m of manualResult.data??[]){
  if(!validEventIds.has(m.event_id)||linkedEventIds.has(m.event_id))continue;
  results.push({id:"manual:"+m.event_id,date:m.event_date,time:String(m.event_time??"21:00").slice(0,5),
   opponent:m.opponent_name,competition:m.competition,score:`${m.goals_for} - ${m.goals_against}`,
   status:resultStatus(m.result,m.kind==="forfeit")});
 }
 results.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 // Logo uniquement lorsque le match du résultat correspond exactement à un événement planifié.
 const logos=new Map(programme.filter(p=>p.opponentLogoUrl).map(p=>[p.date+"|"+p.opponent.trim().toLocaleLowerCase("fr-FR"),p.opponentLogoUrl]));
 for(const item of results){
  item.opponentLogoUrl=logos.get(item.date+"|"+item.opponent.trim().toLocaleLowerCase("fr-FR"))??null;
 }
 return {programme,results,
  wins:results.filter(m=>m.status==="win"||m.status==="forfeit"&&Number(m.score?.split("-")[0])>Number(m.score?.split("-")[1])).length,
  draws:results.filter(m=>m.status==="draw").length,
  losses:results.filter(m=>m.status==="loss"||m.status==="forfeit"&&Number(m.score?.split("-")[0])<Number(m.score?.split("-")[1])).length
 };
}

/** Les chiffres et les résultats du jour sont calculés après le filtrage, sans mélange de périodes. */
export function filterDiscordData(data:DiscordWeekData,period:PosterPeriod,date:string):DiscordWeekData{
 if(period==="week")return data;
 const programme=data.programme.filter(m=>m.date===date);
 const results=data.results.filter(m=>m.date===date);
 const parsed=(m:DiscordLine)=>{
  const parts=(m.score??"").split("-").map(v=>Number(v.trim()));
  return parts.length===2&&parts.every(Number.isFinite)?parts:null;
 };
 const wins=results.filter(m=>m.status==="win"||(m.status==="forfeit"&&((parsed(m)?.[0]??0)>(parsed(m)?.[1]??0)))).length;
 const draws=results.filter(m=>m.status==="draw").length;
 return {programme,results,wins,draws,losses:results.length-wins-draws};
}
