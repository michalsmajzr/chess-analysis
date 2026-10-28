"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { EvalBarPlayer } from "./EvalBarPlayer";
import { GameResult } from "./GameResult";
import { HorizontalEvalBar } from "./HorizontalEvalBar";
import { useSmoothEval } from "@/stockfish/useSmoothEval";
import { obsClient } from "@/websocket/obsClient";
import { hasFinalResult } from "@/utils/getScore";
import type { ObsGameData } from "@/types/Obs";

export function EvalBarGameRow({ gameNumber }: { gameNumber: number }) {
  const [data, setData] = useState<ObsGameData | null>(null);
  const smoothEval = useSmoothEval(data?.evalScore ?? 0, 0.06);

  useEffect(
    () => obsClient.subscribeGame(gameNumber, next => {
      flushSync(() => setData(next));
    }),
    [gameNumber],
  );

  const white = data?.pairing?.white ?? data?.game.white;
  const black = data?.pairing?.black ?? data?.game.black;
  const finished = hasFinalResult(data?.game.result);

  if (!data) {
    return null;
  }

  return (
    <div className="grid h-12 w-[620px] grid-cols-[180px_240px_180px] items-center gap-2 bg-transparent text-white">
      <EvalBarPlayer player={white} side="left" />
      <div className="flex items-center justify-center">
        {finished ? (
          <GameResult result={data.game.result} />
        ) : (
          <HorizontalEvalBar evalScore={smoothEval} />
        )}
      </div>
      <EvalBarPlayer player={black} side="right" />
    </div>
  );
}
