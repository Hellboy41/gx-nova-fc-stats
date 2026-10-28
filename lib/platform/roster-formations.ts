/** Positions en coordonnées de terrain (attaquants en haut, GK en bas). */
export type PitchSlot = {slot:string;x:number;y:number;label:string};
export type Formation = {name:string;slots:PitchSlot[]};
const slot=(name:string,x:number,y:number,label=name):PitchSlot=>({slot:name,x,y,label});
export const ROSTER_FORMATIONS:Formation[]=[
 {name:"4-3-3",slots:[
  slot("ATG",20,20),slot("BU",50,18),slot("ATD",80,20),
  slot("MCG",23,44),slot("MC",50,48),slot("MCD",77,44),
  slot("DG",13,70),slot("DCG",38,71),slot("DCD",62,71),slot("DD",87,70),
  slot("GK",50,87)]},
 {name:"4-2-3-1",slots:[
  slot("BU",50,17),slot("MOG",21,36),slot("MOC",50,36),slot("MOD",79,36),
  slot("MDCG",36,53),slot("MDCD",64,53),
  slot("DG",13,73),slot("DCG",38,72),slot("DCD",62,72),slot("DD",87,73),
  slot("GK",50,88)]},
 {name:"3-5-2",slots:[
  slot("ATG",38,18),slot("ATD",62,18),slot("MOC",50,35),
  slot("MG",13,46),slot("MDCG",36,52),slot("MDCD",64,52),slot("MD",87,46),
  slot("DCG",25,73),slot("DC",50,74),slot("DCD",75,73),slot("GK",50,88)]},
 {name:"3-1-4-2",slots:[
  slot("ATG",38,17),slot("ATD",62,17),
  slot("MG",13,39),slot("MCG",37,40),slot("MCD",63,40),slot("MD",87,39),
  slot("MDC",50,57),
  slot("DCG",25,74),slot("DC",50,75),slot("DCD",75,74),slot("GK",50,88)]},
 {name:"4-4-2",slots:[
  slot("ATG",38,18),slot("ATD",62,18),
  slot("MG",13,45),slot("MCG",38,49),slot("MCD",62,49),slot("MD",87,45),
  slot("DG",13,73),slot("DCG",38,73),slot("DCD",62,73),slot("DD",87,73),slot("GK",50,88)]}
];
export const formationByName=(name:string)=>ROSTER_FORMATIONS.find(f=>f.name===name);
export function remapRosterAssignments(old:Record<string,string>,previous:string,next:string){
 const targets=formationByName(next)?.slots??[];
 const oldSlots=formationByName(previous)?.slots??[];
 const assigned:Record<string,string>={};
 const used=new Set<string>();
 for(const target of targets){
  const id=old[target.slot];if(id&&!used.has(id)){assigned[target.slot]=id;used.add(id);}
 }
 const remaining=oldSlots.map(s=>old[s.slot]).filter((id):id is string=>Boolean(id)&&!used.has(id));
 for(const target of targets)if(!assigned[target.slot]){
  const id=remaining.shift();
  if(id){assigned[target.slot]=id;used.add(id);}
 }
 return assigned;
}
