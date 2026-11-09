import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { isProgrammeDateKey } from "@/lib/programme-period";
import { publishDiscordImage } from "@/lib/discord/publish";
export const dynamic="force-dynamic";
const H={"Cache-Control":"private, no-store"};
export async function POST(req:Request){
 const origin=req.headers.get("origin");
 if(origin&&origin!==new URL(req.url).origin)
  return NextResponse.json({error:"Origine interdite."},{status:403,headers:H});
 const b=await req.json().catch(()=>null);
 if(!b||typeof b.rosterId!=="string"||typeof b.channelId!=="string"||!/^[a-f\d-]{36}$/i.test(b.channelId)||
  !["programme","results"].includes(b.kind)||!isProgrammeDateKey(b.date))
  return NextResponse.json({error:"Canal, date ou publication invalide."},{status:400,headers:H});
 const auth=await requireActiveStaff({rosterId:b.rosterId,write:true});
 if(auth.error)return auth.error;
 if(!await activeRosterById(b.rosterId))return NextResponse.json({error:"Roster introuvable."},{status:404,headers:H});
 if(process.env.VERCEL_ENV==="preview")
  return NextResponse.json({error:"Les messages Discord ne peuvent être publiés que depuis la production ATYOM."},{status:403,headers:H});
 try{
  const result=await publishDiscordImage(b.rosterId,b.channelId,b.kind,b.date);
  return NextResponse.json({success:true,...result},{headers:H});
 }catch(e){
  console.error("ATYOM manual Discord post",e instanceof Error?e.message:"Unknown");
  return NextResponse.json({error:e instanceof Error?e.message:"Échec de la publication Discord."},{status:502,headers:H});
 }
}
