"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const CLUB_LOGO_CANDIDATES = [
  "/logo-gx-nova.png",
  "/gx-nova.png",
  "/logo.png",
  "/logo-gx-nova.webp",
  "/gx-nova.webp",
  "/logo.svg",
];

function ClubLogo() {
  const [logoIndex, setLogoIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = CLUB_LOGO_CANDIDATES[logoIndex];

  return (
    <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-yellow-400/30 bg-[#07111f] shadow-[0_0_35px_rgba(250,204,21,0.16)]">
      {!failed ? (
        <img
          src={src}
          alt="Logo GX NOVA"
          width={96}
          height={96}
          className="h-full w-full object-contain p-2"
          onError={() => {
            const nextIndex = logoIndex + 1;

            if (nextIndex < CLUB_LOGO_CANDIDATES.length) {
              setLogoIndex(nextIndex);
            } else {
              setFailed(true);
            }
          }}
        />
      ) : (
        <Shield
          size={44}
          className="text-yellow-400"
        />
      )}
    </div>
  );
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
    <main className="flex min-h-screen items-center justify-center bg-[#030914] px-5 text-white">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <ClubLogo />

          <h1 className="mt-5 text-3xl font-black">
            GX <span className="text-yellow-400">NOVA</span>
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            FC27 Performance Center
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-[#091626] p-6 shadow-2xl"
        >
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.05] p-4">
            <LockKeyhole
              size={18}
              className="mt-0.5 shrink-0 text-yellow-400"
            />

            <p className="text-sm leading-6 text-gray-400">
              Accès réservé au staff GX NOVA.
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
              placeholder="staff@gxnova.fr"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#050d18] px-4 py-3.5 outline-none transition focus:border-yellow-400/40"
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
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#050d18] px-4 py-3.5 outline-none transition focus:border-yellow-400/40"
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
            Aucun compte ne peut être créé depuis cette page. Les accès sont gérés par l'administrateur GX NOVA.
          </p>
        </form>
      </div>
    </main>
  );
}
