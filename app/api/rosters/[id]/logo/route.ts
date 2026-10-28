import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeRosterById, rosterWithLogo } from "@/lib/platform/rosters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADER = { "Cache-Control": "private, no-store" };
const BUCKET = "esport-branding-private";
type Ctx = { params: Promise<{id:string}> };
function checkOrigin(req:Request){
 const origin=req.headers.get("origin");
 return !origin || origin===new URL(req.url).origin;
}
async function guard(req:Request,ctx:Ctx){
 if(!checkOrigin(req))return {error:NextResponse.json({error:"Origine interdite."},{status:403,headers:HEADER}),roster:null};
 const auth=await requireActiveStaff({requireStructure:true});
 if(auth.error)return {error:auth.error,roster:null};
 if(auth.profile?.role!=="admin")return {error:NextResponse.json({error:"Modification du logo réservée à l'Admin ATYOM."},{status:403,headers:HEADER}),roster:null};
 const {id}=await ctx.params;
 if(!/^roster-[a-f0-9]{32}$/.test(id))return {error:NextResponse.json({error:"Roster invalide."},{status:404,headers:HEADER}),roster:null};
 const roster=await activeRosterById(id);
 if(!roster || roster.workspace_mode!=="monitoring")return {error:NextResponse.json({error:"Roster indisponible."},{status:404,headers:HEADER}),roster:null};
 return {error:null,roster};
}
function detect(bytes:Uint8Array,mime:string){
 if(mime==="image/png"&&bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return "png";
 if(mime==="image/jpeg"&&bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "jpg";
 if(mime==="image/webp"&&bytes.length>=12&&[82,73,70,70].every((b,i)=>bytes[i]===b)&&[87,69,66,80].every((b,i)=>bytes[i+8]===b))return "webp";
 return null;
}
export async function POST(req:Request,ctx:Ctx){
 try{
  const {error,roster}=await guard(req,ctx);
  if(error)return error;
  const form=await req.formData();
  const file=form.get("logo");
  if(!(file instanceof File)||file.size<12||file.size>5*1024*1024)
   return NextResponse.json({error:"Image PNG, JPG ou WebP obligatoire (5 Mo maximum)."},{status:400,headers:HEADER});
  const bytes=new Uint8Array(await file.arrayBuffer());
  const ext=detect(bytes,file.type);
  if(!ext)return NextResponse.json({error:"Format du logo invalide ou non reconnu."},{status:400,headers:HEADER});
  const path=`atyom-rosters/${roster!.id}/assets/${crypto.randomUUID()}.${ext}`;
  const admin=createAdminClient();
  const upload=await admin.storage.from(BUCKET).upload(path,bytes,{contentType:file.type,upsert:false});
  if(upload.error)throw upload.error;
  const {data, error:updateError}=await admin.from("atyom_rosters").update({logo_path:path,updated_at:new Date().toISOString()})
    .eq("id",roster!.id).eq("organisation_id","atyom-pilot").eq("workspace_mode","monitoring")
    .select("id,organisation_id,name,ea_club_id,game_edition,workspace_mode,status,primary_color,secondary_color,logo_path").single();
  if(updateError)throw updateError;
  return NextResponse.json({roster:await rosterWithLogo(data),message:"Logo enregistré."},{headers:HEADER});
 }catch(e){console.error("Roster logo upload:",e);return NextResponse.json({error:"Impossible d'enregistrer le logo."},{status:500,headers:HEADER});}
}
export async function DELETE(req:Request,ctx:Ctx){
 try{
  const {error,roster}=await guard(req,ctx);
  if(error)return error;
  const admin=createAdminClient();
  const {error:dbError}=await admin.from("atyom_rosters").update({logo_path:null,updated_at:new Date().toISOString()})
    .eq("id",roster!.id).eq("organisation_id","atyom-pilot").eq("workspace_mode","monitoring");
  if(dbError)throw dbError;
  return NextResponse.json({success:true},{headers:HEADER});
 }catch{return NextResponse.json({error:"Impossible de retirer le logo."},{status:500,headers:HEADER});}
}
