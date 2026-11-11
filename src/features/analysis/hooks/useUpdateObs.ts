import { useCallback, useLayoutEffect } from "react";
import type { BoardMarker, EngineArrow } from "@/types/Engine";
import type { Game, Pairing, RoundData } from "@/types/Game";
import type { TreeNode } from "@/features/analysis/types/tree";
import type { BoardDragData } from "@/types/Obs";
import { obsClient } from "@/websocket/obsClient";

type UpdateObsInput = {
  rounds: RoundData[];
  currentNode: TreeNode | null;
  lastMove: { from: string; to: string } | null;
  liveMainNode: TreeNode | null;
  liveLastMove: { from: string; to: string } | null;
  rawEvalScore: number;
  annotations: { arrows: EngineArrow[]; markers: BoardMarker[] };
  moveAnimationId: number;
  roundData: RoundData | null;
  analysisGame?: Game;
  analysisPairing?: Pairing;
};

const EMPTY_OBS_GAME: Game = {
  id: "empty-analysis-board",
  white: { fname: "", lname: "" },
  black: { fname: "", lname: "" },
  headers: {},
  moves: [],
};

/** Publishes the current analysis state to OBS broadcast consumers. */
export function useUpdateObs({
  rounds,
  currentNode,
  lastMove,
  liveMainNode,
  liveLastMove,
  rawEvalScore,
  annotations,
  moveAnimationId,
  roundData,
  analysisGame,
  analysisPairing,
}: UpdateObsInput) {
  useLayoutEffect(() => {
    const gameCount = rounds.reduce(
      (count, round) => count + round.games.length,
      0,
    );
    obsClient.publishGameCount(gameCount + 1);
  }, [rounds]);

  useLayoutEffect(() => {
    if (!currentNode) return;
    obsClient.publishBoard({
      fen: currentNode.fen,
      lastMove,
      liveFen: liveMainNode?.fen ?? currentNode.fen,
      liveLastMove,
      evalScore: rawEvalScore,
      arrows: annotations.arrows,
      markers: annotations.markers,
      moveAnimationId,
      game: roundData?.games[0] ?? analysisGame ?? EMPTY_OBS_GAME,
      pairing: roundData?.info.pairings[0] ?? analysisPairing,
    });
  }, [currentNode, lastMove, liveMainNode, liveLastMove, rawEvalScore, annotations, moveAnimationId, roundData, analysisGame, analysisPairing]);

  /** Mirrors a board drag preview to OBS. */
  const updateObsDrag = useCallback((drag: BoardDragData) => {
    obsClient.publishBoardDrag(drag);
  }, []);

  /** Switches the broadcast camera to a selected small board. */
  const updateObsCamera = useCallback((board: number) => {
    obsClient.switchCamera(board);
  }, []);

  return { updateObsDrag, updateObsCamera };
}
