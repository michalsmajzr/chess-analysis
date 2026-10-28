"use client";
import { useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import AnalysisChessBoard from "@/components/AnalysisChessBoard";
import { AnalysisSideBar } from "@/components/AnalysisSideBar";
import { useGameTree } from "@/utils/tree";
import { FEN } from "@/lib/cm-chessboard/src/Chessboard.js";
import { RoundSideBar } from "@/components/RoundSideBar";
import { EMPTY_ANALYSIS_GAME } from "@/components/EmptyAnalysisBoard";
import { TopMenu } from "@/components/TopMenu";
import { downloadGamePgn } from "@/utils/downloadGamePGN";
import { RoundData } from "@/types/Game";
import { obsClient } from "@/websocket/obsClient";
import type { BoardMarker, EngineArrow } from "@/types/Engine";
import { loadRound } from "@/api/liveChessCloud";

const EMPTY_ANNOTATIONS: {
  arrows: EngineArrow[];
  markers: BoardMarker[];
} = { arrows: [], markers: [] };

export default function Home() {
  const [engineVariations, setEngineVariations] = useState(0);

  const {
    gameRoot,
    currentNode,
    roundData,
    selectRoundGame,
    selectEmptyAnalysis,
    tournaments,
    goToNode,
    goBack,
    goNext,
    renderLine,
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
  } = useGameTree(engineVariations);

  const [selectedRoundsData, setSelectedRoundsData] = useState<RoundData[]>([]);
  const [showEngineArrow, setShowEngineArrow] = useState(false);
  const [annotations, setAnnotations] = useState<{
    positionId?: string;
    positionVisit?: number;
    arrows: EngineArrow[];
    markers: BoardMarker[];
  }>(EMPTY_ANNOTATIONS);
  const [moveAnimationId, setMoveAnimationId] = useState(0);
  const pgnInputRef = useRef<HTMLInputElement>(null);
  const selectedRoundsRef = useRef<RoundData[]>([]);
  const positionVisitRef = useRef({ id: currentNode?.id, value: 0 });
  if (positionVisitRef.current.id !== currentNode?.id) {
    positionVisitRef.current = {
      id: currentNode?.id,
      value: positionVisitRef.current.value + 1,
    };
  }
  const positionVisit = positionVisitRef.current.value;
  const selectedRoundsKey = useMemo(
    () => selectedRoundsData
      .map(round => `${round.tournamentIndex}:${round.tournamentId}:${round.round}`)
      .join("|"),
    [selectedRoundsData],
  );

  useEffect(() => {
    selectedRoundsRef.current = selectedRoundsData;
  }, [selectedRoundsData]);

  useEffect(() => {
    if (!selectedRoundsKey) {
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const refreshedRounds = await Promise.all(selectedRoundsRef.current.map(async round => {
          const data = await loadRound(round.tournamentId, round.round);
          return {
            ...round,
            info: data.info,
            games: data.games,
          };
        }));

        if (!active) {
          return;
        }

        // Publish fresh API objects even if the move list itself has not changed.
        // Both the small boards and the selected live board then receive clocks,
        // result changes and later corrections from the same response.
        setSelectedRoundsData(refreshedRounds);
        syncSelectedGame(refreshedRounds);
      } catch (error) {
        console.warn("LiveChessCloud polling failed:", error);
      } finally {
        if (active) {
          timer = setTimeout(poll, 1000);
        }
      }
    };

    void poll();
    return () => {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  // Restart only when the selected tournament/round set changes, not every poll.
  }, [selectedRoundsKey, syncSelectedGame]);

  const lastMove = useMemo(
    () => currentNode?.from && currentNode?.to
      ? { from: currentNode.from, to: currentNode.to }
      : null,
    [currentNode],
  );
  const liveMainNode = useMemo(() => {
    let node = gameRoot;
    while (node?.main) {
      node = node.main;
    }
    return node;
  }, [gameRoot]);
  const liveLastMove = useMemo(
    () => liveMainNode?.from && liveMainNode?.to
      ? { from: liveMainNode.from, to: liveMainNode.to }
      : null,
    [liveMainNode],
  );
  const analysisLastMove = useMemo(
    () => analysisMainNode?.from && analysisMainNode?.to
      ? { from: analysisMainNode.from, to: analysisMainNode.to }
      : null,
    [analysisMainNode],
  );
  // Never publish a previous game/position's arrows while its new analysis
  // is still starting. This matters especially for the mirrored OBS board.
  const engineArrows = useMemo(() => showEngineArrow && variationsFen === currentNode?.fen
    ? variations
        .filter((v) => v.bestMove)
        .sort((a, b) => {
          if (a.score === undefined) {
            return 1;
          }
          if (b.score === undefined) {
            return -1;
          }

          return b.score - a.score;
        })
        .map((v) => ({
          from: v.bestMove!.from,
          to: v.bestMove!.to,
          promotion: v.bestMove!.promotion,
          score: v.score,
          mate: v.mate,
        }))
    : [], [showEngineArrow, variations, variationsFen, currentNode?.fen]);
  // A board clears manual annotations when leaving a node. Do not resurrect
  // them merely because the user later returns to the same cached node.
  const currentAnnotations = annotations.positionId === currentNode?.id &&
    annotations.positionVisit === positionVisit
    ? annotations
    : EMPTY_ANNOTATIONS;

  useLayoutEffect(() => {
    const gameCount = selectedRoundsData.reduce(
      (count, selectedRound) => count + selectedRound.games.length,
      0,
    );
    // The persistent analysis board is always the final small/OBS board.
    obsClient.publishGameCount(gameCount + 1);
  }, [selectedRoundsData]);

  useLayoutEffect(() => {
    const game = roundData?.games?.[0] ?? analysisGame ?? EMPTY_ANALYSIS_GAME;
    if (!currentNode) {
      return;
    }
    obsClient.publishBoard({
      fen: currentNode.fen,
      lastMove,
      liveFen: liveMainNode?.fen ?? currentNode.fen,
      liveLastMove,
      evalScore: rawEvalScore,
      // Engine arrows belong only to the interactive analysis board. The OBS
      // chessboard receives user-drawn annotations, never analysis output.
      arrows: currentAnnotations.arrows,
      markers: currentAnnotations.markers,
      moveAnimationId,
      game,
      pairing: roundData?.info.pairings?.[0] ?? analysisPairing,
    });
  }, [currentNode, lastMove, liveMainNode, liveLastMove, rawEvalScore, currentAnnotations, engineArrows, moveAnimationId, roundData, analysisGame, analysisPairing]);

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-50 dark:bg-black max-[1276px]:h-auto max-[1276px]:min-h-screen">
      <TopMenu
        tournaments={tournaments}
        setSelectedRoundsData={setSelectedRoundsData}
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
            obsClient.switchCamera(board);
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
            onMove={(from, to, promotion) => {
              setMoveAnimationId(value => value + 1);
              makeMove(from, to, promotion);
            }}
            pairing={roundData?.info?.pairings?.[0] ?? analysisPairing}
            activeGame={roundData?.games?.[0] ?? analysisGame}
            engineArrows={engineArrows}
            evalScore={evalScore}
            annotationsResetKey={currentNode?.id}
            onAnnotationsChange={({ arrows, markers }) => {
              setAnnotations({
                positionId: currentNode?.id,
                positionVisit,
                arrows,
                markers,
              });
            }}
            onDragChange={drag => obsClient.publishBoardDrag(drag)}
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
