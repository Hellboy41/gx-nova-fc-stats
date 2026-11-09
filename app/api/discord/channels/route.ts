import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptWebhook,parseWebhook } from "@/lib/discord/crypto";
import { validateDiscordWebhook } from "@/lib/discord/publish";
export const dynamic="force-dynamic";
const H={"Cache-Control":"private, no-store"};
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:H});
const originOK=(req:Request)=>!req.headers.get("origin")||req.headers.get("origin")===new URL(req.url).origin;
const adminOnly=async()=>{
 const auth=await requireActiveStaff({requireStructure:true});
 return {error:auth.error,profile:auth.profile};
};
export async function GET(req:Request){
 const rosterId=new URL(req.url).searchParams.get("rosterId")??"";
 const auth=await requireActiveStaff({rosterId});if(auth.error)return auth.error;
 const roster=await activeRosterById(rosterId);if(!roster)return fail("Roster introuvable.",404);
 const admin=createAdminClient();
 const {data,error}=await admin.from("atyom_discord_channels")
  .select("id,label,roster_id,discord_channel_id,auto_programme,auto_results,created_at")
  .eq("roster_id",rosterId).order("created_at");
 if(error)return fail("Canaux Discord indisponibles.",500);
 const ids=(data??[]).map(ch=>ch.id);
 const {data:posts,error:postsError}=ids.length?await admin.from("atyom_discord_publications")
  .select("channel_id,kind,period,date_key,week_start,message_id,last_synced_at,last_error")
  .in("channel_id",ids).order("week_start",{ascending:false}).limit(100):{data:[],error:null};
 if(postsError)return fail("Publications Discord indisponibles.",500);
 return NextResponse.json({canManage:auth.profile!.role==="admin"&&auth.profile!.accessScope==="structure",
  canPublish:auth.profile!.role!=="viewer",
  channels:(data??[]).map(c=>({
   id:c.id,label:c.label,discordChannelId:c.discord_channel_id,
   autoProgramme:c.auto_programme,autoResults:c.auto_results,createdAt:c.created_at,
   publications:(posts??[]).filter(p=>p.channel_id===c.id).map(p=>({
    kind:p.kind,period:p.period,dateKey:p.date_key,weekStart:p.week_start,lastSyncedAt:p.last_synced_at,error:p.last_error,messageId:p.message_id
   }))
  }))},{headers:H});
}
export async function POST(req:Request){
 if(!originOK(req))return fail("Origine interdite.",403);
 const auth=await adminOnly();if(auth.error)return auth.error;
 if(auth.profile?.role!=="admin")return fail("Configuration réservée à un administrateur ATYOM.",403);
 const b=await req.json().catch(()=>null);
 if(!b||typeof b.rosterId!=="string"||typeof b.label!=="string"||
  b.label.trim().length<2||b.label.trim().length>60||typeof b.webhookUrl!=="string")return fail("Label et adresse webhook obligatoires.");
 const roster=await activeRosterById(b.rosterId);if(!roster)return fail("Roster introuvable.",404);
 try{
  const parsed=parseWebhook(b.webhookUrl);
  const verified=await validateDiscordWebhook(b.webhookUrl);
  const encrypted=encryptWebhook(parsed.apiUrl);
  const admin=createAdminClient();
  const {count,error:countError}=await admin.from("atyom_discord_channels").select("id",{count:"exact",head:true}).eq("roster_id",roster.id);
  if(countError)throw countError;
  if((count??0)>=5)return fail("Maximum cinq salons Discord par roster.",409);
  const {data,error}=await admin.from("atyom_discord_channels").insert({
   roster_id:roster.id,label:b.label.trim(),webhook_id:verified.id,
   webhook_ciphertext:encrypted,discord_channel_id:verified.channelId,
   auto_programme:true,auto_results:true,created_by:auth.profile.userId
  }).select("id,label").single();
  if(error)return fail(error.code==="23505"?"Ce webhook est déjà configuré pour ce roster.":"Enregistrement du webhook impossible.",error.code==="23505"?409:500);
  return NextResponse.json({channel:data},{status:201,headers:H});
 }catch(e){
  console.error("ATYOM Discord channel setup",e instanceof Error?e.message:"Error");
  return fail(e instanceof Error?e.message:"Webhook inaccessible.",400);
 }
}
export async function PATCH(req:Request){
 if(!originOK(req))return fail("Origine interdite.",403);
 const auth=await adminOnly();if(auth.error)return auth.error;
 if(auth.profile?.role!=="admin")return fail("Configuration réservée à l'Admin.",403);
 const b=await req.json().catch(()=>null);
 if(!b||typeof b.rosterId!=="string"||typeof b.channelId!=="string"||
  !/^[a-f\d-]{36}$/i.test(b.channelId)||typeof b.autoProgramme!=="boolean"||typeof b.autoResults!=="boolean")return fail("Configuration invalide.");
 const {data,error}=await createAdminClient().from("atyom_discord_channels").update({
  auto_programme:b.autoProgramme,auto_results:b.autoResults,updated_at:new Date().toISOString()
 }).eq("id",b.channelId).eq("roster_id",b.rosterId).select("id").maybeSingle();
 if(error||!data)return fail("Canal introuvable.",error?500:404);
 return NextResponse.json({success:true},{headers:H});
}
export async function DELETE(req:Request){
 if(!originOK(req))return fail("Origine interdite.",403);
 const auth=await adminOnly();if(auth.error)return auth.error;
 if(auth.profile?.role!=="admin")return fail("Configuration réservée à l'Admin.",403);
 const b=await req.json().catch(()=>null);
 if(!b||typeof b.rosterId!=="string"||typeof b.channelId!=="string"||!/^[a-f\d-]{36}$/i.test(b.channelId))return fail("Canal invalide.");
 const {data,error}=await createAdminClient().from("atyom_discord_channels")
  .delete().eq("id",b.channelId).eq("roster_id",b.rosterId).select("id").maybeSingle();
 if(error||!data)return fail("Canal introuvable.",error?500:404);
 return NextResponse.json({success:true},{headers:H});
}
