import { useCallback, useEffect, useRef, useState } from "react";
import type { RoundData } from "@/types/Game";
import { AnalysisWorkspace } from "@/features/analysis/workspace/AnalysisWorkspace";
import { syncLiveGame } from "@/features/analysis/workspace/SyncLiveGame";
import type { AnalysisWorkspaceResult, AnalysisWorkspaceState } from "@/features/analysis/types/workspace";
import { importPgn } from "@/features/analysis/pgn/ImportPgn";
import { useStockfish } from "@/stockfish/useStockfish";

type SelectedLiveGame = { tournamentIndex: number; round: number; gameId: string };

/** Connects the analysis workspace to React, Stockfish, and live data. */
export function useAnalysisWorkspace(engineVariations = 3) {
  const [workspace] = useState(() => new AnalysisWorkspace());
  const [state, setState] = useState<AnalysisWorkspaceState>(workspace.state);
  const selectedLiveGameRef = useRef<SelectedLiveGame | null>(null);
  const stateRef = useRef(state);
  const engine = useStockfish();
  const engineRef = useRef(engine);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  /** Renders a changed workspace state and starts a fresh engine analysis. */
  const commit = useCallback((result: AnalysisWorkspaceResult) => {
    if (!result.changed) return;

    stateRef.current = result.state;
    setState(result.state);

    if (!result.shouldAnalyze) return;

    const currentEngine = engineRef.current;
    currentEngine.setBestMove(null);
    currentEngine.clearVariations();
    currentEngine.analyze(result.state.currentNode.fen, {
      multiPv: Math.max(1, engineVariations),
    });
  }, [engineVariations]);

  useEffect(() => {
    engineRef.current.analyze(stateRef.current.currentNode.fen, {
      multiPv: Math.max(1, engineVariations),
    });
  }, [engineVariations]);

  /** Opens a live game after its tree has been created or synchronized. */
  const openLiveGame = useCallback((round: RoundData, index: number) => {
    const game = round.games[index];
    if (!game) return;

    const sync = syncLiveGame(
      game,
      index,
      workspace.getTree(game.id),
      workspace.hasFollowLive,
    );
    commit(workspace.openGame({
      key: game.id,
      tree: sync.tree,
      game,
      pairing: round.info.pairings[index],
      roundData: {
        ...round,
        info: { pairings: [round.info.pairings[index]] },
        games: [game],
        cacheKey: game.id,
      },
      gameIndex: index,
    }, true, sync.changed));
  }, [commit, workspace]);

  /** Selects a board and remembers it for future polling updates. */
  const selectRoundGame = useCallback((round: RoundData, index: number) => {
    const game = round.games[index];

    if (!game) return;

    selectedLiveGameRef.current = {
      tournamentIndex: round.tournamentIndex,
      round: round.round,
      gameId: game.id,
    };
    openLiveGame(round, index);
  }, [openLiveGame]);

  /** Applies a polling update only when it belongs to the selected board. */
  const syncSelectedGame = useCallback((rounds: RoundData[]) => {
    const selected = selectedLiveGameRef.current;

    if (!selected) return;

    const round = rounds.find(item =>
      item.tournamentIndex === selected.tournamentIndex && item.round === selected.round,
    );

    const index = round?.games.findIndex(game => game.id === selected.gameId) ?? -1;

    if (round && index >= 0) {
      openLiveGame(round, index);
    }
  }, [openLiveGame]);

  /** Activates the persistent local analysis board. */
  const selectEmptyAnalysis = useCallback(() => {
    selectedLiveGameRef.current = null;
    commit(workspace.selectEmptyAnalysis());
  }, [commit, workspace]);

  /** Imports PGN into the persistent local analysis board. */
  const loadPgn = useCallback((pgn: string) => {
    const imported = importPgn(pgn);

    if (!imported.imported) return;
    
    selectedLiveGameRef.current = null;
    commit(workspace.openGame({
      key: "empty-analysis",
      tree: imported.tree,
      game: imported.game,
      pairing: imported.pairing,
      roundData: null,
      gameIndex: 0,
    }));
  }, [commit, workspace]);

  return {
    ...state,
    selectRoundGame,
    selectEmptyAnalysis,
    syncSelectedGame,
    changeFollowLive: (enabled: boolean) => commit(workspace.setFollowLive(enabled)),
    goToNode: (node: AnalysisWorkspaceState["currentNode"]) => commit(workspace.goToNode(node)),
    goBack: () => commit(workspace.goBack()),
    goNext: () => commit(workspace.goNext()),
    goToStart: () => commit(workspace.goToStart()),
    goToLast: () => commit(workspace.goToLast()),
    makeMove: (from: string, to: string, promotion?: string) => commit(workspace.addMove(from, to, promotion)),
    addEngineVariation: (moves: string[]) => commit(workspace.addEngineVariation(moves)),
    loadPgn,
    evalScore: engine.evalScore,
    rawEvalScore: engine.rawEvalScore,
    bestMove: engine.bestMove,
    variations: engine.variations,
    variationsFen: engine.variationsFen,
  };
}
