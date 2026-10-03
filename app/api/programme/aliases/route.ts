import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const CLUB_ID = "1663";
const GENERIC_WORDS = new Set(["fc", "esport", "esports", "club", "team", "gaming"]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeName(value: string) {
  const cleaned = value
    .replace(/[Øø]/g, "o")
    .replace(/[Œœ]/g, "oe")
    .replace(/[Ææ]/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const filtered = tokens.filter((token) => !GENERIC_WORDS.has(token));
  return (filtered.length ? filtered : tokens).join(" ");
}

export async function GET() {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("opponent_aliases")
    .select("id, programme_name, ea_name, ea_club_id, updated_at")
    .eq("club_id", CLUB_ID)
    .order("programme_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ aliases: data ?? [] });
}

export async function POST(request: Request) {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;

  const body = await request.json().catch(() => ({}));
  const programmeName = cleanText(body.programmeName, 120);
  const eaName = cleanText(body.eaName, 120);
  const eaClubId = cleanText(body.eaClubId, 40) || null;

  if (!programmeName || !eaName) {
    return NextResponse.json(
      { error: "Les deux noms d'adversaire sont obligatoires." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("opponent_aliases")
    .upsert(
      {
        club_id: CLUB_ID,
        programme_name: programmeName,
        programme_normalized: normalizeName(programmeName),
        ea_name: eaName,
        ea_normalized: normalizeName(eaName),
        ea_club_id: eaClubId,
        created_by: authorization.profile?.userId ?? null,
        updated_at: now,
      },
      { onConflict: "club_id,programme_normalized" }
    )
    .select("id, programme_name, ea_name, ea_club_id, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, alias: data });
}

export async function DELETE(request: Request) {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id") ?? 0);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Alias invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("opponent_aliases")
    .delete()
    .eq("club_id", CLUB_ID)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
