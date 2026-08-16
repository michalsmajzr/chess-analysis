import { Chess } from "chess.js";
import { mapPlayer } from "@/api/players";
import { extractSan } from "@/utils/tree";
import { Game, Pairing, Tournament, RoundInfo } from "@/types/Game";

const BASE_URL = "https://1.pool.livechesscloud.com/get";

export async function fetchData(
  bases: string[],
  selectedRounds: Record<number, number>,
): Promise<{
  tournaments: Tournament[];
  info: RoundInfo;
  games: Game[];
}> {
  const results = await Promise.all(
    bases.map(async (baseId, index) => {
      try {
        const tournamentResponse = await fetch(
          `${BASE_URL}/${baseId}/tournament.json`,
        );

        if (!tournamentResponse.ok) {
          return null;
        }

        const tournament = await tournamentResponse.json();
        const roundId = selectedRounds[index] ?? 1;

        // load round
        const roundResponse = await fetch(
          `${BASE_URL}/${baseId}/round-${roundId}/index.json`,
        );

        if (!roundResponse.ok) {
          return null;
        }

        const round = await roundResponse.json();

        const validPairings: { pairing: Pairing; index: number }[] = (
          round.pairings ?? []
        )
          .map((pairing: Pairing, index: number) => ({
            pairing,
            index,
          }))
          .filter(
            ({ pairing }: { pairing: Pairing }) =>
              pairing?.white && pairing?.black,
          );

        const mappedPairings = validPairings.map(({ pairing }) => ({
          ...pairing,
          white: mapPlayer(pairing.white),
          black: mapPlayer(pairing.black),
        }));

        const games = await Promise.all(
          validPairings.map(
            async ({ pairing, index }): Promise<Game | null> => {
              try {
                const response = await fetch(
                  `${BASE_URL}/${baseId}/round-${roundId}/game-${index + 1}.json`,
                );

                if (!response.ok) {
                  return null;
                }

                const game = await response.json();

                return {
                  id: `${baseId}-${roundId}-${index + 1}`,
                  white: mapPlayer(pairing.white),
                  black: mapPlayer(pairing.black),
                  result: game.result,
                  headers: {},
                  moves: game.moves ?? [],
                };
              } catch {
                return null;
              }
            },
          ),
        );

        return {
          tournament: {
            id: baseId,
            name: tournament.name ?? "Unknown tournament",
            rounds: tournament.rounds ?? [],
          },
          info: {
            ...round,
            pairings: mappedPairings,
          },

          games: games.filter((g): g is Game => g !== null),
        };
      } catch {
        return null;
      }
    }),
  );

  const validResults = results.filter(
    (r): r is NonNullable<typeof r> => r !== null,
  );

  return {
    tournaments: validResults.map((r) => r.tournament),
    info: {
      pairings: validResults.flatMap((r) => r.info.pairings ?? []),
    },
    games: validResults.flatMap((r) => r.games),
  };
}

// load tournament
export async function loadTournaments(bases: string[]) {
  return Promise.all(
    bases.map(async (baseId, index) => {
      const response = await fetch(`${BASE_URL}/${baseId}/tournament.json`);

      if (!response.ok) {
        throw new Error(`Failed to load tournament ${baseId}`);
      }

      const tournament = await response.json();

      return {
        id: baseId,
        index,
        name: tournament.name ?? "Unknown tournament",
        rounds: tournament.rounds ?? [],
      };
    }),
  );
}

// load round
export async function loadRound(baseId: string, roundId: number) {
  const response = await fetch(
    `${BASE_URL}/${baseId}/round-${roundId}/index.json`,
  );

  const round = await response.json();

  const games = await Promise.all(
    (round.pairings ?? []).map(
      async (pairing: Pairing, index: number): Promise<Game | null> => {
        try {
          const gameResponse = await fetch(
            `${BASE_URL}/${baseId}/round-${roundId}/game-${index + 1}.json`,
          );

          if (!gameResponse.ok) {
            return null;
          }

          const game = await gameResponse.json();

          return {
            id: `${baseId}-${roundId}-${index + 1}`,
            white: mapPlayer(pairing.white),
            black: mapPlayer(pairing.black),
            result: game.result,
            headers: {},
            moves: game.moves ?? [],
          };
        } catch {
          return null;
        }
      },
    ),
  );

  return {
    info: {
      ...round,
      pairings: (round.pairings ?? []).map((pairing: Pairing) => ({
        ...pairing,
        white: mapPlayer(pairing.white),
        black: mapPlayer(pairing.black),
      })),
    },
    games: games.filter((g): g is Game => g !== null),
  };
}

export async function loadGameFen(
  baseId: string,
  round: number,
): Promise<string> {
  const data = await fetchData([baseId], {
    0: round,
  });
  const firstGame = data.games[0];
  if (!firstGame) {
    throw new Error("Game not found");
  }

  const chess = new Chess();

  for (const moveStr of firstGame.moves ?? []) {
    const san = extractSan(moveStr);

    if (san) {
      try {
        chess.move(san);
      } catch (e) {
        console.warn("Invalid move:", san);
      }
    }
  }

  return chess.fen();
}
