"use client";

import { SmallBoardBoard } from "./SmallBoardBoard";
import { SmallBoardEvalBar } from "./SmallBoardEvalBar";
import { SmallBoardHeader } from "./SmallBoardHeader";
import { useSmoothEval } from "@/stockfish/useSmoothEval";
import type { ObsGameData } from "@/types/Obs";

export function SmallBoardView({
  data,
  showEvalBar = true,
  fluid = false,
  compactHeaders = false,
}: {
  data: ObsGameData | null;
  showEvalBar?: boolean;
  /** Fill a parent grid cell instead of using the standalone board width. */
  fluid?: boolean;
  compactHeaders?: boolean;
}) {
  const smoothEval = useSmoothEval(data?.evalScore ?? 0, 0.06);

  return (
    <div className={`flex ${fluid ? "w-full" : showEvalBar ? "w-[336px]" : "w-80"} flex-col text-black`}>
      <SmallBoardHeader data={data} color="black" compact={compactHeaders} />
      <div className={`relative ${showEvalBar ? "pr-4" : ""}`}>
        <SmallBoardBoard
          data={data}
          className="pointer-events-none w-full select-none"
          animatePosition
          animationKey={data?.game.id}
        />
        {showEvalBar && (
          <div className="absolute inset-y-0 right-0">
            <SmallBoardEvalBar evalScore={smoothEval} />
          </div>
        )}
      </div>
      <SmallBoardHeader data={data} color="white" compact={compactHeaders} />
    </div>
  );
}
