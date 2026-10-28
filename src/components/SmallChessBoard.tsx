"use client";
import { useLayoutEffect, useMemo } from "react";
import { createLiveBoardPosition } from "@/utils/liveBoardPosition";
import { Game } from "@/types/Game";
import ChessBoard from "@/components/ChessBoard";
import { HeaderSmallChessboard } from "@/components/HeaderSmallChessboard";
import { getScore } from "@/utils/getScore";
import { Pairing } from "@/types/Game";
import { EvalBar } from "@/components/EvalBar";
import { useRemoteStockfish } from "@/stockfish/useRemoteStockfish";
import { obsClient } from "@/websocket/obsClient";

export function SmallChessBoard({
  game,
  pairing,
  obsGame,
  onClick,
}: {
  game: Game;
  pairing?: Pairing;
  obsGame: number;
  onClick: () => void;
}) {
  const resolvePosition = useMemo(() => createLiveBoardPosition(), []);
  const { fen, lastMove } = resolvePosition(game.moves ?? []);
  const { evalScore, rawEvalScore } = useRemoteStockfish(game.id, fen);

  useLayoutEffect(() => {
    obsClient.publishGame(obsGame, {
      fen,
      lastMove,
      evalScore: rawEvalScore,
      game,
      pairing,
    });
  }, [obsGame, fen, lastMove, rawEvalScore, game, pairing]);

  return (
    <div onClick={onClick} className="flex w-56 cursor-pointer flex-col overflow-hidden">
      <HeaderSmallChessboard
        pairings={pairing}
        activeGame={game}
        score={getScore(game?.result, "black")}
        color="black"
      />

      <div className="relative pr-4">
        <ChessBoard
          fen={fen}
          lastMove={lastMove}
          className="pointer-events-none w-52"
          disableExtensions
        />
        <div className="absolute inset-y-0 right-0">
          <EvalBar evalScore={evalScore} width={3} />
        </div>
      </div>

      <HeaderSmallChessboard
        pairings={pairing}
        activeGame={game}
        score={getScore(game?.result, "white")}
        color="white"
      />
    </div>
  );
}
