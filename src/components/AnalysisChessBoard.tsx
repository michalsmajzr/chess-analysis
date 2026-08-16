import "@/lib/cm-chessboard/assets/chessboard.css";
import ChessBoard from "@/components/ChessBoard";
import { HeaderBoard } from "@/components/HeaderBoard";
import { getScore } from "@/utils/getScore";
import { EvalBar } from "@/components/EvalBar";
import { Game, Pairing } from "@/types/Game";
import { EngineArrow } from "@/types/Engine";

export default function AnalysisChessBoard({
  fen,
  lastMove,
  onMove,
  pairing,
  activeGame,
  engineArrows,
  evalScore,
}: {
  fen: string;
  lastMove?: { from: string; to: string } | null;
  onMove?: (from: string, to: string, promotion?: string) => void;
  pairing?: Pairing;
  activeGame?: Game;
  engineArrows?: EngineArrow[];
  evalScore?: number;
}) {
  return (
    <div className="flex flex-col  gap-1">
      <HeaderBoard
        pairings={pairing}
        activeGame={activeGame}
        score={getScore(activeGame?.result, "black")}
        color="black"
      />

      <div className="flex gap-2 py-2">
        <ChessBoard
          fen={fen}
          lastMove={lastMove}
          onMove={onMove}
          engineArrows={engineArrows ?? []}
        />

        <EvalBar evalScore={evalScore ?? 0} />
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
