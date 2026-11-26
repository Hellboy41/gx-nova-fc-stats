import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import type { AtyomRoster } from "@/lib/platform/rosters";
import { rosterPosterLogo } from "@/lib/discord/media";
import type { IntelligenceExportResult } from "@/lib/sport-intelligence/export";
import type { Role } from "@/lib/sport-intelligence";

const BG = "#031020";
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
function FormContent({ result }: { result: IntelligenceExportResult }) {
  const rising = result.players.filter(p => p.trend === "up").sort((a, b) => (b.ratingDelta ?? 0) - (a.ratingDelta ?? 0)).slice(0, 7);
  const falling = result.players.filter(p => p.trend === "down").sort((a, b) => (a.ratingDelta ?? 0) - (b.ratingDelta ?? 0)).slice(0, 5);
  const stable = result.players.filter(p => p.trend === "stable").slice(0, 5);
  const featured = rising.length ? rising : stable;
  return <div style={{ display: "flex", gap: 16, width: "100%", height: 398 }}>
    <Panel width={935} title={rising.length ? "FORME EN HAUSSE" : "FORME DES JOUEURS"}>
      {featured.length ? featured.map((p, i) => <Line key={p.key}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ color: CYAN, width: 34, fontSize: 21, fontWeight: 900 }}>{String(i+1).padStart(2, "0")}</span>
          <span style={{ color: WHITE, fontWeight: 800, fontSize: 22, width: 238, overflow: "hidden" }}>{p.name.slice(0, 21)}</span>
          <span style={{ color: CYAN, width: 70, fontSize: 16 }}>{ROLE_ABBR[p.role]}</span>
          <span style={{ color: MUTED, fontSize: 17 }}>Avant {fmt(p.previousRating)} → Après {fmt(p.recentRating)}</span>
        </div>
        <span style={{ color: p.ratingDelta !== null && p.ratingDelta > 0 ? GREEN : MUTED, fontSize: 24, fontWeight: 900 }}>
          {p.ratingDelta === null ? "—" : (p.ratingDelta > 0 ? "+" : "") + fmt(p.ratingDelta)}
        </span>
      </Line>): <Empty>Aucun joueur ne remplit les critères de forme pour cette sélection.</Empty>}
    </Panel>
    <Panel width={605} title="À SURVEILLER">
      {falling.length ? falling.map(p => <Line key={p.key}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: WHITE, fontWeight: 800, fontSize: 22 }}>{p.name.slice(0, 24)}</span>
          <span style={{ color: MUTED, fontSize: 16 }}>{ROLE_NAMES[p.role]} · {p.recentCount} notes récentes</span>
        </div>
        <span style={{ color: RED, fontSize: 24, fontWeight: 900 }}>{fmt(p.ratingDelta)}</span>
      </Line>): <Empty>Aucune baisse significative détectée parmi les joueurs filtrés.</Empty>}
    </Panel>
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
function RoleContent({ result }: { result: IntelligenceExportResult }) {
  const roleList = (["goalkeeper", "defender", "midfielder", "forward"] as Role[])
    .filter(role => result.options.role === "all" || role === result.options.role);
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 16, width: "100%", height: 398 }}>
    {roleList.map(role => {
      const list = result.roles.filter(p => p.role === role).sort((a,b) => metric(role,b) - metric(role,a) || b.matches-a.matches);
      const weighted = list.reduce((s,p) => s+p.rating*p.matches,0);
      const n = list.reduce((s,p)=>s+p.matches,0);
      return <Panel key={role} width={roleList.length===1?1556:roleList.length===2?770:375} title={ROLE_NAMES[role].toUpperCase()}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 7 }}>
          <span style={{ color: MUTED, fontSize: 16 }}>Note moyenne <span style={{ color: WHITE, fontWeight: 900 }}>{n?fmt(weighted/n):"—"}</span></span>
          <span style={{ color: MUTED, fontSize: 16 }}>Apparitions <span style={{ color: WHITE, fontWeight: 900 }}>{n}</span></span>
          <span style={{ color: CYAN, fontSize: 17 }}>{metricLabel(role)}</span>
        </div>
        {list.length ? list.slice(0,3).map((p,i) => <Line key={p.key}>
          <span style={{ color: WHITE, fontSize: 18, fontWeight: 750 }}>{i+1}. {p.name.slice(0, 14)}</span>
          <span style={{ color: MUTED, fontSize: 14 }}>{p.matches} m.</span>
          <span style={{ color: CYAN, fontSize: 19, fontWeight: 900 }}>{fmt(metric(role,p))}</span>
        </Line>) : <Empty>Aucune donnée suffisante pour ce poste.</Empty>}
      </Panel>;
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
  const draw = async (activeLogo: string | null) => {
  const image = new ImageResponse(
    <div style={{ display:"flex", flexDirection:"column",width:1600,height:900,position:"relative",
      background:"linear-gradient(145deg,#031020 0%,#071D30 55%,#020B18 100%)",
      color:WHITE,fontFamily:"sans-serif",padding:"32px 22px" }}>
      <div style={{ display:"flex",alignItems:"center",height:84,gap:24,flexShrink:0 }}>
        {activeLogo ? <img src={activeLogo} width={100} height={75}
          alt="" style={{objectFit:"contain",borderRadius:12}}/> :
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            width:100,height:75,border:"2px solid "+CYAN,borderRadius:15,backgroundColor:PANEL }}>
            <span style={{color:GOLD,fontSize:31,fontWeight:900}}>GX</span>
            <span style={{color:WHITE,fontSize:15,fontWeight:800}}>NØVA</span>
          </div>}
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
        {options.kind==="form"? <FormContent result={result}/> :
          options.kind==="roles"?<RoleContent result={result}/>:<PairContent result={result}/>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,color:MUTED,fontSize:16}}>
        <span>{report.truncated ? "Historique limité aux 250 matchs les plus récents • " : ""}Statistiques EA corrigées par le staff • {options.kind==="pairs"?"Minimum "+options.pairMinimum+" matchs communs":"Échantillons "+(options.minSamples?"suffisants":"libres")}</span>
        <span style={{color:GOLD,fontWeight:700}}>Export Discord • ATYOM</span>
      </div>
    </div>, {width:1600,height:900}
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
