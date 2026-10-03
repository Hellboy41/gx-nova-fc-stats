import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CLUB_ID = "1663";

/* =========================================================
   GET
   Liste les matchs et leur compétition
========================================================= */

export async function GET() {
  try {
    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from("matches")
      .select(`
        id,
        ea_match_id,
        played_at,
        match_type,
        opponent_name,
        goals_for,
        goals_against,
        result,
        season_id,
        competition_id,
        seasons (
          id,
          name
        ),
        competitions (
          id,
          name,
          short_name
        )
      `)
      .eq(
        "club_id",
        CLUB_ID
      )
      .order(
        "played_at",
        {
          ascending:
            false,

          nullsFirst:
            false,
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    return NextResponse.json(
      data ?? []
    );
  } catch (error) {
    console.error(
      "Erreur GET match-competition :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les matchs.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   Affecte un match à une compétition
========================================================= */

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const matchId =
      Number(
        body.matchId
      );

    const seasonId =
      body.seasonId
        ? Number(
            body.seasonId
          )
        : null;

    const competitionId =
      body.competitionId
        ? Number(
            body.competitionId
          )
        : null;

    if (
      !Number.isInteger(
        matchId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Identifiant du match invalide.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      createAdminClient();

    /*
     * Vérification :
     * le match appartient bien
     * à GX NOVA.
     */

    const {
      data: match,
      error: matchError,
    } = await supabase
      .from("matches")
      .select(
        "id, club_id"
      )
      .eq(
        "id",
        matchId
      )
      .eq(
        "club_id",
        CLUB_ID
      )
      .maybeSingle();

    if (
      matchError ||
      !match
    ) {
      return NextResponse.json(
        {
          error:
            "Match introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Vérification saison
     */

    if (seasonId) {
      const {
        data: season,
        error: seasonError,
      } = await supabase
        .from("seasons")
        .select(
          "id"
        )
        .eq(
          "id",
          seasonId
        )
        .eq(
          "club_id",
          CLUB_ID
        )
        .maybeSingle();

      if (
        seasonError ||
        !season
      ) {
        return NextResponse.json(
          {
            error:
              "Saison invalide.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Vérification compétition
     */

    if (
      competitionId
    ) {
      const {
        data:
          competition,

        error:
          competitionError,
      } = await supabase
        .from(
          "competitions"
        )
        .select(
          "id"
        )
        .eq(
          "id",
          competitionId
        )
        .eq(
          "club_id",
          CLUB_ID
        )
        .maybeSingle();

      if (
        competitionError ||
        !competition
      ) {
        return NextResponse.json(
          {
            error:
              "Compétition invalide.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Mise à jour
     */

    const {
      data,
      error,
    } = await supabase
      .from("matches")
      .update({
        season_id:
          seasonId,

        competition_id:
          competitionId,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        matchId
      )
      .select(`
        id,
        season_id,
        competition_id
      `)
      .single();

    if (error) {
      throw new Error(
        error.message
      );
    }

    return NextResponse.json({
      success:
        true,

      match:
        data,
    });
  } catch (error) {
    console.error(
      "Erreur POST match-competition :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible d'affecter le match.",

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