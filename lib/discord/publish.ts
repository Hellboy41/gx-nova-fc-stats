import { createAdminClient } from "@/lib/supabase/admin";
import { activeRosterById } from "@/lib/platform/rosters";
import { decryptWebhook,parseWebhook } from "@/lib/discord/crypto";
import { discordWeek } from "@/lib/discord/week";
import { readDiscordWeek } from "@/lib/discord/data";
import { renderDiscordImage,type PosterKind } from "@/lib/discord/image";
type Channel={id:string;roster_id:string;webhook_ciphertext:string;auto_programme:boolean;auto_results:boolean};
const selectChannel="id,roster_id,webhook_ciphertext,auto_programme,auto_results";
export async function validateDiscordWebhook(raw:string){
 const parsed=parseWebhook(raw);
 const r=await fetch(parsed.apiUrl,{cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw new Error("Discord refuse le webhook. Vérifie l'URL et les droits du salon.");
 const body=await r.json() as {id?:string;channel_id?:string};
 if(body.id!==parsed.id||!body.channel_id)throw new Error("Le webhook ne correspond pas à un salon Discord valide.");
 return {id:body.id,channelId:body.channel_id};
}
function discordError(status:number){
 if(status===401||status===403)return "Le webhook Discord n'est plus autorisé.";
 if(status===404)return "Le salon ou webhook Discord est introuvable.";
 if(status===429)return "Discord limite temporairement les envois, réessaie ultérieurement.";
 return "La mise à jour Discord a échoué (HTTP "+status+").";
}
async function sendImage(apiUrl:string,method:"POST"|"PATCH",kind:PosterKind,filename:string,bytes:Uint8Array,messageId?:string){
 const payload={
  content:`**ATYOM · ${kind==="programme"?"Programme":"Résultats"}** · Visuel synchronisé depuis ATYOM`,
  username:"ATYOM",allowed_mentions:{parse:[] as string[]},
  embeds:[{image:{url:"attachment://"+filename}}],
  attachments:[{id:0,filename,description:"Visuel ATYOM à jour"}]
 };
 const form=new FormData();
 form.set("payload_json",JSON.stringify(payload));
 form.set("files[0]",new Blob([new Uint8Array(bytes)],{type:"image/png"}),filename);
 const endpoint=method==="PATCH"?apiUrl+"/messages/"+messageId:apiUrl+"?wait=true";
 const response=await fetch(endpoint,{method,body:form,cache:"no-store",signal:AbortSignal.timeout(20000)});
 const result=await response.json().catch(()=>null) as {id?:string;code?:number}|null;
 if(method==="PATCH"&&response.status===404&&result?.code===10008)return null;
 if(!response.ok)throw new Error(discordError(response.status));
 if(!result?.id||!/^[0-9]{15,24}$/.test(result.id))throw new Error("Discord n'a pas renvoyé d'identifiant de message.");
 return result.id;
}
export async function publishDiscordImage(rosterId:string,channelId:string,kind:PosterKind,date:string,onlyExisting=false){
 const week=discordWeek(date),admin=createAdminClient();
 const [channelQuery,roster]=await Promise.all([
  admin.from("atyom_discord_channels").select(selectChannel).eq("id",channelId).eq("roster_id",rosterId).maybeSingle(),
  activeRosterById(rosterId)
 ]);
 if(channelQuery.error||!channelQuery.data||!roster)throw new Error("Canal ou roster Discord introuvable.");
 const channel=channelQuery.data as Channel;
 const {data:previous,error:readError}=await admin.from("atyom_discord_publications")
  .select("message_id,last_synced_at,last_error").eq("channel_id",channelId)
  .eq("kind",kind).eq("week_start",week).maybeSingle();
 if(readError)throw readError;
 if(onlyExisting&&!previous)return {skipped:true,messageId:null};
 const {apiUrl}=parseWebhook(decryptWebhook(channel.webhook_ciphertext));
 const poster=await readDiscordWeek(roster,week);
 const image=await renderDiscordImage(roster,kind,week,poster);
 const filename=`atyom-${kind}-${week}.png`;
 try{
  let id=previous?.message_id?await sendImage(apiUrl,"PATCH",kind,filename,image,previous.message_id):null;
  if(!id)id=await sendImage(apiUrl,"POST",kind,filename,image);
  const {error}=await admin.from("atyom_discord_publications").upsert({
   channel_id:channelId,kind,week_start:week,message_id:id,last_synced_at:new Date().toISOString(),
   last_error:null,updated_at:new Date().toISOString()
  },{onConflict:"channel_id,kind,week_start"});
  if(error)throw error;
  return {skipped:false,messageId:id,count:(kind==="programme"?poster.programme:poster.results).length};
 }catch(e){
  if(previous?.message_id){
   await admin.from("atyom_discord_publications").update({
    last_error:e instanceof Error?e.message.slice(0,200):"Erreur de synchronisation",
    updated_at:new Date().toISOString()
   }).eq("channel_id",channelId).eq("kind",kind).eq("week_start",week);
  }
  throw e;
 }
}
/** Seules les publications initialement créées manuellement sont automatiquement mises à jour. */
export async function refreshDiscordPublications(rosterId:string,dates:string[],kinds:PosterKind[]=["programme","results"]){
 if(process.env.VERCEL_ENV==="preview")return;
 const weeks=[...new Set(dates.map(discordWeek))].slice(0,10);
 if(!weeks.length)return;
 const admin=createAdminClient();
 const {data:channels,error}=await admin.from("atyom_discord_channels")
  .select("id,auto_programme,auto_results").eq("roster_id",rosterId).limit(5);
 if(error||!channels?.length)return;
 const {data:posts,error:postError}=await admin.from("atyom_discord_publications")
  .select("channel_id,kind,week_start").in("channel_id",channels.map(c=>c.id)).in("week_start",weeks);
 if(postError||!posts?.length)return;
 const present=new Set(posts.map(p=>p.channel_id+"|"+p.kind+"|"+p.week_start));
 for(const week of weeks)for(const channel of channels)for(const kind of kinds){
  if(!(kind==="programme"?channel.auto_programme:channel.auto_results)||!present.has(channel.id+"|"+kind+"|"+week))continue;
  try{await publishDiscordImage(rosterId,channel.id,kind,week,true);}
  catch(e){console.error("ATYOM Discord auto refresh",{rosterId,kind,week,reason:e instanceof Error?e.message:"Échec"});}
 }
}
