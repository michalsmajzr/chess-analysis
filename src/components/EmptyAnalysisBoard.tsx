"use client";

import { FEN } from "@/lib/cm-chessboard/src/Chessboard.js";
import ChessBoard from "@/components/ChessBoard";
import { EvalBar } from "@/components/EvalBar";
import { useRemoteStockfish } from "@/stockfish/useRemoteStockfish";
import { useLayoutEffect } from "react";
import { obsClient } from "@/websocket/obsClient";
import { HeaderSmallChessboard } from "@/components/HeaderSmallChessboard";
import { getScore } from "@/utils/getScore";
import type { Game, Pairing } from "@/types/Game";

export const EMPTY_ANALYSIS_GAME: Game = {
  id: "empty-analysis-board",
  white: { fname: "", lname: "" },
  black: { fname: "", lname: "" },
  headers: {},
  moves: [],
};

/** Persistent last sidebar board: a clean starting position for free analysis. */
export function EmptyAnalysisBoard({
  fen,
  lastMove,
  obsGame,
  game,
  pairing,
  onClick,
}: {
  fen: string;
  lastMove: { from: string; to: string } | null;
  obsGame: number;
  game?: Game;
  pairing?: Pairing;
  onClick: () => void;
}) {
  const { evalScore, rawEvalScore } = useRemoteStockfish(EMPTY_ANALYSIS_GAME.id, fen);

  useLayoutEffect(() => {
    obsClient.publishGame(obsGame, {
      fen,
      lastMove,
      evalScore: rawEvalScore,
      game: game ?? EMPTY_ANALYSIS_GAME,
      pairing,
    });
  }, [fen, lastMove, obsGame, rawEvalScore, game, pairing]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Empty analysis board"
      title="Empty analysis board"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="relative mt-3 w-56 shrink-0 cursor-pointer overflow-hidden max-[1276px]:mt-0"
    >
      <HeaderSmallChessboard
        pairings={pairing}
        activeGame={game}
        score={getScore(game?.result, "black")}
        color="black"
      />
      <div className="relative pr-4">
        <ChessBoard fen={fen || FEN.start} lastMove={lastMove} className="pointer-events-none w-52" disableExtensions />
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
