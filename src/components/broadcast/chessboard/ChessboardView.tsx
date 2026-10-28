"use client";

import { ChessboardBoard } from "./ChessboardBoard";
import { ChessboardEvalBar } from "./ChessboardEvalBar";
import { ChessboardHeader } from "./ChessboardHeader";
import { useSmoothEval } from "@/stockfish/useSmoothEval";
import type { BoardDragData, ObsBoardData } from "@/types/Obs";

export function ChessboardView({
  data,
  drag,
}: {
  data: ObsBoardData | null;
  drag?: BoardDragData;
}) {
  const smoothEval = useSmoothEval(data?.evalScore ?? 0, 0.06);

  return (
    <div className="w-[min(776px,100vw)] bg-transparent text-black">
      <ChessboardHeader data={data} color="black" />
      <div className="my-4 grid grid-cols-[minmax(0,1fr)_26px] gap-3 bg-transparent">
        <ChessboardBoard data={data} drag={drag} />
        <ChessboardEvalBar evalScore={smoothEval} />
      </div>
      <ChessboardHeader data={data} color="white" />
    </div>
  );
}
