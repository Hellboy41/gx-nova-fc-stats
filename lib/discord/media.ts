import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AtyomRoster } from "@/lib/platform/rosters";
import { BRANDING_BUCKET } from "@/lib/platform/branding";

const MAX_INPUT_BYTES=5*1024*1024;
const MAX_OUTPUT_BYTES=900_000;
const MIME_TYPES=new Set(["image/png","image/jpeg","image/webp"]);

/** Convert all approved logos to a compact real PNG before passing them to next/og.
 * Satori cannot decode some WebP sources even when the browser can display them.
 * Conversion does not change the image stored in Supabase or the programme itself.
 */
export async function posterLogoDataUri(bytes:Uint8Array,mime:string):Promise<string|null>{
 if(bytes.length===0||bytes.length>MAX_INPUT_BYTES||!MIME_TYPES.has(mime))return null;
 try{
  const image=sharp(Buffer.from(bytes),{limitInputPixels:16_000_000,failOn:"error"});
  const info=await image.metadata();
  if(!info.width||!info.height||!["png","jpeg","webp"].includes(info.format))return null;
  const png=await image.rotate()
    .resize({width:420,height:420,fit:"inside",withoutEnlargement:true})
    .png({compressionLevel:9,effort:8})
    .toBuffer();
  if(png.length>MAX_OUTPUT_BYTES)return null;
  return "data:image/png;base64,"+png.toString("base64");
 }catch{return null;}
}
async function storageImage(path:string){
 try{
  const {data,error}=await createAdminClient().storage.from(BRANDING_BUCKET).download(path);
  if(error||!data||data.size>MAX_INPUT_BYTES)return null;
  return posterLogoDataUri(new Uint8Array(await data.arrayBuffer()),data.type);
 }catch{return null;}
}
export async function rosterPosterLogo(roster:AtyomRoster):Promise<string|null>{
 if(roster.workspace_mode==="legacy"){
  const env=process.env.VERCEL_ENV==="production"?"production":
   "preview-"+(process.env.VERCEL_GIT_COMMIT_REF||"local")
    .toLowerCase().replace(/[^a-z0-9-]/g,"-").slice(0,65);
  const folder=roster.ea_club_id+"/"+env+"/roster";
  try{
   const {data,error}=await createAdminClient().storage.from(BRANDING_BUCKET)
    .download(folder+"/settings.json");
   if(!error&&data){
    const config=JSON.parse(await data.text()) as {logoPath?:unknown};
    if(typeof config.logoPath==="string"&&
       config.logoPath.startsWith(folder+"/assets/")&&!config.logoPath.includes(".."))
     return storageImage(config.logoPath);
   }
  }catch{}
  return null;
 }
 if(!roster.logo_path||
    !roster.logo_path.startsWith("atyom-rosters/"+roster.id+"/assets/")||
    !/^atyom-rosters\/roster-[a-f0-9]{32}\/assets\/[a-f0-9-]+\.(png|jpg|webp)$/.test(roster.logo_path))
  return null;
 return storageImage(roster.logo_path);
}

/** Only fetch images from known image servers, never an arbitrary user-provided URL. */
export async function safeOpponentLogo(raw:string|null|undefined):Promise<string|null>{
 if(!raw||raw.length>800)return null;
 try{
  const url=new URL(raw);
  const storageHost=process.env.NEXT_PUBLIC_SUPABASE_URL?
   new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname:null;
  if(url.protocol!=="https:"||url.username||url.password||url.port||url.hash)return null;
  const discordHost=url.hostname==="cdn.discordapp.com"||url.hostname==="media.discordapp.net";
  const publicOpponentLogo=url.hostname===storageHost&&
   /^\/storage\/v1\/object\/public\/opponent-logos\/club-[0-9]{1,20}\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp)$/.test(url.pathname);
  if(!discordHost&&!publicOpponentLogo)return null;
  const response=await fetch(url.toString(),{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(5000)});
  if(!response.ok)return null;
  const type=(response.headers.get("content-type")??"").split(";")[0].trim().toLowerCase();
  if(!MIME_TYPES.has(type))return null;
  const sizeHeader=Number(response.headers.get("content-length")??0);
  if(sizeHeader>MAX_INPUT_BYTES)return null;
  const reader=response.body?.getReader();
  if(!reader)return null;
  let total=0;
  const parts:Uint8Array[]=[];
  while(true){
   const part=await reader.read();
   if(part.done)break;
   total+=part.value.length;
   if(total>MAX_INPUT_BYTES){await reader.cancel();return null;}
   parts.push(part.value);
  }
  return posterLogoDataUri(Buffer.concat(parts.map(p=>Buffer.from(p))),type);
 }catch{return null;}
}
