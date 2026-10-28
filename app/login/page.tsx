"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useClubBranding } from "@/lib/platform/use-club-branding";

function StructureLogo() {
  const {structure} = useClubBranding();
  const [failed,setFailed] = useState(false);
  return <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[#FBD046]/50 bg-black shadow-[0_0_35px_rgba(251,208,70,0.14)]">
    {structure.logoUrl && !failed ? <img src={structure.logoUrl} alt="Logo ATYOM" className="h-full w-full object-contain p-1" onError={() => setFailed(true)}/> :
    <span className="text-5xl font-black text-[#FBD046]">A</span>}
  </div>;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw new Error(
          "Adresse e-mail ou mot de passe incorrect."
        );
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de se connecter."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060606] px-5 text-white">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <StructureLogo />

          <h1 className="mt-5 text-3xl font-black">
            <span className="text-[#FBD046]">ATYOM</span>
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Plateforme Esport · Gestion des rosters
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-[#101010] p-6 shadow-2xl"
        >
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.05] p-4">
            <LockKeyhole
              size={18}
              className="mt-0.5 shrink-0 text-yellow-400"
            />

            <p className="text-sm leading-6 text-gray-400">
              Accès réservé aux utilisateurs autorisés par ATYOM.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">
              Adresse e-mail
            </span>

            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="utilisateur@exemple.fr"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#090909] px-4 py-3.5 outline-none transition focus:border-yellow-400/40"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">
              Mot de passe
            </span>

            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••••"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#090909] px-4 py-3.5 outline-none transition focus:border-yellow-400/40"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-yellow-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <p className="mt-5 text-center text-[11px] leading-5 text-gray-600">
            Aucun compte ne peut être créé depuis cette page. Les accès sont gérés par les administrateurs ATYOM.
          </p>
        </form>
      </div>
    </main>
  );
}
