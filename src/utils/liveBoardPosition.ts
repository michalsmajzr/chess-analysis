import { Chess } from "chess.js";

/** One cache per small board; clock updates never replay chess moves. */
export function createLiveBoardPosition() {
  let chess = new Chess();
  let previousMoves: string[] = [];
  let position: { fen: string; lastMove: { from: string; to: string } | null } = {
    fen: chess.fen(),
    lastMove: null,
  };

  return (moves: string[]) => {
    const appended = moves.length >= previousMoves.length &&
      previousMoves.every((move, index) => move === moves[index]);
    if (appended && moves.length === previousMoves.length) return position;

    let start = previousMoves.length;
    let lastMove = position.lastMove;
    if (!appended) {
      chess = new Chess();
      start = 0;
      lastMove = null;
    }
    for (let index = start; index < moves.length; index++) {
      try {
        const move = chess.move(moves[index].trim().split(" ")[0]);
        if (move) lastMove = { from: move.from, to: move.to };
      } catch {
        // A later corrected response invalidates the prefix and rebuilds it.
      }
    }
    previousMoves = [...moves];
    position = { fen: chess.fen(), lastMove };
    return position;
  };
}
