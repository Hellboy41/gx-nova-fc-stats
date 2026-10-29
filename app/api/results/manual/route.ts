import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { programmeCanonicalWeek } from "@/lib/programme-period";
export const dynamic="force-dynamic";
const H={"Cache-Control":"private, no-store"};
const dateOk=(v:unknown):v is string=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(new Date(v+"T12:00:00Z").getTime())&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;
const scoreOk=(n:unknown):n is number=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=99;
function parisDate(){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",day:"2-digit",month:"2-digit",year:"numeric"}).formatToParts(new Date());
 const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));return v.year+"-"+v.month+"-"+v.day;
}
function invalid(error:string,status=400){return NextResponse.json({error},{status,headers:H});}
function originOk(req:Request){const origin=req.headers.get("origin");return !origin||origin===new URL(req.url).origin;}
type Body={rosterId:string;eventId:string;dateKey?:string;goalsFor?:number;goalsAgainst?:number;kind?:"forfeit"|"administrative"};
async function mutation(req:Request,method:"PUT"|"DELETE"){
 if(!originOk(req))return invalid("Origine interdite.",403);
 const raw=await req.json().catch(()=>null) as Body|null;
 if(!raw||typeof raw.rosterId!=="string"||typeof raw.eventId!=="string"||raw.eventId.length>80||raw.eventId.length===0)
  return invalid("Roster ou rencontre invalide.");
 const auth=await requireActiveStaff({write:true,rosterId:raw.rosterId});
 if(auth.error)return auth.error;
 const roster=await activeRosterById(raw.rosterId);
 if(!roster)return invalid("Roster indisponible.",404);
 const admin=createAdminClient();
 let eventDate:string, eventTime:string|null,opponent:string,competition:string,scheduledEventId:string|null=null;
 if(roster.workspace_mode==="legacy"){
  if(!dateOk(raw.dateKey))return invalid("Date de rencontre invalide.");
  const {data,error}=await admin.from("weekly_programs").select("schedule").eq("club_id",roster.ea_club_id)
    .eq("week_start",programmeCanonicalWeek(raw.dateKey)).maybeSingle();
  if(error)throw error;
  const schedule=data?.schedule;
  const list=schedule&&typeof schedule==="object"&&!Array.isArray(schedule)
   ?(schedule as Record<string,unknown>)[raw.dateKey]:null;
  const item=Array.isArray(list)?list.find((x:unknown)=>x&&typeof x==="object"&&!Array.isArray(x)&&(x as Record<string,unknown>).id===raw.eventId) as Record<string,unknown>|undefined:undefined;
  if(!item)return invalid("Enregistre d'abord le programme : rencontre introuvable.",404);
  if(item.linkedMatchId||item.linkedEaMatchId)return invalid("Ce match est déjà lié à EA. Retire le résultat administratif avant toute liaison.",409);
  eventDate=raw.dateKey;eventTime=typeof item.time==="string"?item.time:null;
  opponent=typeof item.opponentName==="string"&&item.opponentName.trim()?item.opponentName.trim().slice(0,120):"Adversaire non renseigné";
  competition=typeof item.title==="string"&&item.title.trim()?item.title.trim().slice(0,120):"Compétition / tournoi";
 }else{
  if(!/^[a-f\d-]{36}$/i.test(raw.eventId))return invalid("Identifiant de rencontre invalide.");
  const {data,error}=await admin.from("atyom_roster_events")
    .select("id,event_date,event_time,opponent_name,competition").eq("id",raw.eventId).eq("roster_id",roster.id).maybeSingle();
  if(error)throw error;
  if(!data)return invalid("Rencontre introuvable.",404);
  eventDate=data.event_date;eventTime=data.event_time;opponent=data.opponent_name;competition=data.competition;scheduledEventId=data.id;
 }
 if(method==="DELETE"){
  const {error}=await admin.from("atyom_manual_results").delete().eq("roster_id",roster.id).eq("event_id",raw.eventId);
  if(error)throw error;
  return NextResponse.json({success:true},{headers:H});
 }
 if(!scoreOk(raw.goalsFor)||!scoreOk(raw.goalsAgainst)||!["forfeit","administrative"].includes(raw.kind??""))
  return invalid("Saisis un score entier entre 0 et 99 et choisis le type de résultat.");
 if(raw.kind==="forfeit"&&raw.goalsFor===raw.goalsAgainst)
  return invalid("Un forfait doit désigner un vainqueur. Le score ne peut pas être nul.");
 if(eventDate>parisDate())return invalid("Impossible de valider un score avant la date du match.");
 const {data,error}=await admin.from("atyom_manual_results").upsert({
  roster_id:roster.id,event_id:raw.eventId,scheduled_event_id:scheduledEventId,event_date:eventDate,
  event_time:eventTime,opponent_name:opponent,competition,goals_for:raw.goalsFor,goals_against:raw.goalsAgainst,
  kind:raw.kind,created_by:auth.profile!.userId,updated_at:new Date().toISOString()
 },{onConflict:"roster_id,event_id"}).select("event_id,goals_for,goals_against,result,kind").single();
 if(error)throw error;
 return NextResponse.json({success:true,manualResult:{eventId:data.event_id,goalsFor:data.goals_for,goalsAgainst:data.goals_against,result:data.result,kind:data.kind}},{headers:H});
}
export async function PUT(req:Request){try{return await mutation(req,"PUT");}catch(e){console.error("Manual score PUT:",e);return invalid("Enregistrement du score impossible.",500);}}
export async function DELETE(req:Request){try{return await mutation(req,"DELETE");}catch(e){console.error("Manual score DELETE:",e);return invalid("Suppression du score impossible.",500);}}
