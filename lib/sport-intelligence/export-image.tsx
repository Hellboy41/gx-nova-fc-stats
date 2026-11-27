import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import type { AtyomRoster } from "@/lib/platform/rosters";
import { rosterPosterLogo } from "@/lib/discord/media";
import type { IntelligenceExportResult } from "@/lib/sport-intelligence/export";
import type { Role } from "@/lib/sport-intelligence";

const PANEL = "#0B2135";
const BORDER = "#22516B";
const CYAN = "#21D9EB";
const GOLD = "#FFD238";
const WHITE = "#F7FAFF";
const MUTED = "#AEC5D5";
const GREEN = "#5BE7B3";
const RED = "#FF8E9D";
const ROLE_NAMES: Record<Role, string> = {
  goalkeeper: "Gardiens", defender: "Défense", midfielder: "Milieu", forward: "Attaque",
};
const ROLE_ABBR: Record<Role, string> = {
  goalkeeper: "GK", defender: "DEF", midfielder: "MIL", forward: "ATT",
};
const fmt = (n: number | null, digits = 2) =>
  n === null || !Number.isFinite(n) ? "—" : n.toFixed(digits).replace(".", ",");
const date = (d: string | null) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Paris" })
  : "—";

function Stat({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <div style={{ display: "flex", flexDirection: "column", width: 375,
    border: "2px solid " + BORDER, borderRadius: 19, backgroundColor: PANEL, padding: "14px 20px" }}>
    <span style={{ fontSize: 16, letterSpacing: 1.1, fontWeight: 800, color: MUTED }}>{label.toUpperCase()}</span>
    <span style={{ fontSize: 43, color: WHITE, fontWeight: 900, marginTop: 1 }}>{value}</span>
    <span style={{ fontSize: 15, color: MUTED, marginTop: 1 }}>{detail}</span>
  </div>;
}
function Panel({ title, children, width }: { title: string; children: ReactNode; width: number }) {
  return <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, width, borderRadius: 22,
    border: "2px solid " + BORDER, backgroundColor: PANEL, padding: 22, overflow: "hidden" }}>
    <span style={{ color: GOLD, fontWeight: 900, fontSize: 25, marginBottom: 12 }}>{title}</span>
    {children}
  </div>;
}
function Line({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", minHeight: 59, padding: "7px 9px",
    borderBottom: "1px solid #204256", justifyContent: "space-between" }}>{children}</div>;
}
function Empty({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center",
    color: MUTED, fontSize: 23, textAlign: "center", padding: 24 }}>{children}</div>;
}
/** Liste complète : aucune réduction aux seuls joueurs en hausse ou en baisse. */
function FormContent({ result, height }: { result: IntelligenceExportResult; height: number }) {
  const order = { up: 0, stable: 1, down: 2, insufficient: 3 };
  const listed = [...result.players].sort((a, b) =>
    order[a.trend] - order[b.trend] ||
    (b.ratingDelta ?? -999) - (a.ratingDelta ?? -999) ||
    a.name.localeCompare(b.name, "fr"));
  const mid = Math.ceil(listed.length / 2);
  const columns = [listed.slice(0, mid), listed.slice(mid)];
  const trendLabel = {up:"En hausse",stable:"Stable",down:"En baisse",insufficient:"Données limitées"};
  const trendColor = {up:GREEN,stable:CYAN,down:RED,insufficient:MUTED};

  return <div style={{display:"flex",gap:16,width:"100%",height}}>
    {columns.map((column, columnIndex) => <Panel
      key={columnIndex} width={770}
      title={columnIndex===0 ? "TOUS LES JOUEURS · "+listed.length+" PROFILS" : "SUITE DU CLASSEMENT"}>
      {column.length ? column.map((p, index) => <div key={p.key}
        style={{display:"flex",flexDirection:"column",flexShrink:0,minHeight:60,
          padding:"6px 7px",borderBottom:"1px solid #204256"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:9,flex:1,minWidth:0}}>
            <span style={{color:CYAN,fontSize:16,fontWeight:900,width:29}}>
              {String(columnIndex*mid+index+1).padStart(2,"0")}
            </span>
            <span style={{color:WHITE,fontSize:19,fontWeight:800,width:228,overflow:"hidden"}}>
              {p.name.slice(0,23)}
            </span>
            <span style={{color:CYAN,fontSize:14,width:36}}>{ROLE_ABBR[p.role]}</span>
            <span style={{color:MUTED,fontSize:14,whiteSpace:"nowrap"}}>{p.appearances} match{p.appearances>1?"s":""}</span>
          </div>
          <span style={{color:trendColor[p.trend],fontSize:20,fontWeight:900,minWidth:72,textAlign:"right"}}>
            {p.ratingDelta === null ? "—" : (p.ratingDelta>0?"+":"")+fmt(p.ratingDelta)}
          </span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",paddingLeft:38,marginTop:3,gap:6}}>
          <span style={{color:MUTED,fontSize:14}}>
            5 précédents : {fmt(p.previousRating)}  →  5 derniers : {fmt(p.recentRating)}
          </span>
          <span style={{color:trendColor[p.trend],fontSize:14,fontWeight:700}}>
            {trendLabel[p.trend]}
          </span>
        </div>
      </div>) :
        <Empty>Aucun joueur ne correspond à ces filtres.</Empty>}
    </Panel>)}
  </div>;
}
function metric(role: Role, data: IntelligenceExportResult["roles"][number]) {
  return role === "goalkeeper" ? data.savesPerMatch
    : role === "defender" ? data.tacklesPerMatch
    : role === "midfielder" ? data.assistsPerMatch : data.goalsPerMatch;
}
function metricLabel(role: Role) {
  return role === "goalkeeper" ? "Arrêts / match" : role === "defender" ? "Tacles / match"
    : role === "midfielder" ? "PD / match" : "Buts / match";
}
type RoleStats = IntelligenceExportResult["roles"][number];

