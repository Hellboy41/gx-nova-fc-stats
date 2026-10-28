"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Building2, CheckCircle2, Layers3, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import type { StaffRole } from "@/lib/auth/require-staff";
import type { WorkspaceContext } from "@/lib/platform/workspace";
import { useClubBranding } from "@/lib/platform/use-club-branding";

type WorkspacePayload = {
  workspace: WorkspaceContext;
  membership: { role: StaffRole; displayName: string };
  actions: { createOrganisation: boolean; createRoster: boolean; switchRoster: boolean };
};

export default function OrganisationPage() {
  const branding = useClubBranding();
  const [payload, setPayload] = useState<WorkspacePayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store", signal: controller.signal });
        const json = await response.json() as WorkspacePayload & { error?: string };
        if (!response.ok) throw new Error(json.error ?? "Impossible d'accéder à la structure.");
        if (!controller.signal.aborted) setPayload(json);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Espace indisponible.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const organisation = payload?.workspace.organisation;
  const rosters = payload?.workspace.rosters ?? [];

  return (
    <main className="min-h-screen bg-[#060606] pb-16 text-white">
      <header className="border-b border-white/10 bg-[#0A0A0A]">
        <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-5 py-6">
          <a href="/" aria-label="Retour à l'accueil" className="rounded-xl border border-white/10 p-3 text-slate-400 hover:text-yellow-300"><ArrowLeft size={19}/></a>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest" style={{color:branding.structure.primaryColor}}>{branding.structure.name} · Pilotage de la plateforme</p>
            <h1 className="mt-1 text-2xl font-black">Structure et <span className="text-cyan-300">rosters</span></h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] space-y-6 px-5 py-7">
        <section className="rounded-2xl border bg-gradient-to-br from-[#17130A] to-[#090909] p-6" style={{borderColor:branding.structure.primaryColor + "40"}}>
          <p className="text-xs font-black uppercase tracking-widest text-yellow-300">Vision produit</p>
          <h2 className="mt-2 text-xl font-black">Une structure esport, plusieurs rosters indépendants.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Cette version présente l'organisation des espaces. GX NØVA reste l'unique roster connecté pendant la phase pilote.
            L'ouverture à d'autres clubs sera activée une fois les autorisations et les données isolées pour chaque structure.
          </p>
        </section>

        {loading && <p role="status" className="rounded-xl border border-white/10 p-5 text-sm text-slate-400">Chargement de l'espace…</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-200">{error}</p>}

        {payload && organisation && <>
          <section className="rounded-2xl border border-white/10 bg-[#101010] p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-2xl border bg-white/[0.03] p-4" style={{ borderColor: branding.structure.primaryColor + "66" }}>
                {branding.structure.logoUrl
                  ? <img src={branding.structure.logoUrl} alt={branding.structure.name} className="h-12 w-12 object-contain"/>
                  : <Building2 size={28} style={{ color: branding.structure.primaryColor }}/>}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Structure esport</p>
                <h2 className="mt-1 text-xl font-black" style={{color:branding.structure.primaryColor}}>{branding.structure.name}</h2>
                <p className="mt-1 text-xs text-slate-400">Identité de la structure · Membre : {payload.membership.displayName} · {payload.membership.role.toUpperCase()}</p>
              </div>
              <span className="rounded-xl border border-yellow-400/25 bg-yellow-400/[0.05] px-3 py-2 text-xs font-black text-yellow-200">Structure pilote</span>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#101010] p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black"><Layers3 size={19} className="text-yellow-300"/> Rosters de la structure</h2>
                <p className="mt-2 text-xs text-slate-400">{rosters.length} roster(s) référencé(s) sur la plateforme pilote</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {rosters.map((roster) => <div key={roster.id} className="rounded-xl border border-cyan-400/20 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  {branding.roster.logoUrl ? <img src={branding.roster.logoUrl} alt={branding.roster.name} className="h-12 w-12 object-contain"/> : <Users size={32} className="text-slate-400"/>}
                  <div className="flex-1">
                    <h3 className="font-black">{roster.id === payload.workspace.activeRosterId ? branding.roster.name : roster.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">{roster.gameEdition} · EA Club ID {roster.eaClubId}</p>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-300"/>
                </div>
                <a href="/" className="mt-4 inline-flex rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-yellow-200 hover:border-yellow-400/30">Ouvrir ce roster</a>
              </div>)}
            </div>
          </section>

          <section className="rounded-2xl border border-yellow-400/15 bg-[#091626] p-6">
            <h2 className="flex items-center gap-2 font-black"><LockKeyhole size={19} className="text-yellow-300"/> Préparation de la version multi-structures</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">La création de nouvelles structures, l'ajout de rosters et le changement de roster ne sont pas encore disponibles : ces actions resteront bloquées jusqu'à l'activation d'une isolation vérifiée des données.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                { icon: Building2, title: "Structures", text: "Une identité, des couleurs et des paramètres propres à chaque club." },
                { icon: Users, title: "Membres", text: "Propriétaires, administrateurs, staff et viewers par organisation." },
                { icon: ShieldCheck, title: "Sécurité", text: "Toutes les requêtes liées au roster et vérifiées côté serveur." },
              ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-xl border border-white/10 bg-black/15 p-4">
                <Icon size={20} className="mb-3 text-cyan-300"/>
                <h3 className="text-sm font-black">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{text}</p>
              </div>)}
            </div>
          </section>
        </>}
      </div>
    </main>
  );
}
