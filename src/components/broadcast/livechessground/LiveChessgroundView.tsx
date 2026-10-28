"use client";

import { SmallBoardBoard } from "@/components/broadcast/smallboard/SmallBoardBoard";
import { SmallBoardEvalBar } from "@/components/broadcast/smallboard/SmallBoardEvalBar";
import { useRemoteStockfish } from "@/stockfish/useRemoteStockfish";
import type { ObsBoardData } from "@/types/Obs";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function LiveChessgroundView({ data }: { data: ObsBoardData | null }) {
  const liveFen = data?.liveFen ?? data?.fen ?? INITIAL_FEN;
  // Use the same Docker-backed evaluation stream as SmallChessBoard, rather
  // than the local engine currently analysing a possibly different variation.
  const { evalScore } = useRemoteStockfish(data?.game.id ?? "live-board", liveFen);

  return (
    <div className="flex w-[540px] gap-1">
      <SmallBoardBoard
        data={data}
        fen={liveFen}
        lastMove={data?.liveLastMove}
        className="pointer-events-none w-[520px] select-none"
      />
      <div className="w-4 shrink-0">
        <SmallBoardEvalBar evalScore={evalScore} wide />
      </div>
    </div>
  );
}
