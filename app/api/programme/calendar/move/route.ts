import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProgrammeDateKey, programmeCanonicalWeek } from "@/lib/programme-period";
import { sortProgrammeItemsByTime } from "@/lib/programme-sort";

export const dynamic="force-dynamic";
const H={"Cache-Control":"private, no-store"};
const TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const bad=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:H});
type Move={
 rosterId:string;eventId:string;fromDate:string;fromTime:string;
 toDate:string;toTime:string;
};
type EventItem=Record<string,unknown>&{id:string;time:string};
type ProgrammeSchedule=Record<string,EventItem[]>;
type WeekRow={week_start:string;schedule:unknown;updated_at:string|null};
const validBody=(x:unknown):x is Move=>{
 if(!x||typeof x!=="object"||Array.isArray(x))return false;
 const v=x as Record<string,unknown>;
 return typeof v.rosterId==="string"&&typeof v.eventId==="string"&&v.eventId.length>0&&v.eventId.length<=80&&
   isProgrammeDateKey(v.fromDate)&&isProgrammeDateKey(v.toDate)&&typeof v.fromTime==="string"&&
   (v.fromTime===""||TIME.test(v.fromTime))&&typeof v.toTime==="string"&&TIME.test(v.toTime);
};
function asSchedule(value:unknown):ProgrammeSchedule{
 if(!value||typeof value!=="object"||Array.isArray(value))return {};
 const out:ProgrammeSchedule={};
 for(const [date,values] of Object.entries(value as Record<string,unknown>)){
  if(!isProgrammeDateKey(date)||!Array.isArray(values))continue;
  out[date]=values.filter((v):v is EventItem=>Boolean(v)&&typeof v==="object"&&!Array.isArray(v)&&
    typeof (v as Record<string,unknown>).id==="string"&&typeof (v as Record<string,unknown>).time==="string");
 }
 return out;
}
export async function POST(req:Request){
 const origin=req.headers.get("origin");
 if(origin&&origin!==new URL(req.url).origin)return bad("Origine interdite.",403);
 const payload=await req.json().catch(()=>null);
 if(!validBody(payload))return bad("Date, horaire ou identifiant de match invalide.");
 const {rosterId,eventId,fromDate,fromTime,toDate,toTime}=payload;
 const auth=await requireActiveStaff({rosterId,write:true});
 if(auth.error)return auth.error;
 const roster=await activeRosterById(rosterId);
 if(!roster)return bad("Roster introuvable.",404);
 if(fromDate===toDate&&fromTime===toTime)
  return NextResponse.json({success:true,unchanged:true},{headers:H});
 try{
  const admin=createAdminClient();
  // Les rencontres finalisées gardent leur date pour protéger les statistiques.
  const {data:manual,error:manualError}=await admin.from("atyom_manual_results")
    .select("event_id").eq("roster_id",rosterId).eq("event_id",eventId).maybeSingle();
  if(manualError)throw manualError;
  if(manual)return bad("Un score manuel ou forfait est déjà validé. Retire ce résultat avant de reporter le match.",409);

  if(roster.workspace_mode!=="legacy"){
   if(!/^[a-f\d-]{36}$/i.test(eventId))return bad("Match introuvable.",404);
   const {data,error}=await admin.from("atyom_roster_events")
    .update({event_date:toDate,event_time:toTime})
    .eq("roster_id",rosterId).eq("id",eventId).eq("event_date",fromDate).eq("event_time",fromTime)
    .select("id,event_date,event_time").maybeSingle();
   if(error){
    if(error.code==="23505")return bad("Une rencontre est déjà programmée à cet horaire.",409);
    throw error;
   }
   if(!data)return bad("Ce match a été modifié depuis l'affichage. Actualise le calendrier.",409);
   return NextResponse.json({success:true,date:data.event_date,time:String(data.event_time).slice(0,5)},{headers:H});
  }

  const sourceWeek=programmeCanonicalWeek(fromDate),targetWeek=programmeCanonicalWeek(toDate);
  const {data:rows,error:readError}=await admin.from("weekly_programs")
    .select("week_start,schedule,updated_at").eq("club_id",roster.ea_club_id)
    .in("week_start",[...new Set([sourceWeek,targetWeek])]);
  if(readError)throw readError;
  const byWeek=new Map((rows??[]).map(r=>[r.week_start,r as WeekRow]));
  const sourceRow=byWeek.get(sourceWeek);
  if(!sourceRow)return bad("Rencontre absente du programme enregistré. Enregistre le programme avant de la déplacer.",404);
  const originalSource=asSchedule(sourceRow.schedule);
  const originalTarget=sourceWeek===targetWeek?originalSource:asSchedule(byWeek.get(targetWeek)?.schedule);
  const sourceItems=originalSource[fromDate]??[];
  const index=sourceItems.findIndex(item=>item.id===eventId);
  if(index<0)return bad("Rencontre introuvable à sa date d'origine.",404);
  const current=sourceItems[index];
  if(current.time!==fromTime)return bad("L'horaire de ce match a changé. Actualise le calendrier.",409);
  if(current.linkedMatchId||current.linkedEaMatchId||current.status==="played")
   return bad("Un match déjà joué et relié à EA ne peut pas être déplacé.",409);
  const targetItems=(originalTarget[toDate]??[]);
  if(targetItems.some(item=>item.id!==eventId&&item.time===toTime))
   return bad("Une autre rencontre occupe déjà cet horaire.",409);
  if(fromDate!==toDate&&targetItems.length>=12)
   return bad("Cette journée contient déjà 12 rencontres. Choisis une autre date.",409);
  if(targetItems.some(item=>item.id===eventId&&fromDate!==toDate))
   return bad("Cette rencontre figure déjà à la nouvelle date.",409);
  const changedItem={...current,time:toTime};
  const newSource={...originalSource};
  const newTarget=sourceWeek===targetWeek?newSource:{...originalTarget};
  newSource[fromDate]=sourceItems.filter(item=>item.id!==eventId);
  newTarget[toDate]=sortProgrammeItemsByTime(
   (fromDate===toDate?newSource[toDate]??[]:newTarget[toDate]??[]).concat(changedItem)
  );
  // Une composition/programme de disponibilités est rattaché à l'ID de rencontre.
  const {data:plan,error:planError}=await admin.from("programme_event_plans")
   .select("id,week_start,event_date").eq("club_id",roster.ea_club_id)
   .eq("event_id",eventId).maybeSingle();
  if(planError)throw planError;
  const now=new Date().toISOString();
  const write=async(week:string,schedule:ProgrammeSchedule)=>{
   const prior=byWeek.get(week);
   if(!prior){
    const {error}=await admin.from("weekly_programs").insert({
     club_id:roster.ea_club_id,week_start:week,schedule,
     updated_at:now,updated_by:auth.profile!.userId,
    });
    if(error){if(error.code==="23505")throw new Error("CONFLICT");throw error;}
    return;
   }
   const query=admin.from("weekly_programs").update({
    schedule,updated_at:now,updated_by:auth.profile!.userId
   }).eq("club_id",roster.ea_club_id).eq("week_start",week);
   const guarded=prior.updated_at?query.eq("updated_at",prior.updated_at):query.is("updated_at",null);
   const {data,error}=await guarded.select("week_start").maybeSingle();
   if(error)throw error;
   if(!data)throw new Error("CONFLICT");
  };
  const restore=async(week:string,schedule:ProgrammeSchedule)=>{
   await admin.from("weekly_programs").upsert({
    club_id:roster.ea_club_id,week_start:week,schedule,
    updated_at:new Date().toISOString(),updated_by:auth.profile!.userId,
   },{onConflict:"club_id,week_start"});
  };
  // Même semaine : une seule écriture sur weekly_programs.
  if(sourceWeek===targetWeek){
   await write(sourceWeek,newSource);
  }else{
   // Deux semaines distinctes : destination d'abord, retour arrière en cas d'échec.
   try{
    await write(targetWeek,newTarget);
    await write(sourceWeek,newSource);
   }catch(e){
    try{
     if(byWeek.has(targetWeek))await restore(targetWeek,originalTarget);
     else await admin.from("weekly_programs").delete().eq("club_id",roster.ea_club_id).eq("week_start",targetWeek);
    }catch(rollback){console.error("ATYOM programme rollback:",rollback);}
    if(e instanceof Error&&e.message==="CONFLICT")return bad("Le programme a été modifié entre-temps. Recharge avant de réessayer.",409);
    throw e;
   }
  }
  if(plan){
   const {error}=await admin.from("programme_event_plans").update({
    event_date:toDate,week_start:targetWeek,updated_at:new Date().toISOString()
   }).eq("id",plan.id).eq("club_id",roster.ea_club_id);
   if(error){
    console.error("ATYOM composition move error:",error);
    try{
     await restore(sourceWeek,originalSource);
     if(targetWeek!==sourceWeek){
      if(byWeek.has(targetWeek))await restore(targetWeek,originalTarget);
      else await admin.from("weekly_programs").delete().eq("club_id",roster.ea_club_id).eq("week_start",targetWeek);
     }
    }catch(rollback){console.error("ATYOM programme/plan rollback:",rollback);}
    return bad("Déplacement annulé : impossible de mettre à jour les disponibilités et la composition.",500);
   }
  }
  return NextResponse.json({success:true,date:toDate,time:toTime,planPreserved:Boolean(plan)},{headers:H});
 }catch(e){
  console.error("ATYOM calendar move:",e);
  if(e instanceof Error&&e.message==="CONFLICT")
   return bad("Le programme a été modifié entre-temps. Recharge avant de réessayer.",409);
  return bad("Le déplacement a échoué. Recharge le calendrier et vérifie le programme avant de réessayer.",500);
 }
}
