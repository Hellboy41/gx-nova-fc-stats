import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { createAdminClient } from "@/lib/supabase/admin";
import { addProgrammeDays, isProgrammeDateKey, programmeCanonicalWeek } from "@/lib/programme-period";

export const dynamic="force-dynamic";
const HEADERS={"Cache-Control":"private, no-store"};
type Status="upcoming"|"ea"|"forfeit"|"administrative";
type CalendarMatch={
 id:string;date:string;time:string;opponent:string;competition:string;
 status:Status;goalsFor:number|null;goalsAgainst:number|null;
};
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:HEADERS});
export async function GET(request:Request){
 const url=new URL(request.url);
 const rosterId=url.searchParams.get("rosterId")??"";
 const month=url.searchParams.get("month")??"";
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return fail("Mois invalide.");
 const anchor=month+"-01";
 if(!isProgrammeDateKey(anchor))return fail("Mois invalide.");
 const auth=await requireActiveStaff({rosterId});
 if(auth.error)return auth.error;
 const roster=await activeRosterById(rosterId);
 if(!roster)return fail("Roster introuvable.",404);
 try{
  // Grille de six semaines complète, lundi à dimanche, dans le fuseau horaire français.
  const weekday=(new Date(anchor+"T12:00:00Z").getUTCDay()+6)%7;
  const first=addProgrammeDays(anchor,-weekday);
  const last=addProgrammeDays(first,41);
  const admin=createAdminClient();
  const {data:results,error:resultError}=await admin.from("atyom_manual_results")
    .select("event_id,goals_for,goals_against,kind").eq("roster_id",rosterId)
    .gte("event_date",first).lte("event_date",last).limit(600);
  if(resultError)throw resultError;
  const manualById=new Map((results??[]).map(r=>[r.event_id,r]));
  const events:CalendarMatch[]=[];
  if(roster.workspace_mode==="legacy"){
   const weeks=[...new Set(Array.from({length:42},(_,i)=>programmeCanonicalWeek(addProgrammeDays(first,i))))];
   const [weekResult,compResult]=await Promise.all([
    admin.from("weekly_programs").select("week_start,schedule")
      .eq("club_id",roster.ea_club_id).in("week_start",weeks),
    admin.from("competitions").select("id,name,short_name").eq("club_id",roster.ea_club_id)
   ]);
   if(weekResult.error||compResult.error)throw weekResult.error??compResult.error;
   const rows=weekResult.data;
   const competitionLabels=new Map((compResult.data??[]).map(c=>[c.id,c.short_name??c.name]));
   for(const row of rows??[]){
    const schedule=row.schedule;
    if(!schedule||typeof schedule!=="object"||Array.isArray(schedule))continue;
    for(const [date,values] of Object.entries(schedule as Record<string,unknown>)){
     if(!isProgrammeDateKey(date)||date<first||date>last||!Array.isArray(values))continue;
     for(const raw of values){
      if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
      const item=raw as Record<string,unknown>;
      if(typeof item.id!=="string"||item.id.length>80)continue;
      const manual=manualById.get(item.id);
      const isEA=Boolean(item.linkedMatchId||item.linkedEaMatchId||item.status==="played");
      const status:Status=isEA?"ea":manual?(manual.kind==="forfeit"?"forfeit":"administrative"):"upcoming";
      const opponent=typeof item.opponentName==="string"&&item.opponentName.trim()
        ?item.opponentName.trim():(typeof item.title==="string"&&item.title.trim()?item.title.trim():"Adversaire à définir");
      const competition=typeof item.title==="string"&&item.title.trim()?item.title.trim():
        item.type==="tournament"?"Tournoi":typeof item.competitionId==="number"?
        (competitionLabels.get(item.competitionId)??"Compétition"):"Compétition";
      const time=typeof item.time==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)?item.time:"";
      const goalsFor=manual?manual.goals_for:typeof item.goalsFor==="number"?item.goalsFor:null;
      const goalsAgainst=manual?manual.goals_against:typeof item.goalsAgainst==="number"?item.goalsAgainst:null;
      events.push({id:item.id,date,time,opponent,competition,status,goalsFor,goalsAgainst});
     }
    }
   }
  }else{
   const {data:rows,error}=await admin.from("atyom_roster_events")
    .select("id,event_date,event_time,opponent_name,competition")
    .eq("roster_id",rosterId).gte("event_date",first).lte("event_date",last)
    .order("event_date").order("event_time").limit(500);
   if(error)throw error;
   for(const item of rows??[]){
    const manual=manualById.get(item.id);
    events.push({
     id:item.id,date:item.event_date,time:String(item.event_time).slice(0,5),
     opponent:item.opponent_name,competition:item.competition,
     status:manual?(manual.kind==="forfeit"?"forfeit":"administrative"):"upcoming",
     goalsFor:manual?manual.goals_for:null,goalsAgainst:manual?manual.goals_against:null,
    });
   }
  }
  events.sort((a,b)=>(a.date+a.time+a.id).localeCompare(b.date+b.time+b.id));
  return NextResponse.json({month,first,last,events,canEdit:auth.profile!.role!=="viewer"},{headers:HEADERS});
 }catch(e){
  console.error("ATYOM calendar GET:",e);
  return fail("Impossible de charger le calendrier.",500);
 }
}
