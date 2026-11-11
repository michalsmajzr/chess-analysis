import "@/lib/cm-chessboard/assets/chessboard.css";
import ChessBoard from "@/components/ChessBoard";
import { HeaderBoard } from "@/components/HeaderBoard";
import { getScore } from "@/utils/getScore";
import { EvalBar } from "@/components/EvalBar";
import { Game, Pairing } from "@/types/Game";
import { BoardMarker, EngineArrow } from "@/types/Engine";
import type { BoardDragData } from "@/types/Obs";

export default function AnalysisChessBoard({
  fen,
  lastMove,
  onMove,
  pairing,
  activeGame,
  engineArrows,
  evalScore,
  onAnnotationsChange,
  onDragChange,
  annotationsResetKey,
}: {
  fen: string;
  lastMove?: { from: string; to: string } | null;
  onMove?: (from: string, to: string, promotion?: string) => void;
  pairing?: Pairing;
  activeGame?: Game;
  engineArrows?: EngineArrow[];
  evalScore?: number;
  onAnnotationsChange?: (annotations: { arrows: EngineArrow[]; markers: BoardMarker[] }) => void;
  onDragChange?: (drag: BoardDragData) => void;
  annotationsResetKey?: string;
}) {
  return (
    <div className="flex w-[min(30rem,calc(100vw-3rem))] flex-col gap-1">
      <HeaderBoard
        pairings={pairing}
        activeGame={activeGame}
        score={getScore(activeGame?.result, "black")}
        color="black"
      />

      <div className="flex min-w-0 gap-2 py-2">
        <ChessBoard
          className="min-w-0 flex-1"
          fen={fen}
          lastMove={lastMove}
          onMove={onMove}
          engineArrows={engineArrows ?? []}
          onAnnotationsChange={onAnnotationsChange}
          onDragChange={onDragChange}
          annotationsResetKey={annotationsResetKey}
        />

        <EvalBar evalScore={evalScore ?? 0} className="self-stretch" />
      </div>

      <HeaderBoard
        pairings={pairing}
        activeGame={activeGame}
        score={getScore(activeGame?.result, "white")}
        color="white"
      />
    </div>
  );
}
