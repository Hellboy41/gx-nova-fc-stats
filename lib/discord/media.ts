import { createAdminClient } from "@/lib/supabase/admin";
import type { AtyomRoster } from "@/lib/platform/rosters";
import { BRANDING_BUCKET } from "@/lib/platform/branding";

const MAX_BYTES=750_000;
function asDataUri(bytes:Uint8Array,mime:string){
 return "data:"+mime+";base64,"+Buffer.from(bytes).toString("base64");
}
async function storageImage(path:string){
 try{
  const {data,error}=await createAdminClient().storage.from(BRANDING_BUCKET).download(path);
  if(error||!data||data.size>MAX_BYTES)return null;
  if(!["image/png","image/jpeg"].includes(data.type))return null;
  const bytes=new Uint8Array(await data.arrayBuffer());
  return bytes.length<=MAX_BYTES?asDataUri(bytes,data.type):null;
 }catch{return null;}
}
export async function rosterPosterLogo(roster:AtyomRoster){
 // L'identité du roster historique est enregistrée dans le stockage privé existant.
 if(roster.workspace_mode==="legacy"){
  const env=process.env.VERCEL_ENV==="production"?"production":
   "preview-"+(process.env.VERCEL_GIT_COMMIT_REF||"local").toLowerCase().replace(/[^a-z0-9-]/g,"-").slice(0,65);
  const folder=roster.ea_club_id+"/"+env+"/roster";
  try{
   const {data,error}=await createAdminClient().storage.from(BRANDING_BUCKET).download(folder+"/settings.json");
   if(!error&&data){
    const config=JSON.parse(await data.text()) as {logoPath?:unknown};
    if(typeof config.logoPath==="string"&&config.logoPath.startsWith(folder+"/assets/")&&!config.logoPath.includes(".."))
     return await storageImage(config.logoPath);
   }
  }catch{}
  return null;
 }
 if(!roster.logo_path||!/^atyom-rosters\/roster-[a-f0-9]{32}\/assets\/[a-f0-9-]+\.(png|jpg|webp)$/.test(roster.logo_path))return null;
 return storageImage(roster.logo_path);
}
/** URLs proposées dans les programmes : autoriser seulement des hébergeurs d'images connus. */
export async function safeOpponentLogo(raw:string|null|undefined):Promise<string|null>{
 if(!raw||raw.length>800||raw.toLowerCase().split("?")[0].endsWith(".webp"))return null;
 try{
  const url=new URL(raw);
  const storageHost=process.env.NEXT_PUBLIC_SUPABASE_URL?new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname:null;
  if(url.protocol!=="https:"||url.username||url.password||url.port||url.hash)return null;
  const discordHost=url.hostname==="cdn.discordapp.com"||url.hostname==="media.discordapp.net";
  const supabaseHost=url.hostname===storageHost&&url.pathname.startsWith("/storage/v1/object/");
  if(!discordHost&&!supabaseHost)return null;
  const response=await fetch(url.toString(),{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(2500)});
  if(!response.ok)return null;
  const contentType=(response.headers.get("content-type")||"").split(";")[0].trim();
  if(contentType!=="image/png"&&contentType!=="image/jpeg")return null;
  const advertised=Number(response.headers.get("content-length")||0);
  if(advertised>MAX_BYTES)return null;
  const reader=response.body?.getReader();
  if(!reader)return null;
  let size=0;const parts:Uint8Array[]=[];
  while(true){
   const part=await reader.read();
   if(part.done)break;
   size+=part.value.length;
   if(size>MAX_BYTES){await reader.cancel();return null;}
   parts.push(part.value);
  }
  return asDataUri(Buffer.concat(parts.map(p=>Buffer.from(p))),contentType);
 }catch{return null;}
}
