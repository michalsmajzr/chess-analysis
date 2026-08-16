"use client";
import { useState, useRef } from "react";
import AnalysisChessBoard from "@/components/AnalysisChessBoard";
import { AnalysisSideBar } from "@/components/AnalysisSideBar";
import { useGameTree } from "@/utils/tree";
import { FEN } from "@/lib/cm-chessboard/src/Chessboard.js";
import { RoundSideBar } from "@/components/RoundSideBar";
import { TopMenu } from "@/components/TopMenu";
import { downloadGamePgn } from "@/utils/downloadGamePGN";
import { RoundData } from "@/types/Game";

export default function Home() {
  const [engineVariations, setEngineVariations] = useState(0);

  const {
    gameRoot,
    currentNode,
    roundData,
    selectRoundGame,
    tournaments,
    goToNode,
    goBack,
    goNext,
    renderLine,
    goToStart,
    goToLast,
    makeMove,
    evalScore,
    addEngineVariation,
    variations,
    loadPgn,
  } = useGameTree(engineVariations);

  const [selectedRoundsData, setSelectedRoundsData] = useState<RoundData[]>([]);
  const [showEngineArrow, setShowEngineArrow] = useState(false);
  const pgnInputRef = useRef<HTMLInputElement>(null);

  const lastMove =
    currentNode?.from && currentNode?.to
      ? {
          from: currentNode.from,
          to: currentNode.to,
        }
      : null;
  const engineArrows = showEngineArrow
    ? variations
        .filter((v) => v.bestMove)
        .sort((a, b) => {
          if (a.score === undefined) return 1;
          if (b.score === undefined) return -1;

          return b.score - a.score;
        })
        .map((v) => ({
          from: v.bestMove!.from,
          to: v.bestMove!.to,
          promotion: v.bestMove!.promotion,
          score: v.score,
          mate: v.mate,
        }))
    : [];

  return (
    <div className="w-full h-screen flex flex-col bg-zinc-50 dark:bg-black">
      <TopMenu
        tournaments={tournaments}
        setSelectedRoundsData={setSelectedRoundsData}
        loadPgn={loadPgn}
        onDownloadPgn={() => downloadGamePgn(gameRoot)}
        showEngineArrow={showEngineArrow}
        setShowEngineArrow={setShowEngineArrow}
        engineVariations={engineVariations}
        setEngineVariations={setEngineVariations}
        pgnInputRef={pgnInputRef}
      />

      <main className="flex-1 min-h-0 flex gap-4 overflow-hidden">
        <RoundSideBar rounds={selectedRoundsData} onSelect={selectRoundGame} />

        <div className="w-full flex justify-center gap-4 p-4">
          <AnalysisChessBoard
            fen={currentNode?.fen ?? FEN.start}
            lastMove={lastMove}
            onMove={makeMove}
            pairing={roundData?.info?.pairings?.[0]}
            activeGame={roundData?.games?.[0]}
            engineArrows={engineArrows}
            evalScore={evalScore}
          />

          <AnalysisSideBar
            gameRoot={gameRoot}
            currentNode={currentNode}
            renderLine={renderLine}
            goToNode={goToNode}
            goBack={goBack}
            goNext={goNext}
            goToStart={goToStart}
            goToLast={goToLast}
            addEngineVariation={addEngineVariation}
            variations={variations}
            engineVariations={engineVariations}
          />
        </div>
      </main>
    </div>
  );
}
