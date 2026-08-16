"use client";
import { useMemo } from "react";
import { Chess } from "chess.js";
import { Game } from "@/types/Game";
import ChessBoard from "@/components/ChessBoard";
import { HeaderSmallChessboard } from "@/components/HeaderSmallChessboard";
import { getScore } from "@/utils/getScore";
import { Pairing } from "@/types/Game";

export function SmallChessBoard({
  game,
  pairing,
  onClick,
}: {
  game: Game;
  pairing?: Pairing;
  onClick: () => void;
}) {
  const { fen, lastMove } = useMemo(() => {
    const chess = new Chess();

    let lastMove: { from: string; to: string } | null = null;

    for (const move of game.moves ?? []) {
      try {
        const result = chess.move(move.trim().split(" ")[0]);

        if (result) {
          lastMove = {
            from: result.from,
            to: result.to,
          };
        }
      } catch {}
    }

    return {
      fen: chess.fen(),
      lastMove,
    };
  }, [game]);

  return (
    <div onClick={onClick} className="flex flex-col w-56 overflow-hidden">
      <HeaderSmallChessboard
        pairings={pairing}
        activeGame={game}
        score={getScore(game?.result, "black")}
        color="black"
      />

      <ChessBoard
        fen={fen}
        lastMove={lastMove}
        className="w-56"
        disableExtensions
      />

      <HeaderSmallChessboard
        pairings={pairing}
        activeGame={game}
        score={getScore(game?.result, "white")}
        color="white"
      />
    </div>
  );
}
