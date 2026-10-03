import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CLUB_ID = "1663";
const DEFAULT_FORMATION = "3-5-2";

type LineupSpot = {
  slot: string;
  name: string;
  x: number;
  y: number;
};

type FormationSlot = {
  slot: string;
  label: string;
  x: number;
  y: number;
};

type FormationDefinition = {
  name: string;
  slots: FormationSlot[];
};

/* =========================================================
   DISPOSITIFS
========================================================= */

const FORMATIONS: FormationDefinition[] = [
  {
    name: "3-5-2",
    slots: [
      { slot: "GK", label: "Gardien", x: 50, y: 89 },

      { slot: "DCG", label: "Défenseur central gauche", x: 25, y: 70 },
      { slot: "DC", label: "Défenseur central", x: 50, y: 73 },
      { slot: "DCD", label: "Défenseur central droit", x: 75, y: 70 },

      { slot: "MG", label: "Milieu gauche", x: 9, y: 45 },
      { slot: "MDG", label: "Milieu défensif gauche", x: 32, y: 50 },
      { slot: "MOC", label: "Milieu offensif", x: 50, y: 39 },
      { slot: "MDD", label: "Milieu défensif droit", x: 68, y: 50 },
      { slot: "MD", label: "Milieu droit", x: 91, y: 45 },

      { slot: "ATG", label: "Attaquant gauche", x: 35, y: 17 },
      { slot: "ATD", label: "Attaquant droit", x: 65, y: 17 },
    ],
  },

  {
    name: "3-1-4-2",
    slots: [
      { slot: "GK", label: "Gardien", x: 50, y: 89 },

      { slot: "DCG", label: "Défenseur central gauche", x: 25, y: 72 },
      { slot: "DC", label: "Défenseur central", x: 50, y: 74 },
      { slot: "DCD", label: "Défenseur central droit", x: 75, y: 72 },

      { slot: "MDC", label: "Milieu défensif", x: 50, y: 57 },

      { slot: "MG", label: "Milieu gauche", x: 10, y: 42 },
      { slot: "MCG", label: "Milieu central gauche", x: 36, y: 43 },
      { slot: "MCD", label: "Milieu central droit", x: 64, y: 43 },
      { slot: "MD", label: "Milieu droit", x: 90, y: 42 },

      { slot: "ATG", label: "Attaquant gauche", x: 35, y: 17 },
      { slot: "ATD", label: "Attaquant droit", x: 65, y: 17 },
    ],
  },

  {
    name: "3-4-1-2",
    slots: [
      { slot: "GK", label: "Gardien", x: 50, y: 89 },

      { slot: "DCG", label: "Défenseur central gauche", x: 25, y: 71 },
      { slot: "DC", label: "Défenseur central", x: 50, y: 74 },
      { slot: "DCD", label: "Défenseur central droit", x: 75, y: 71 },

      { slot: "MG", label: "Milieu gauche", x: 10, y: 48 },
      { slot: "MCG", label: "Milieu central gauche", x: 37, y: 50 },
      { slot: "MCD", label: "Milieu central droit", x: 63, y: 50 },
      { slot: "MD", label: "Milieu droit", x: 90, y: 48 },

      { slot: "MOC", label: "Milieu offensif", x: 50, y: 33 },

      { slot: "ATG", label: "Attaquant gauche", x: 35, y: 15 },
      { slot: "ATD", label: "Attaquant droit", x: 65, y: 15 },
    ],
  },

  {
    name: "4-4-2",
    slots: [
      { slot: "GK", label: "Gardien", x: 50, y: 89 },

      { slot: "DG", label: "Défenseur gauche", x: 10, y: 69 },
      { slot: "DCG", label: "Défenseur central gauche", x: 36, y: 73 },
      { slot: "DCD", label: "Défenseur central droit", x: 64, y: 73 },
      { slot: "DD", label: "Défenseur droit", x: 90, y: 69 },

      { slot: "MG", label: "Milieu gauche", x: 10, y: 44 },
      { slot: "MCG", label: "Milieu central gauche", x: 37, y: 47 },
      { slot: "MCD", label: "Milieu central droit", x: 63, y: 47 },
      { slot: "MD", label: "Milieu droit", x: 90, y: 44 },

      { slot: "ATG", label: "Attaquant gauche", x: 35, y: 17 },
      { slot: "ATD", label: "Attaquant droit", x: 65, y: 17 },
    ],
  },

  {
    name: "4-2-3-1",
    slots: [
      { slot: "GK", label: "Gardien", x: 50, y: 89 },

      { slot: "DG", label: "Défenseur gauche", x: 10, y: 70 },
      { slot: "DCG", label: "Défenseur central gauche", x: 36, y: 73 },
      { slot: "DCD", label: "Défenseur central droit", x: 64, y: 73 },
      { slot: "DD", label: "Défenseur droit", x: 90, y: 70 },

      { slot: "MDCG", label: "Milieu défensif gauche", x: 37, y: 55 },
      { slot: "MDCD", label: "Milieu défensif droit", x: 63, y: 55 },

      { slot: "MOG", label: "Milieu offensif gauche", x: 18, y: 34 },
      { slot: "MOC", label: "Milieu offensif", x: 50, y: 36 },
      { slot: "MOD", label: "Milieu offensif droit", x: 82, y: 34 },

      { slot: "BU", label: "Buteur", x: 50, y: 14 },
    ],
  },

  {
    name: "4-3-3",
    slots: [
      { slot: "GK", label: "Gardien", x: 50, y: 89 },

      { slot: "DG", label: "Défenseur gauche", x: 10, y: 70 },
      { slot: "DCG", label: "Défenseur central gauche", x: 36, y: 73 },
      { slot: "DCD", label: "Défenseur central droit", x: 64, y: 73 },
      { slot: "DD", label: "Défenseur droit", x: 90, y: 70 },

      { slot: "MCG", label: "Milieu central gauche", x: 30, y: 48 },
      { slot: "MC", label: "Milieu central", x: 50, y: 53 },
      { slot: "MCD", label: "Milieu central droit", x: 70, y: 48 },

      { slot: "AG", label: "Ailier gauche", x: 17, y: 20 },
      { slot: "BU", label: "Buteur", x: 50, y: 14 },
      { slot: "AD", label: "Ailier droit", x: 83, y: 20 },
    ],
  },

  {
    name: "4-1-2-1-2",
    slots: [
      { slot: "GK", label: "Gardien", x: 50, y: 89 },

      { slot: "DG", label: "Défenseur gauche", x: 10, y: 70 },
      { slot: "DCG", label: "Défenseur central gauche", x: 36, y: 73 },
      { slot: "DCD", label: "Défenseur central droit", x: 64, y: 73 },
      { slot: "DD", label: "Défenseur droit", x: 90, y: 70 },

      { slot: "MDC", label: "Milieu défensif", x: 50, y: 57 },

      { slot: "MCG", label: "Milieu central gauche", x: 33, y: 44 },
      { slot: "MCD", label: "Milieu central droit", x: 67, y: 44 },

      { slot: "MOC", label: "Milieu offensif", x: 50, y: 31 },

      { slot: "ATG", label: "Attaquant gauche", x: 35, y: 14 },
      { slot: "ATD", label: "Attaquant droit", x: 65, y: 14 },
    ],
  },

  {
    name: "5-3-2",
    slots: [
      { slot: "GK", label: "Gardien", x: 50, y: 89 },

      { slot: "DG", label: "Piston gauche", x: 8, y: 64 },
      { slot: "DCG", label: "Défenseur central gauche", x: 30, y: 73 },
      { slot: "DC", label: "Défenseur central", x: 50, y: 76 },
      { slot: "DCD", label: "Défenseur central droit", x: 70, y: 73 },
      { slot: "DD", label: "Piston droit", x: 92, y: 64 },

      { slot: "MCG", label: "Milieu central gauche", x: 30, y: 44 },
      { slot: "MC", label: "Milieu central", x: 50, y: 49 },
      { slot: "MCD", label: "Milieu central droit", x: 70, y: 44 },

      { slot: "ATG", label: "Attaquant gauche", x: 35, y: 16 },
      { slot: "ATD", label: "Attaquant droit", x: 65, y: 16 },
    ],
  },
];

