import { Chess } from "chess.js";
import { mapPlayer } from "@/api/players";
import { extractLiveSan } from "@/utils/syncLiveMainLine";
import { Game, Pairing, Tournament, RoundInfo } from "@/types/Game";

const LIVE_FETCH_OPTIONS: RequestInit = { cache: "no-store" };

function liveUrl(baseId: string, resource: string) {
  return `/api/livechess/${encodeURIComponent(baseId)}/${resource}`;
}

async function fetchLiveJson(url: string) {
  const response = await fetch(url, LIVE_FETCH_OPTIONS);
  if (!response.ok) {
    throw new Error(`LiveChessCloud request failed: ${response.status}`);
  }
  return response.json();
}

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
        const tournament = await fetchLiveJson(
          liveUrl(baseId, "tournament.json"),
        );
        const roundId = selectedRounds[index] ?? 1;

        // load round
        const round = await fetchLiveJson(
          liveUrl(baseId, `round-${roundId}/index.json`),
        );

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
                const game = await fetchLiveJson(
                  liveUrl(baseId, `round-${roundId}/game-${index + 1}.json`),
                );

                return {
                  id: `${baseId}-${roundId}-${index + 1}`,
                  white: mapPlayer(pairing.white),
                  black: mapPlayer(pairing.black),
                  result: game.result,
                  headers: {},
                  moves: game.moves ?? [],
                  clock: game.clock
                    ? { ...game.clock, timestamp: Date.now() }
                    : undefined,
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
  const results = await Promise.allSettled(
    bases.map(async (baseId, index) => {
      const tournament = await fetchLiveJson(liveUrl(baseId, "tournament.json"));

      return {
        id: baseId,
        index,
        name: tournament.name ?? "Unknown tournament",
        rounds: tournament.rounds ?? [],
      };
    }),
  );

  // A temporary failure of one tournament must not erase all other menus.
  return results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
}

// load round
export async function loadRound(baseId: string, roundId: number) {
  const round = await fetchLiveJson(
    liveUrl(baseId, `round-${roundId}/index.json`),
  );

  const validPairings: { pairing: Pairing; index: number }[] = (
    round.pairings ?? []
  )
    .map((pairing: Pairing, index: number) => ({ pairing, index }))
    .filter(
      ({ pairing }: { pairing: Pairing }) => pairing?.white && pairing?.black,
    );

  const games = await Promise.all(
    validPairings.map(
      async ({ pairing, index }): Promise<Game | null> => {
        try {
          const game = await fetchLiveJson(
          liveUrl(baseId, `round-${roundId}/game-${index + 1}.json`),
          );

          return {
            id: `${baseId}-${roundId}-${index + 1}`,
            white: mapPlayer(pairing.white),
            black: mapPlayer(pairing.black),
            result: game.result,
            headers: {},
            moves: game.moves ?? [],
            clock: game.clock
              ? { ...game.clock, timestamp: Date.now() }
              : undefined,
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
      pairings: validPairings.map(({ pairing }) => ({
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
    const san = extractLiveSan(moveStr);

    if (san) {
      try {
        chess.move(san);
      } catch {
        console.warn("Invalid move:", san);
      }
    }
  }

  return chess.fen();
}