function roleExtraMetrics(report: RoleStats): {label: string; value: string}[] {
  if (report.role === "goalkeeper") return [
    {label:"Clean sheets",value:String(report.cleanSheetCount)},
    {label:"MVP EA",value:String(report.mvpCount)},
    {label:"Passes",value:fmt(report.passesPct,1)+" %"},
    {label:"Arrêts / match",value:fmt(report.savesPerMatch)},
  ];
  if (report.role === "defender") return [
    {label:"% tacles",value:fmt(report.tacklesPct,1)+" %"},
    {label:"Passes",value:fmt(report.passesPct,1)+" %"},
    {label:"Clean sheets",value:String(report.cleanSheetCount)},
    {label:"MVP EA",value:String(report.mvpCount)},
  ];
  if (report.role === "midfielder") return [
    {label:"Passes",value:fmt(report.passesPct,1)+" %"},
    {label:"Tacles / match",value:fmt(report.tacklesPerMatch)},
    {label:"Buts / match",value:fmt(report.goalsPerMatch)},
    {label:"MVP EA",value:String(report.mvpCount)},
  ];
  return [
    {label:"Tirs / match",value:fmt(report.shotsPerMatch)},
    {label:"PD / match",value:fmt(report.assistsPerMatch)},
    {label:"Passes",value:fmt(report.passesPct,1)+" %"},
    {label:"MVP EA",value:String(report.mvpCount)},
  ];
}

function roleOrdered(result: IntelligenceExportResult, role: Role): RoleStats[] {
  return result.roles.filter(player=>player.role===role)
    .sort((a,b)=>metric(role,b)-metric(role,a)||b.matches-a.matches||a.name.localeCompare(b.name,"fr"));
}

function RolePlayer({player,rank}:{player:RoleStats;rank:number}) {
  const extras=roleExtraMetrics(player);
  return <div style={{display:"flex",flexDirection:"column",width:751,height:151,flexShrink:0,
    backgroundColor:"#07182A",border:"1px solid "+BORDER,borderRadius:15,
    padding:"12px 14px",overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,height:28}}>
      <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
        <span style={{color:CYAN,fontSize:18,fontWeight:900,width:32}}>{String(rank).padStart(2,"0")}</span>
        <span style={{color:WHITE,fontSize:20,fontWeight:900,maxWidth:320,overflow:"hidden"}}>
          {player.name}
        </span>
        <span style={{color:MUTED,fontSize:15,whiteSpace:"nowrap"}}>{player.matches} matchs</span>
      </div>
      <span style={{color:GOLD,fontSize:20,fontWeight:900,whiteSpace:"nowrap"}}>★ {fmt(player.rating)}</span>
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      borderTop:"1px solid #204256",marginTop:10,paddingTop:9,height:26}}>
      <span style={{color:CYAN,fontSize:16,fontWeight:800}}>{metricLabel(player.role)}</span>
      <span style={{color:WHITE,fontSize:23,fontWeight:900}}>{fmt(metric(player.role,player))}</span>
    </div>
    <div style={{display:"flex",gap:5,marginTop:9,height:43}}>
      {extras.map((detail,index)=><div key={index} style={{display:"flex",flexDirection:"column",
        width:177,backgroundColor:"#102A3C",borderRadius:8,padding:"4px 7px"}}>
        <span style={{color:MUTED,fontSize:12,whiteSpace:"nowrap"}}>{detail.label}</span>
        <span style={{color:WHITE,fontWeight:800,fontSize:16}}>{detail.value}</span>
      </div>)}
    </div>
  </div>;
}

