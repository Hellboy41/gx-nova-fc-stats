import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { discordWeek } from "@/lib/discord/week";
import { readDiscordWeek } from "@/lib/discord/data";
import { renderDiscordImage } from "@/lib/discord/image";
import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const p=new URL(req.url).searchParams;
 const rosterId=p.get("rosterId")??"",date=p.get("date")??"",kind=p.get("kind")??"";
 const auth=await requireActiveStaff({rosterId});if(auth.error)return auth.error;
 if(!["programme","results"].includes(kind))return NextResponse.json({error:"Type de visuel invalide."},{status:400});
 try{
  const roster=await activeRosterById(rosterId);
  if(!roster)return NextResponse.json({error:"Roster introuvable."},{status:404});
  const week=discordWeek(date);
  const data=await readDiscordWeek(roster,week);
  const png=await renderDiscordImage(roster,kind as "programme"|"results",week,data);
  return new Response(Uint8Array.from(png).buffer,{headers:{
   "Content-Type":"image/png","Cache-Control":"private, no-store",
   "Content-Disposition":"inline; filename=\"atyom-"+kind+"-"+week+".png\""
  }});
 }catch(e){console.error("ATYOM Discord preview",e instanceof Error?e.message:"Unknown");
  return NextResponse.json({error:"Aperçu indisponible."},{status:500});}
}
