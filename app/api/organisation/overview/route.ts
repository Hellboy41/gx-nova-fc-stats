import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeRosters, rostersWithLogos } from "@/lib/platform/rosters";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
type Result = "V" | "N" | "D";
type Match = { id:number; played_at:string|null; opponent_name:string; goals_for:number; goals_against:number; result:Result; competition_id:number|null };
type Numbers = {played:number;wins:number;draws:number;losses:number;goalsFor:number;goalsAgainst:number;winRate:number;goalDifference:number};
function summarize(rows:Match[]):Numbers {
  const n:Numbers={played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,winRate:0,goalDifference:0};
  for(const m of rows) { n.played++;if(m.result==="V")n.wins++;if(m.result==="N")n.draws++;if(m.result==="D")n.losses++;
    n.goalsFor+=m.goals_for||0;n.goalsAgainst+=m.goals_against||0; }
  n.winRate=n.played?Math.round(n.wins/n.played*100):0;n.goalDifference=n.goalsFor-n.goalsAgainst;return n;
}
function parisNow(){
 const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
 const v=Object.fromEntries(p.map(item=>[item.type,item.value]));
 return {date:`${v.year}-${v.month}-${v.day}`,time:`${v.hour}:${v.minute}`};
}
function addDays(date:string,days:number){const x=new Date(date+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+days);return x.toISOString().slice(0,10);}
export async function GET(){
 const auth=await requireActiveStaff({requireStructure:true});
 if(auth.error)return auth.error;
 try{
  const admin=createAdminClient();
  const registry=await activeRosters();
  const signed = await rostersWithLogos(registry);
  const logoMap = new Map(signed.map(roster => [roster.id,roster.logoUrl]));
  const rosters=registry.map(r=>({id:r.id,name:r.name,gameEdition:r.game_edition,eaClubId:r.ea_club_id,workspaceMode:r.workspace_mode}));
  const ids=rosters.map(r=>r.eaClubId);
  const now=parisNow(), start=new Date(Date.now()-30*86400000).toISOString();
  const [comp, programme, members]=await Promise.all([
   admin.from("competitions").select("id,club_id,name,short_name").in("club_id",ids),
   admin.from("weekly_programs").select("club_id,week_start,schedule").in("club_id",ids).gte("week_start",addDays(now.date,-7)).lte("week_start",addDays(now.date,7)),
   admin.from("staff_profiles").select("user_id",{count:"exact",head:true}).eq("is_active",true),
  ]);
  if(comp.error||programme.error||members.error)throw comp.error||programme.error||members.error;
  const titles=new Map<string,Map<number,string>>();
  for(const c of comp.data??[]){const map=titles.get(c.club_id)??new Map<number,string>();map.set(c.id,c.short_name||c.name);titles.set(c.club_id,map);}
  const rosterBreakdown=await Promise.all(rosters.map(async roster=>{
   if(roster.workspaceMode==="monitoring"){
    const [recent30,recent]=await Promise.all([
     admin.from("atyom_roster_results").select("ea_match_id,played_at,opponent_name,goals_for,goals_against,result").eq("roster_id",roster.id)
      .gte("played_at",start).lte("played_at",new Date().toISOString()).order("played_at",{ascending:false}).limit(1000),
     admin.from("atyom_roster_results").select("ea_match_id,played_at,opponent_name,goals_for,goals_against,result").eq("roster_id",roster.id)
      .order("played_at",{ascending:false}).limit(10),
    ]);
    if(recent30.error||recent.error)throw recent30.error||recent.error;
    const matches=(recent.data??[]) as Array<Omit<Match,"id"|"competition_id">&{ea_match_id:string}>;
    const period=(recent30.data??[]) as Array<Omit<Match,"id"|"competition_id">&{ea_match_id:string}>;
    const totals=summarize(period.map((m,i)=>({...m,id:i,competition_id:null})));
    return {id:roster.id,name:roster.name,gameEdition:roster.gameEdition,logoUrl:logoMap.get(roster.id)??null,matches30:totals,capped:period.length>=1000,
      form:matches.slice(0,5).map(m=>m.result),lastMatchAt:matches[0]?.played_at??null,
      results:matches.map(m=>({id:m.ea_match_id,rosterId:roster.id,rosterName:roster.name,playedAt:m.played_at,
       opponent:m.opponent_name,goalsFor:m.goals_for,goalsAgainst:m.goals_against,result:m.result,competition:"EA Clubs"}))};
   }
   const [recent30,recent]=await Promise.all([
    admin.from("matches").select("id,played_at,opponent_name,goals_for,goals_against,result,competition_id").eq("club_id",roster.eaClubId)
     .gte("played_at",start).lte("played_at",new Date().toISOString()).order("played_at",{ascending:false}).limit(1000),
    admin.from("matches").select("id,played_at,opponent_name,goals_for,goals_against,result,competition_id").eq("club_id",roster.eaClubId)
     .not("played_at","is",null).order("played_at",{ascending:false}).limit(10)
   ]);
   if(recent.error||recent30.error)throw recent.error||recent30.error;
   const matches=(recent.data??[]) as Match[], period=(recent30.data??[]) as Match[];
   return {id:roster.id,name:roster.name,gameEdition:roster.gameEdition,logoUrl:logoMap.get(roster.id)??null,matches30:summarize(period),capped:period.length>=1000,
    form:matches.slice(0,5).map(m=>m.result),lastMatchAt:matches[0]?.played_at??null,
    results:matches.map(m=>({id:String(m.id),rosterId:roster.id,rosterName:roster.name,playedAt:m.played_at,opponent:m.opponent_name,
     goalsFor:m.goals_for,goalsAgainst:m.goals_against,result:m.result,competition:m.competition_id?(titles.get(roster.eaClubId)?.get(m.competition_id)??"Compétition"):"Non classé"}))};
  }));
  // Résultats officiels administratifs, séparés des matchs EA et des statistiques individuelles.
  const {data:manualRows,error:manualError}=await admin.from("atyom_manual_results")
    .select("roster_id,event_id,event_date,event_time,opponent_name,competition,goals_for,goals_against,result,kind")
    .in("roster_id",rosters.map(r=>r.id)).order("event_date",{ascending:false}).limit(1000);
  if(manualError)throw manualError;
  const legacy=rosters.find(r=>r.id==="gx-nova-legacy");
  const activeLegacy=new Set<string>();
  if(legacy){
   const {data:weeks,error:weekError}=await admin.from("weekly_programs").select("schedule")
     .eq("club_id",legacy.eaClubId).gte("week_start",addDays(now.date,-375)).lte("week_start",addDays(now.date,7));
   if(weekError)throw weekError;
   for(const week of weeks??[]){
    if(!week.schedule||Array.isArray(week.schedule)||typeof week.schedule!=="object")continue;
    for(const [date,entries] of Object.entries(week.schedule as Record<string,unknown>)){
     if(!Array.isArray(entries))continue;
     for(const raw of entries){
      if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
      const e=raw as Record<string,unknown>;
      if(typeof e.id==="string"&&!e.linkedMatchId&&!e.linkedEaMatchId)activeLegacy.add(date+"::"+e.id);
     }
    }
   }
  }
  // Un match supprimé du programme, ou rattaché plus tard à EA, ne compte plus.
  const validManual=(manualRows??[]).filter(r=>r.roster_id!=="gx-nova-legacy"||activeLegacy.has(r.event_date+"::"+r.event_id));
  const manualEventSet=new Set(validManual.map(r=>r.roster_id+"::"+r.event_id));
  for(const roster of rosterBreakdown){
   const own=validManual.filter(m=>m.roster_id===roster.id);
   for(const m of own.filter(m=>m.event_date>=start.slice(0,10)&&m.event_date<=now.date)){
    const stats=roster.matches30;stats.played++;
    if(m.result==="V")stats.wins++;else if(m.result==="N")stats.draws++;else stats.losses++;
    stats.goalsFor+=m.goals_for;stats.goalsAgainst+=m.goals_against;
   }
   roster.matches30.winRate=roster.matches30.played?Math.round(roster.matches30.wins/roster.matches30.played*100):0;
   roster.matches30.goalDifference=roster.matches30.goalsFor-roster.matches30.goalsAgainst;
   roster.results.push(...own.map(m=>({
    id:"manual:"+m.event_id,rosterId:roster.id,rosterName:roster.name,
    playedAt:m.event_date+"T"+String(m.event_time??"21:00").slice(0,5)+":00",
    opponent:m.opponent_name,goalsFor:m.goals_for,goalsAgainst:m.goals_against,
    result:m.result as Result,competition:m.competition,kind:m.kind
   })));
   roster.results.sort((a,b)=>(b.playedAt??"").localeCompare(a.playedAt??""));
   roster.form=roster.results.slice(0,5).map(m=>m.result);
   roster.lastMatchAt=roster.results[0]?.playedAt??null;
  }
  const all30=summarize([]);for(const r of rosterBreakdown){for(const k of ["played","wins","draws","losses","goalsFor","goalsAgainst"] as const)all30[k]+=r.matches30[k];}
  all30.winRate=all30.played?Math.round(all30.wins/all30.played*100):0;all30.goalDifference=all30.goalsFor-all30.goalsAgainst;
  const next:Array<{rosterId:string;rosterName:string;eventDate:string;time:string;opponent:string;competition:string}>=[];
  const byEa=new Map(rosters.map(r=>[r.eaClubId,r]));
  for(const week of programme.data??[]){
   const roster=byEa.get(week.club_id);
   if(!roster||!week.schedule||Array.isArray(week.schedule)||typeof week.schedule!=="object")continue;
   for(const [date,items] of Object.entries(week.schedule as Record<string,unknown>)){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<now.date||date>addDays(now.date,7)||!Array.isArray(items))continue;
    for(const raw of items){
     if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
     const event=raw as Record<string,unknown>, time=event.time;
     if(typeof time!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||(date===now.date&&time<now.time)||event.status==="played"||event.linkedMatchId!=null||manualEventSet.has(roster.id+"::"+event.id))continue;
     const opponent=typeof event.opponentName==="string"&&event.opponentName.trim()?event.opponentName.trim():(typeof event.title==="string"&&event.title.trim()?event.title.trim():"Adversaire à définir");
     const competition=typeof event.competitionId==="number"?titles.get(roster.eaClubId)?.get(event.competitionId):null;
     next.push({rosterId:roster.id,rosterName:roster.name,eventDate:date,time,opponent,
      competition:competition??(event.type==="tournament"?"Tournoi":"Événement")});
    }
   }
  }
  // Calendrier des nouveaux rosters : table isolée de weekly_programs GX NØVA.
  const newRosterIds=rosters.filter(r=>r.workspaceMode==="monitoring").map(r=>r.id);
  if(newRosterIds.length){
   const {data:additional,error:eventError}=await admin.from("atyom_roster_events")
     .select("id,roster_id,event_date,event_time,competition,opponent_name")
     .in("roster_id",newRosterIds).gte("event_date",now.date).lte("event_date",addDays(now.date,7))
     .order("event_date",{ascending:true}).order("event_time",{ascending:true}).limit(1000);
   if(eventError)throw eventError;
   const rosterById=new Map(rosters.map(r=>[r.id,r]));
   for(const e of additional??[]){
    const roster=rosterById.get(e.roster_id);
    if(!roster||!e.event_date||!e.event_time||manualEventSet.has(roster.id+"::"+e.id))continue;
    const time=String(e.event_time).slice(0,5);
    if(e.event_date===now.date&&time<now.time)continue;
    next.push({rosterId:roster.id,rosterName:roster.name,eventDate:e.event_date,time,
     opponent:e.opponent_name,competition:e.competition});
   }
  }
  next.sort((a,b)=>(a.eventDate+a.time).localeCompare(b.eventDate+b.time));
  const lastResults=rosterBreakdown.flatMap(r=>r.results).sort((a,b)=>(b.playedAt??"").localeCompare(a.playedAt??"")).slice(0,10);
  return NextResponse.json({activeRosters:rosters.length,activeMembers:members.count??0,period:"30 derniers jours",
   totals:all30,rosterBreakdown:rosterBreakdown.map(({results,...rest})=>rest),lastResults,
   upcoming:next.slice(0,8),upcomingCount:next.length,periodMatchesCapped:rosterBreakdown.some(r=>r.capped),
   pilot:rosters.length===1,asOf:new Date().toISOString()},{headers});
 }catch(e){console.error("Structure overview failed:",e);
  return NextResponse.json({error:"La vue consolidée est momentanément indisponible."},{status:500,headers});}
}
