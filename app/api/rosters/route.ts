import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { permittedRosters, rosterOutput, rostersWithLogos, type AtyomRoster } from "@/lib/platform/rosters";

export const dynamic="force-dynamic";
const HEADERS={"Cache-Control":"private, no-store"};
const hex=(v:unknown)=>typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v);
const safeText=(v:unknown,min:number,max:number)=>typeof v==="string"&&v.trim().length>=min&&v.trim().length<=max;
const eaId=(v:unknown)=>typeof v==="string"&&/^[1-9][0-9]{0,19}$/.test(v);
const denied=()=>NextResponse.json({error:"Seuls les administrateurs ATYOM peuvent modifier les rosters."},{status:403,headers:HEADERS});
function sameOrigin(request:Request){
 const origin=request.headers.get("origin");
 return !origin||origin===new URL(request.url).origin;
}
export async function GET(){
 const auth=await requireActiveStaff({profileOnly:true});
 if(auth.error)return auth.error;
 try{
  const rosters=await permittedRosters(auth.profile!);
  return NextResponse.json({rosters:await rostersWithLogos(rosters),canCreate:auth.profile!.role==="admin"&&auth.profile!.accessScope==="structure"},{headers:HEADERS});
 }catch{return NextResponse.json({error:"Catalogue des rosters indisponible."},{status:500,headers:HEADERS});}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return denied();
 const auth=await requireActiveStaff({requireStructure:true});
 if(auth.error)return auth.error;
 if(auth.profile?.role!=="admin")return denied();
 const b=await request.json().catch(()=>null);
 if(!b||!safeText(b.name,2,80)||!eaId(b.eaClubId)||!safeText(b.gameEdition,2,20)
   ||(b.primaryColor!==undefined&&!hex(b.primaryColor))||(b.secondaryColor!==undefined&&!hex(b.secondaryColor)))
  return NextResponse.json({error:"Nom, identifiant EA numérique et édition obligatoires ; couleurs au format #RRGGBB."},{status:400,headers:HEADERS});
 if(!/^[a-zA-Z0-9 -]{2,20}$/.test(b.gameEdition.trim()))
  return NextResponse.json({error:"Édition invalide."},{status:400,headers:HEADERS});
 if(b.eaClubId==="1663")return NextResponse.json({error:"L'identifiant 1663 appartient déjà à GX NØVA."},{status:409,headers:HEADERS});
 const row={
   id:"roster-"+crypto.randomUUID().replace(/-/g,""),
   organisation_id:"atyom-pilot",name:b.name.trim(),ea_club_id:b.eaClubId,
   game_edition:b.gameEdition.trim(),workspace_mode:"monitoring",status:"active",
   primary_color:b.primaryColor??"#22d3ee",secondary_color:b.secondaryColor??"#facc15",
   created_by:auth.profile.userId,
 };
 const admin=createAdminClient();
 const {data,error}=await admin.from("atyom_rosters").insert(row).select("id,organisation_id,name,ea_club_id,game_edition,workspace_mode,status,primary_color,secondary_color").single();
 if(error)return NextResponse.json({error:error.code==="23505"?"Cet identifiant EA est déjà associé à un roster.":"Création du roster impossible."},{status:error.code==="23505"?409:500,headers:HEADERS});
 return NextResponse.json({roster:rosterOutput(data as AtyomRoster),message:"Roster créé. Sa synchronisation EA et ses droits peuvent être configurés."},{status:201,headers:HEADERS});
}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return denied();
 const auth=await requireActiveStaff({requireStructure:true});
 if(auth.error)return auth.error;
 if(auth.profile?.role!=="admin")return denied();
 const b=await request.json().catch(()=>null);
 if(!b||typeof b.id!=="string"||!/^roster-[a-f0-9]{32}$/.test(b.id)||
    !safeText(b.name,2,80)||!hex(b.primaryColor)||!hex(b.secondaryColor)||
    !["active","archived"].includes(b.status))
   return NextResponse.json({error:"Modification de roster invalide."},{status:400,headers:HEADERS});
 const {data,error}=await createAdminClient().from("atyom_rosters")
   .update({name:b.name.trim(),primary_color:b.primaryColor,secondary_color:b.secondaryColor,status:b.status,updated_at:new Date().toISOString()})
   .eq("id",b.id).eq("organisation_id","atyom-pilot").eq("workspace_mode","monitoring")
   .select("id,organisation_id,name,ea_club_id,game_edition,workspace_mode,status,primary_color,secondary_color").maybeSingle();
 if(error||!data)return NextResponse.json({error:"Impossible de modifier le roster."},{status:error?500:404,headers:HEADERS});
 return NextResponse.json({roster:rosterOutput(data as AtyomRoster)},{headers:HEADERS});
}
