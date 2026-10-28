import ChessBoard from "@/components/ChessBoard";
import type { ObsGameData } from "@/types/Obs";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function SmallBoardBoard({
  data,
  fen,
  lastMove,
  className = "pointer-events-none w-80 select-none",
  animatePosition = false,
  animationKey,
}: {
  data: ObsGameData | null;
  fen?: string;
  lastMove?: { from: string; to: string } | null;
  className?: string;
  animatePosition?: boolean;
  animationKey?: string;
}) {
  return (
    <ChessBoard
      fen={fen ?? data?.fen ?? INITIAL_FEN}
      lastMove={lastMove === undefined ? data?.lastMove : lastMove}
      className={className}
      disableExtensions
      animatePosition={animatePosition}
      animationKey={animationKey}
    />
  );
}
