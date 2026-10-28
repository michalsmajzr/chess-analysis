import ChessBoard from "@/components/ChessBoard";
import type { BoardDragData, ObsBoardData } from "@/types/Obs";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function ChessboardBoard({
  data,
  drag,
}: {
  data: ObsBoardData | null;
  drag?: BoardDragData;
}) {
  return (
    <ChessBoard
      fen={data?.fen ?? INITIAL_FEN}
      lastMove={data?.lastMove}
      broadcastArrows={data?.arrows ?? []}
      broadcastMarkers={data?.markers ?? []}
      dragPreview={drag}
      animatePosition
      animationKey={data?.game.id}
      animationTrigger={data?.moveAnimationId}
      className="pointer-events-none w-full select-none"
    />
  );
}