function rolePanelHeight(players:number):number {
  return 118+Math.max(1,Math.ceil(players/2))*164;
}

function RoleContent({result,height}:{result:IntelligenceExportResult;height:number}) {
  const roleList = (["goalkeeper","defender","midfielder","forward"] as Role[])
    .filter(role=>result.options.role==="all"||role===result.options.role);
  return <div style={{display:"flex",flexDirection:"column",gap:16,width:"100%",height}}>
    {roleList.map(role=>{
      const players=roleOrdered(result,role);
      const games=players.reduce((sum,player)=>sum+player.matches,0);
      const weighted=players.reduce((sum,player)=>sum+player.rating*player.matches,0);
      const rows=Array.from({length:Math.ceil(players.length/2)},(_,i)=>players.slice(i*2,i*2+2));
      return <div key={role} style={{display:"flex",flexDirection:"column",flexShrink:0,
        width:1556,height:rolePanelHeight(players.length),padding:18,backgroundColor:PANEL,
        border:"2px solid "+BORDER,borderRadius:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,height:48}}>
          <span style={{color:GOLD,fontWeight:900,fontSize:27}}>{ROLE_NAMES[role].toUpperCase()}</span>
          <div style={{display:"flex",alignItems:"center",gap:25,color:MUTED,fontSize:17}}>
            <span>{players.length} profil{players.length>1?"s":""}</span>
            <span>{games} apparitions</span>
            <span>Note moyenne : <span style={{color:WHITE,fontWeight:900}}>{games?fmt(weighted/games):"—"}</span></span>
            <span style={{color:CYAN,fontWeight:800}}>{metricLabel(role)}</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:12}}>
          {rows.length ? rows.map((row,index)=><div key={index} style={{display:"flex",gap:14,height:151}}>
            {row.map((player,column)=><RolePlayer key={player.key+"-"+role}
              player={player} rank={index*2+column+1}/>)}
          </div>):<div style={{display:"flex",height:151,alignItems:"center",
            justifyContent:"center",color:MUTED,fontSize:22}}>
            Aucun joueur ne correspond aux critères de ce poste.
          </div>}
        </div>
      </div>;
    })}
  </div>;
}
function PairContent({ result }: { result: IntelligenceExportResult }) {
  return <div style={{ display: "flex", gap: 16, width: "100%", height: 398 }}>
    <Panel width={1040} title="ASSOCIATIONS LES PLUS RÉGULIÈRES">
      {result.pairs.length ? result.pairs.slice(0,7).map((p,i)=><Line key={p.key}>
        <span style={{ color: WHITE, fontSize: 21, fontWeight: 750, width: 420 }}>{i+1}. {(p.playerA+" + "+p.playerB).slice(0,34)}</span>
        <span style={{ color: MUTED, fontSize: 18, width: 174 }}>{p.games} matchs</span>
        <span style={{ color: CYAN, fontSize: 20 }}>{fmt(p.pointsPerMatch)} pts/match</span>
        <span style={{ color: GOLD, fontSize: 21, fontWeight: 900 }}>{fmt(p.winRate,1)} % V</span>
      </Line>):<Empty>Aucune association ne répond au nombre minimum de matchs communs.</Empty>}
    </Panel>
    <Panel width={500} title="COMMENT LIRE CES DUOS ?">
      <div style={{ display:"flex",flexDirection:"column",gap:19,color:MUTED,fontSize:22,lineHeight:1.45 }}>
        <span>• Matchs communs : présence sur les mêmes feuilles EA.</span>
        <span>• Points / match : 3 pour une victoire, 1 pour un nul.</span>
        <span>• Victoires : pourcentage de matchs gagnés ensemble.</span>
        <span style={{color:GOLD,fontSize:19}}>Ces statistiques ne démontrent pas une causalité tactique.</span>
      </div>
    </Panel>
  </div>;
}

