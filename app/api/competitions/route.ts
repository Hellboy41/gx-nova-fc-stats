import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CLUB_ID = "1663";

export async function GET() {
  try {
    const supabase =
      createAdminClient();

    const {
      data: seasons,
      error: seasonsError,
    } = await supabase
      .from("seasons")
      .select(`
        id,
        name,
        starts_on,
        ends_on,
        is_active
      `)
      .eq("club_id", CLUB_ID)
      .order("id");

    if (seasonsError) {
      throw new Error(
        seasonsError.message
      );
    }

    const {
      data: competitions,
      error: competitionsError,
    } = await supabase
      .from("competitions")
      .select(`
        id,
        name,
        short_name,
        competition_type
      `)
      .eq("club_id", CLUB_ID)
      .order("id");

    if (competitionsError) {
      throw new Error(
        competitionsError.message
      );
    }

    return NextResponse.json({
      seasons:
        seasons ?? [],

      competitions:
        competitions ?? [],
    });
  } catch (error) {
    console.error(
      "Erreur /api/competitions :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les compétitions.",

        details:
          error instanceof Error
            ? error.message
            : "Erreur inconnue.",
      },
      {
        status: 500,
      }
    );
  }
}