import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { discordWeek } from "@/lib/discord/week";
import { posterDate,validPeriod } from "@/lib/discord/period";
import { readDiscordWeek,filterDiscordData } from "@/lib/discord/data";
import { renderDiscordImage } from "@/lib/discord/image";
import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const p=new URL(req.url).searchParams;
 const rosterId=p.get("rosterId")??"",date=p.get("date")??"",kind=p.get("kind")??"";
 const period=p.get("period")??"week";
 const auth=await requireActiveStaff({rosterId});if(auth.error)return auth.error;
 if(!["programme","results"].includes(kind)||!validPeriod(period))return NextResponse.json({error:"Type de visuel invalide."},{status:400});
 try{
  const roster=await activeRosterById(rosterId);
  if(!roster)return NextResponse.json({error:"Roster introuvable."},{status:404});
  const key=posterDate(date,period),week=discordWeek(date);
  const data=filterDiscordData(await readDiscordWeek(roster,week),period,key);
  const png=await renderDiscordImage(roster,kind as "programme"|"results",period,key,data);
  return new Response(Uint8Array.from(png).buffer,{headers:{
   "Content-Type":"image/png","Cache-Control":"private, no-store",
   "Content-Disposition":"inline; filename=\"atyom-"+kind+"-"+period+"-"+key+".png\""
  }});
 }catch(e){console.error("ATYOM Discord preview",e);
  return NextResponse.json({error:"Aperçu indisponible."},{status:500});}
}