export async function renderIntelligenceExport(roster: AtyomRoster, result: IntelligenceExportResult) {
  const { report, options } = result;
  const titles = { form: "Forme des joueurs", roles: "Analyse par poste", pairs: "Associations" };
  const scope = [result.seasonName ?? "Toutes les saisons", result.competitionName ?? "Toutes compétitions"];
  if (options.startDate || options.endDate)
    scope.push((options.startDate || "Début") + " → " + (options.endDate || "Aujourd'hui"));
  const title = titles[options.kind];
  const logo = await rosterPosterLogo(roster);
  const formRows = Math.ceil(result.players.length / 2);
  // Hauteur adaptative : tous les joueurs restent lisibles dans un seul PNG,
  // quel que soit le nombre de profils actifs ou la présence de joueurs en sommeil.
  const formPanelHeight = Math.max(398, 86 + formRows * 60);
  const activeRoles = (["goalkeeper","defender","midfielder","forward"] as Role[])
    .filter(role=>options.role==="all"||role===options.role);
  const rolePanelTotalHeight = activeRoles.reduce((total,role)=>
    total+rolePanelHeight(result.roles.filter(player=>player.role===role).length),0)
    + Math.max(0,activeRoles.length-1)*16;
  const posterHeight = options.kind==="form" ? Math.max(900,formPanelHeight+480)
    : options.kind==="roles" ? Math.max(900,rolePanelTotalHeight+480) : 900;
  const draw = async (activeLogo: string | null) => {
  const image = new ImageResponse(
    <div style={{ display:"flex", flexDirection:"column",width:1600,height:posterHeight,position:"relative",
      background:"linear-gradient(145deg,#031020 0%,#071D30 55%,#020B18 100%)",
      color:WHITE,fontFamily:"sans-serif",padding:"32px 22px" }}>
      <div style={{ display:"flex",alignItems:"center",height:84,gap:24,flexShrink:0 }}>
        {activeLogo && <img src={activeLogo} width={100} height={75}
          alt="" style={{objectFit:"contain",borderRadius:12}}/>}
        <div style={{ display:"flex",flexDirection:"column",width:270 }}>
          <span style={{color:GOLD,fontSize:26,fontWeight:900,letterSpacing:2}}>{roster.name.toUpperCase().slice(0,24)}</span>
          <span style={{color:MUTED,fontSize:17}}>CLUB ESPORT</span>
        </div>
        <div style={{display:"flex",height:65,width:3,backgroundColor:CYAN}}/>
        <span style={{fontSize:53,fontWeight:900}}>Intelligence <span style={{color:CYAN}}>sportive</span></span>
      </div>
      <div style={{display:"flex",flexDirection:"column",height:129,border:"2px solid "+BORDER,borderRadius:23,
        padding:"16px 24px",backgroundColor:"#092034",marginTop:7}}>
        <span style={{color:GOLD,fontSize:17,fontWeight:900,letterSpacing:2}}>ANALYSE BASÉE SUR LES MATCHS EA</span>
        <span style={{fontSize:42,fontWeight:900,color:WHITE,marginTop:3}}>{title}</span>
        <span style={{color:MUTED,fontSize:17,marginTop:4}}>{scope.join("  ·  ")}  ·  {options.includeDormant ? "Joueurs en sommeil inclus" : "Effectif actif uniquement"}</span>
      </div>
      <div style={{display:"flex",gap:15,marginTop:14,height:124,flexShrink:0}}>
        <Stat label="Matchs analysés" value={report.matches} detail={date(report.minDate)+" → "+date(report.maxDate)}/>
        <Stat label="Joueurs étudiés" value={report.players.length} detail="Avec données EA"/>
        <Stat label="Forme en hausse" value={report.players.filter(p=>p.trend==="up").length} detail="Seuil : +0,35 point"/>
        <Stat label="Duos évaluables" value={report.pairs.length} detail="Au moins 8 matchs communs"/>
      </div>
      <div style={{display:"flex",marginTop:14}}>
        {options.kind==="form"? <FormContent result={result} height={formPanelHeight}/> :
          options.kind==="roles"?<RoleContent result={result} height={rolePanelTotalHeight}/>:<PairContent result={result}/>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,color:MUTED,fontSize:16}}>
        <span>{report.truncated ? "Historique limité aux 250 matchs les plus récents • " : ""}Statistiques EA corrigées par le staff • {options.kind==="pairs"?"Minimum "+options.pairMinimum+" matchs communs":"Échantillons "+(options.minSamples?"suffisants":"libres")}</span>
        <span style={{color:GOLD,fontWeight:700}}>Export Discord • ATYOM</span>
      </div>
    </div>, {width:1600,height:posterHeight}
  );
  return new Uint8Array(await image.arrayBuffer());
  };
  try {
    return await draw(logo);
  } catch (error) {
    if (!logo) throw error;
    console.warn("ATYOM intelligence: logo indisponible pour l'export, rendu sans image.");
    return draw(null);
  }
}
