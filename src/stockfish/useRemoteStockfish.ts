"use client";

import { useCallback, useSyncExternalStore } from "react";
import { evaluationClient } from "@/websocket/client";
import { useSmoothEval } from "@/stockfish/useSmoothEval";

export function useRemoteStockfish(gameId: string, fen: string) {
  const evaluation = useSyncExternalStore(
    useCallback(listener => evaluationClient.subscribe(gameId, fen, listener), [gameId, fen]),
    useCallback(() => evaluationClient.getEvaluation(gameId), [gameId]),
    () => undefined,
  );
  const evalScore = useSmoothEval(evaluation?.score ?? 0, 0.06);

  return {
    evalScore,
    rawEvalScore: evaluation?.score ?? 0,
    mate: evaluation?.mate,
    depth: evaluation?.depth,
  };
}