/* =========================================================
   GET
========================================================= */

export async function GET() {
  try {
    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from("lineups")
      .select(`
        formation,
        lineup,
        bench,
        updated_at
      `)
      .eq(
        "club_id",
        CLUB_ID
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message
      );
    }

    const requestedFormation =
      typeof data?.formation ===
        "string" &&
      getFormation(
        data.formation
      )
        ? data.formation
        : DEFAULT_FORMATION;

    const storedLineup =
      Array.isArray(
        data?.lineup
      )
        ? (data.lineup as LineupSpot[])
        : [];

    const lineup =
      normalizeLineup(
        requestedFormation,
        storedLineup
      );

    const bench =
      Array.isArray(
        data?.bench
      )
        ? data.bench.filter(
            (
              player
            ): player is string =>
              typeof player ===
              "string"
          )
        : [];

    return NextResponse.json({
      clubId:
        CLUB_ID,

      formation:
        requestedFormation,

      lineup,

      bench,

      formations:
        FORMATIONS,

      updatedAt:
        data?.updated_at ??
        null,
    });
  } catch (error) {
    console.error(
      "Erreur GET /api/lineup :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer la composition.",

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

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const formation =
      typeof body.formation ===
      "string"
        ? body.formation
        : "";

    const definition =
      getFormation(
        formation
      );

    if (!definition) {
      return NextResponse.json(
        {
          error:
            "Le dispositif sélectionné n'est pas valide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(
        body.lineup
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La composition doit être un tableau.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.lineup.length !==
      11
    ) {
      return NextResponse.json(
        {
          error:
            "Le dispositif doit contenir exactement 11 titulaires.",
        },
        {
          status: 400,
        }
      );
    }

    const lineup =
      definition.slots.map(
        (
          position
        ) => {
          const received =
            body.lineup.find(
              (
                spot: LineupSpot
              ) =>
                spot.slot ===
                position.slot
            );

          return {
            slot:
              position.slot,

            name:
              typeof received?.name ===
              "string"
                ? received.name.trim()
                : "",

            x:
              position.x,

            y:
              position.y,
          };
        }
      );

    const emptyPosition =
      lineup.find(
        (spot) =>
          !spot.name
      );

    if (emptyPosition) {
      return NextResponse.json(
        {
          error:
            `Aucun joueur n'est sélectionné au poste ${emptyPosition.slot}.`,
        },
        {
          status: 400,
        }
      );
    }

    const bench =
      Array.isArray(
        body.bench
      )
        ? body.bench
            .filter(
              (
                player: unknown
              ): player is string =>
                typeof player ===
                "string"
            )
            .map(
              (player: string) =>
                player.trim()
            )
            .filter(
              Boolean
            )
        : [];

    /* =====================================================
       DOUBLONS
    ===================================================== */

    const usedPlayers =
      new Set<string>();

    for (
      const spot
      of lineup
    ) {
      const normalized =
        normalizePlayerName(
          spot.name
        );

      if (
        usedPlayers.has(
          normalized
        )
      ) {
        return NextResponse.json(
          {
            error:
              `${spot.name} est présent plusieurs fois dans le onze.`,
          },
          {
            status: 400,
          }
        );
      }

      usedPlayers.add(
        normalized
      );
    }

    for (
      const playerName
      of bench
    ) {
      const normalized =
        normalizePlayerName(
          playerName
        );

      if (
        usedPlayers.has(
          normalized
        )
      ) {
        return NextResponse.json(
          {
            error:
              `${playerName} est déjà utilisé dans le onze ou sur le banc.`,
          },
          {
            status: 400,
          }
        );
      }

      usedPlayers.add(
        normalized
      );
    }

    /* =====================================================
       SAUVEGARDE
    ===================================================== */

    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from("lineups")
      .upsert(
        {
          club_id:
            CLUB_ID,

          formation,

          lineup,

          bench,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "club_id",
        }
      )
      .select(`
        formation,
        lineup,
        bench,
        updated_at
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

      formation:
        data.formation,

      lineup:
        data.lineup,

      bench:
        data.bench,

      updatedAt:
        data.updated_at,
    });
  } catch (error) {
    console.error(
      "Erreur POST /api/lineup :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible d'enregistrer la composition.",

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

/* =========================================================
   OUTILS
========================================================= */

function getFormation(
  name: string
) {
  return FORMATIONS.find(
    (formation) =>
      formation.name ===
      name
  );
}

function normalizeLineup(
  formationName: string,
  currentLineup: LineupSpot[]
) {
  const definition =
    getFormation(
      formationName
    ) ??
    FORMATIONS[0];

  const alreadyUsed =
    new Set<string>();

  const remainingPlayers =
    currentLineup
      .map(
        (spot) =>
          spot.name
      )
      .filter(
        Boolean
      );

  return definition.slots.map(
    (position) => {
      const samePosition =
        currentLineup.find(
          (spot) =>
            spot.slot ===
              position.slot &&
            spot.name &&
            !alreadyUsed.has(
              normalizePlayerName(
                spot.name
              )
            )
        );

      let playerName =
        samePosition?.name ??
        "";

      if (!playerName) {
        const fallback =
          remainingPlayers.find(
            (name) =>
              !alreadyUsed.has(
                normalizePlayerName(
                  name
                )
              )
          );

        playerName =
          fallback ??
          "";
      }

      if (playerName) {
        alreadyUsed.add(
          normalizePlayerName(
            playerName
          )
        );
      }

      return {
        slot:
          position.slot,

        name:
          playerName,

        x:
          position.x,

        y:
          position.y,
      };
    }
  );
}

function normalizePlayerName(
  name: string
) {
  return name
    .toLowerCase()
    .replace(
      /^gx[_\-\s]?/i,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}