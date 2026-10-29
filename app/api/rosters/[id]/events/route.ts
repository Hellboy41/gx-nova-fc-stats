import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeRosterById } from "@/lib/platform/rosters";
export const dynamic="force-dynamic";
const HEADER={"Cache-Control":"private, no-store"};
type Ctx={params:Promise<{id:string}>};
type RosterAccess={error:NextResponse|null;rosterId:string|null;userId:string|null;canWrite:boolean};
async function authorize(ctx:Ctx,write=false):Promise<RosterAccess>{
 const {id}=await ctx.params;
 if(!/^roster-[a-f0-9]{32}$/.test(id))
  return {error:NextResponse.json({error:"Programme des rosters non historiques uniquement."},{status:404,headers:HEADER}),rosterId:null,userId:null,canWrite:false};
 const auth=await requireActiveStaff({rosterId:id,write});
 if(auth.error)return {error:auth.error,rosterId:null,userId:null,canWrite:false};
 const roster=await activeRosterById(id);
 if(!roster||roster.workspace_mode!=="monitoring")
  return {error:NextResponse.json({error:"Roster inactif ou introuvable."},{status:404,headers:HEADER}),rosterId:null,userId:null,canWrite:false};
 return {error:null,rosterId:id,userId:auth.profile!.userId,canWrite:auth.profile!.role!=="viewer"};
}
function originAllowed(req:Request){
 const origin=req.headers.get("origin");
 return !origin||origin===new URL(req.url).origin;
}
const shape=(value:unknown,limit:number)=>typeof value==="string"&&value.trim().length>=2&&value.trim().length<=limit;
const validDate=(value:unknown):value is string=>{
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+"T12:00:00Z");
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
};
const selected="id,roster_id,event_date,event_time,competition,opponent_name,event_type";
function mapped(v:{id:string;event_date:string;event_time:string;competition:string;opponent_name:string;event_type:string}){
 return {id:v.id,date:v.event_date,time:v.event_time.slice(0,5),competition:v.competition,opponent:v.opponent_name,type:v.event_type};
}
export async function GET(_req:Request,ctx:Ctx){
 try{
  const access=await authorize(ctx);
  if(access.error)return access.error;
  const {data,error}=await createAdminClient().from("atyom_roster_events").select(selected).eq("roster_id",access.rosterId!)
   .gte("event_date",new Date(Date.now()-14*86400000).toISOString().slice(0,10))
   .order("event_date",{ascending:true}).order("event_time",{ascending:true}).limit(200);
  if(error)throw error;
  const eventIds=(data??[]).map(e=>e.id);
  const {data:manual,error:manualError}=eventIds.length
    ? await createAdminClient().from("atyom_manual_results")
      .select("event_id,goals_for,goals_against,result,kind").eq("roster_id",access.rosterId!).in("event_id",eventIds)
    : {data:[],error:null};
  if(manualError)throw manualError;
  const byEvent=new Map((manual??[]).map(m=>[m.event_id,{eventId:m.event_id,goalsFor:m.goals_for,goalsAgainst:m.goals_against,result:m.result,kind:m.kind}]));
  return NextResponse.json({events:(data??[]).map(e=>({...mapped(e),manualResult:byEvent.get(e.id)??null})),canWrite:access.canWrite},{headers:HEADER});
 }catch(e){console.error("Roster programme GET:",e);return NextResponse.json({error:"Programme indisponible."},{status:500,headers:HEADER});}
}
export async function POST(req:Request,ctx:Ctx){
 if(!originAllowed(req))return NextResponse.json({error:"Origine interdite."},{status:403,headers:HEADER});
 try{
  const access=await authorize(ctx,true);
  if(access.error)return access.error;
  const b=await req.json().catch(()=>null);
  if(!b||!validDate(b.date)||typeof b.time!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)||
    !shape(b.opponent,120)||!shape(b.competition,90)||!["competition","tournament","friendly"].includes(b.type))
   return NextResponse.json({error:"Complète une date valide, un horaire, une compétition et un adversaire."},{status:400,headers:HEADER});
  const start=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const end=new Date(Date.now()+366*86400000).toISOString().slice(0,10);
  if(b.date<start||b.date>end)return NextResponse.json({error:"La date doit être comprise entre le mois dernier et l'an prochain."},{status:400,headers:HEADER});
  const {data,error}=await createAdminClient().from("atyom_roster_events").insert({
   roster_id:access.rosterId,event_date:b.date,event_time:b.time,opponent_name:b.opponent.trim(),
   competition:b.competition.trim(),event_type:b.type,created_by:access.userId,
  }).select(selected).single();
  if(error)return NextResponse.json({error:error.code==="23505"?"Une rencontre est déjà prévue à cet horaire.":"Impossible d'ajouter la rencontre."},{status:error.code==="23505"?409:500,headers:HEADER});
  return NextResponse.json({event:mapped(data)},{status:201,headers:HEADER});
 }catch(e){console.error("Roster programme POST:",e);return NextResponse.json({error:"Programme indisponible."},{status:500,headers:HEADER});}
}
export async function DELETE(req:Request,ctx:Ctx){
 if(!originAllowed(req))return NextResponse.json({error:"Origine interdite."},{status:403,headers:HEADER});
 try{
  const access=await authorize(ctx,true);
  if(access.error)return access.error;
  const b=await req.json().catch(()=>null);
  if(!b||typeof b.eventId!=="string"||!/^[0-9a-f-]{36}$/i.test(b.eventId))
   return NextResponse.json({error:"Rencontre invalide."},{status:400,headers:HEADER});
  const {data,error}=await createAdminClient().from("atyom_roster_events").delete()
   .eq("id",b.eventId).eq("roster_id",access.rosterId!).select("id").maybeSingle();
  if(error||!data)return NextResponse.json({error:"Rencontre introuvable."},{status:error?500:404,headers:HEADER});
  return NextResponse.json({success:true},{headers:HEADER});
 }catch(e){console.error("Roster programme DELETE:",e);return NextResponse.json({error:"Suppression impossible."},{status:500,headers:HEADER});}
}
