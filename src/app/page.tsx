"use client";
import { useMemo, useState, useRef } from "react";
import AnalysisChessBoard from "@/components/analysis/AnalysisChessBoard";
import { AnalysisSideBar } from "@/components/analysis/AnalysisSideBar";
import { useAnalysisWorkspace } from "@/features/analysis/hooks/useAnalysisWorkspace";
import { FEN } from "@/lib/cm-chessboard/src/Chessboard.js";
import { RoundSideBar } from "@/components/analysis/RoundSideBar";
import { TopMenu } from "@/components/analysis/TopMenu";
import { downloadGamePgn } from "@/features/analysis/pgn/ExportPgn";
import { useUpdateObs } from "@/features/analysis/hooks/useUpdateObs";
import { useLiveRounds } from "@/features/analysis/hooks/useLiveRounds";
import { useBoardInteraction } from "@/features/analysis/hooks/useBoardInteraction";
import { useEngineArrows } from "@/features/analysis/hooks/useEngineArrows";

export default function Home() {
  const [engineVariations, setEngineVariations] = useState(0);

  const {
    gameRoot,
    currentNode,
    revision: positionRevision,
    roundData,
    selectRoundGame,
    selectEmptyAnalysis,
    goToNode,
    goBack,
    goNext,
    goToStart,
    goToLast,
    makeMove,
    evalScore,
    rawEvalScore,
    addEngineVariation,
    variations,
    variationsFen,
    loadPgn,
    canImportPgn,
    analysisGame,
    analysisPairing,
    analysisMainNode,
    syncSelectedGame,
    followLive,
    changeFollowLive,
  } = useAnalysisWorkspace(engineVariations);

  const { tournaments, rounds: selectedRoundsData, selectRound } = useLiveRounds(syncSelectedGame);
  const [showEngineArrow, setShowEngineArrow] = useState(false);
  const pgnInputRef = useRef<HTMLInputElement>(null);
  const lastMove = useMemo( // Compute the last move of the current position.
    () => currentNode?.from && currentNode?.to
      ? { from: currentNode.from, to: currentNode.to }
      : null,
    [currentNode],
  );

  // Compute the last node of the live main line.
  const liveMainNode = useMemo(() => {
    let node = gameRoot;
    while (node?.main) {
      node = node.main;
    }
    return node;
  }, [gameRoot]);

  // Compute the last move of the live main line.
  const liveLastMove = useMemo(
    () => liveMainNode?.from && liveMainNode?.to
      ? { from: liveMainNode.from, to: liveMainNode.to }
      : null,
    [liveMainNode],
  );

  // Compute the last move of the analysis main line.
  const analysisLastMove = useMemo(
    () => analysisMainNode?.from && analysisMainNode?.to
      ? { from: analysisMainNode.from, to: analysisMainNode.to }
      : null,
    [analysisMainNode],
  );

  const { moveAnimationId, currentAnnotations, onMove, onAnnotationsChange } = useBoardInteraction(
    currentNode,
    positionRevision,
    makeMove,
  );
  const engineArrows = useEngineArrows(
    showEngineArrow,
    currentNode?.fen,
    variationsFen,
    variations,
  );

  // Update OBS camera and drag state based on the current board and analysis context.
  const { updateObsCamera, updateObsDrag } = useUpdateObs({
    rounds: selectedRoundsData,
    currentNode,
    lastMove,
    liveMainNode,
    liveLastMove,
    rawEvalScore,
    annotations: currentAnnotations,
    moveAnimationId,
    roundData,
    analysisGame,
    analysisPairing,
  });

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-50 dark:bg-black max-[1276px]:h-auto max-[1276px]:min-h-screen">
      <TopMenu
        tournaments={tournaments}
        onRoundSelected={selectRound}
        loadPgn={loadPgn}
        canImportPgn={canImportPgn}
        onDownloadPgn={() => downloadGamePgn(
          gameRoot,
          roundData?.games?.[0] ?? analysisGame,
          roundData?.info.pairings?.[0] ?? analysisPairing,
        )}
        showEngineArrow={showEngineArrow}
        setShowEngineArrow={setShowEngineArrow}
        engineVariations={engineVariations}
        setEngineVariations={setEngineVariations}
        followLive={followLive}
        onFollowLiveChange={changeFollowLive}
        pgnInputRef={pgnInputRef}
      />

      <main className="flex min-h-0 flex-1 overflow-hidden max-[1276px]:flex-col max-[1276px]:overflow-visible">
        <RoundSideBar
          rounds={selectedRoundsData}
          onSelect={(round, index, board) => {
            selectRoundGame(round, index);
            updateObsCamera(board);
          }}
          onSelectEmpty={selectEmptyAnalysis}
          analysisFen={analysisMainNode?.fen ?? FEN.start}
          analysisLastMove={analysisLastMove}
          analysisGame={analysisGame}
          analysisPairing={analysisPairing}
        />

        <div className="flex w-full justify-center gap-4 p-4 max-[1000px]:flex-col max-[1000px]:items-center">
          <AnalysisChessBoard
            fen={currentNode?.fen ?? FEN.start}
            lastMove={lastMove}
            onMove={onMove}
            pairing={roundData?.info?.pairings?.[0] ?? analysisPairing}
            activeGame={roundData?.games?.[0] ?? analysisGame}
            engineArrows={engineArrows}
            evalScore={evalScore}
            annotationsResetKey={currentNode?.id}
            onAnnotationsChange={onAnnotationsChange}
            onDragChange={updateObsDrag}
          />

          <AnalysisSideBar
            gameRoot={gameRoot}
            currentNode={currentNode}
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
