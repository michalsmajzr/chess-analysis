import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASES } from "@/api/config";
import { loadRound, loadTournaments } from "@/api/liveChessCloud";
import type { RoundData, Tournament } from "@/types/Game";

/** Loads selected tournament rounds and keeps their live data fresh. */
export function useLiveRounds(onRoundsRefreshed: (rounds: RoundData[]) => void) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const roundsRef = useRef<RoundData[]>([]);
  const onRoundsRefreshedRef = useRef(onRoundsRefreshed);
  const selectionRequestIdRef = useRef(0);

  useEffect(() => {
    onRoundsRefreshedRef.current = onRoundsRefreshed;
  }, [onRoundsRefreshed]);

  useEffect(() => {
    loadTournaments(BASES)
      .then(setTournaments)
      .catch(error => console.error("Failed to load tournaments:", error));
  }, []);

  useEffect(() => {
    roundsRef.current = rounds;
  }, [rounds]);

  /** Loads a round selected from the tournament menu. */
  const selectRound = useCallback(async (
    tournamentId: string,
    round: number,
    tournamentIndex: number,
  ) => {
    const requestId = selectionRequestIdRef.current + 1;
    selectionRequestIdRef.current = requestId;
    const data = await loadRound(tournamentId, round);

    if (requestId !== selectionRequestIdRef.current) return;
    
    setRounds(previous => {
      const next = [
        ...previous.filter(item => item.tournamentIndex !== tournamentIndex),
        {
          tournamentIndex,
          tournamentId,
          tournamentName: tournaments[tournamentIndex]?.name ?? tournamentId,
          round,
          info: data.info,
          games: data.games,
        },
      ];
      return next.sort((left, right) => left.tournamentIndex - right.tournamentIndex);
    });
  }, [tournaments]);

  const selectedRoundsKey = useMemo(
    () => rounds.map(round => `${round.tournamentIndex}:${round.tournamentId}:${round.round}`).join("|"),
    [rounds],
  );

  useEffect(() => {
    if (!selectedRoundsKey) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /** Refreshes every selected round from the live API. */
    const refresh = async () => {
      try {
        const refreshed = await Promise.all(roundsRef.current.map(async round => {
          const data = await loadRound(round.tournamentId, round.round);
          return { ...round, info: data.info, games: data.games };
        }));

        if (!active) return;

        setRounds(refreshed);
        onRoundsRefreshedRef.current(refreshed);
      } catch (error) {
        console.warn("LiveChessCloud polling failed:", error);
      } finally {
        if (active) {
          timer = setTimeout(refresh, 1000);
        }
      }
    };

    void refresh();
    return () => {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [selectedRoundsKey]);

  return { tournaments, rounds, selectRound };
}
