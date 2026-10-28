"use client";
import type { PitchPlayer } from "@/components/lineups/TacticalPitch";
export async function downloadLineupPoster({rosterName,formation,spots,primary,secondary,bench=[]}:{
 rosterName:string;formation:string;spots:PitchPlayer[];primary:string;secondary:string;bench?:string[];
}){
 const canvas=document.createElement("canvas");
 canvas.width=1080;canvas.height=1440;
 const c=canvas.getContext("2d");if(!c)throw new Error("Le navigateur ne permet pas l'export PNG.");
 const hex=(v:string)=>/^#[\da-f]{6}$/i.test(v)?v:"#facc15";
 const accent=hex(primary),accent2=hex(secondary);
 c.fillStyle="#061016";c.fillRect(0,0,1080,1440);
 const header=c.createLinearGradient(0,0,1080,180);header.addColorStop(0,"#0B1520");header.addColorStop(1,"#141B20");
 c.fillStyle=header;c.fillRect(0,0,1080,188);
 c.fillStyle=accent;c.fillRect(0,0,14,188);
 c.textAlign="left";c.font="bold 30px sans-serif";c.fillStyle=accent;c.fillText("ATYOM  /  COMPOSITION",52,60);
 c.fillStyle="#FFFFFF";c.font="bold 58px sans-serif";c.fillText(rosterName.slice(0,29).toUpperCase(),52,135);
 c.font="bold 28px sans-serif";c.textAlign="right";c.fillStyle=accent;c.fillText(formation,1014,62);
 const top=218,height=1040,left=54,width=972;
 for(let i=0;i<8;i++){c.fillStyle=i%2?"#123A31":"#16483C";c.fillRect(left,top+(height/8)*i,width,height/8);}
 c.strokeStyle="#FFFFFF55";c.lineWidth=4;c.strokeRect(left+22,top+25,width-44,height-50);
 c.beginPath();c.moveTo(left+22,top+height/2);c.lineTo(left+width-22,top+height/2);c.stroke();
 c.beginPath();c.arc(540,top+height/2,128,0,Math.PI*2);c.stroke();
 c.strokeRect(325,top+25,430,143);c.strokeRect(325,top+height-168,430,143);
 for(const spot of spots){
  const x=left+width*spot.x/100,y=top+height*spot.y/100;
  c.save();c.shadowColor="#000000BB";c.shadowBlur=16;c.shadowOffsetY=7;
  c.fillStyle="#05101C";c.beginPath();c.roundRect(x-48,y-49,96,85,17);c.fill();c.restore();
  c.lineWidth=3;c.strokeStyle=accent;c.strokeRect(x-48,y-49,96,85);
  c.textAlign="center";c.fillStyle=accent2;c.font="bold 34px sans-serif";
  c.fillText(spot.number?String(spot.number):spot.name?"●":"+",x,y+3);
  c.fillStyle=accent;c.fillRect(x-29,y-64,58,23);
  c.fillStyle="#050A11";c.font="bold 16px sans-serif";c.fillText(spot.slot,x,y-46);
  c.fillStyle="#050C14";c.fillRect(x-75,y+42,150,39);
  c.fillStyle="#FFFFFF";c.font="bold 18px sans-serif";
  const label=spot.name||"LIBRE";c.fillText(label.length>15?label.slice(0,14)+"…":label,x,y+66);
 }
 c.fillStyle="#0B1520";c.fillRect(0,1282,1080,158);
 c.textAlign="left";c.fillStyle=accent;c.font="bold 23px sans-serif";c.fillText("REMPLAÇANTS",52,1327);
 c.fillStyle="#FFFFFF";c.font="23px sans-serif";const text=bench.length?bench.join("  ·  "):"Aucun remplaçant";
 c.fillText(text.length>75?text.slice(0,73)+"…":text,52,1370);
 c.textAlign="right";c.fillStyle="#8CA4AA";c.font="19px sans-serif";c.fillText("ATYOM ESPORT",1028,1411);
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
 if(!blob)throw new Error("Impossible de générer le PNG.");
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=`composition-${rosterName.normalize("NFKD").replace(/[^a-zA-Z0-9-]+/g,"-").toLowerCase()}-${formation}.png`;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
