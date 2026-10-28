import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import { Tournament, RoundData, Game, Pairing, TreeNode, GameCache } from "@/types/Game";
import { v4 as uuidv4 } from "uuid";
import { BASES } from "@/api/config";
import { loadTournaments } from "@/api/liveChessCloud";
import { useStockfish } from "@/stockfish/useStockfish";
import { renderLine } from "@/utils/renderLine";
import { getPgnMetadata, loadGamePgn } from "@/utils/loadGamePGN";

import { addTreeMove } from "@/utils/addTreeMove";
import { extractLiveSan, syncLiveMainLine } from "@/utils/syncLiveMainLine";

export function extractSan(move: string) {
  return extractLiveSan(move);
}

function getLastMainNode(root: TreeNode) {
  let node = root;
  while (node.main) {
    node = node.main;
  }
  return node;
}

export function useGameTree(engineVariations = 3) {
  const {
    evalScore,
    rawEvalScore,
    bestMove,
    analyze,
    setBestMove,
    variations,
    variationsFen,
    clearVariations,
  } = useStockfish();

  const createEmptyRoot = (): TreeNode => ({
    id: `empty-root-${uuidv4()}`,
    fen: new Chess().fen(),
    parent: null,
    variations: [],
    isMain: true,
  });

  const initialRoot = createEmptyRoot();

  const emptyAnalysisCacheRef = useRef<GameCache>({
    root: initialRoot,
    lastActiveNode: initialRoot,
  });
  const currentNodeRef = useRef<TreeNode | null>(initialRoot);
  const gamesTreesRef = useRef<Record<string, GameCache>>({
    "empty-analysis": emptyAnalysisCacheRef.current,
  });

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [gameRoot, setGameRoot] = useState<TreeNode | null>(initialRoot);
  const [currentIndexGame, setCurrentIndexGame] = useState<number>(0);
  const [currentNode, setCurrentNode] = useState<TreeNode | null>(initialRoot);
  const [analysisCurrentNode, setAnalysisCurrentNode] = useState<TreeNode>(initialRoot);
  const [followLiveCacheKey, setFollowLiveCacheKey] = useState<string | null>(null);
  // The application opens on the persistent empty analysis board, so PGN
  // import is available immediately even before a live board is selected.
  const [activeCacheKey, setActiveCacheKey] = useState("empty-analysis");
  const [analysisGame, setAnalysisGame] = useState<Game | undefined>(undefined);
  const [analysisPairing, setAnalysisPairing] = useState<Pairing | undefined>(undefined);

  const currentCacheKeyRef = useRef<string>("empty-analysis");
  const selectedGameRef = useRef<{
    tournamentIndex: number;
    round: number;
    gameId: string;
  } | null>(null);

  useEffect(() => {
    loadTournaments(BASES)
      .then(setTournaments)
      .catch((error) => {
        console.error("Failed to load tournaments:", error);
      });
  }, []);

  function selectRoundGame(roundDataSelected: RoundData, index: number) {
    const game = roundDataSelected.games[index];

    if (!game) {
      return;
    }

    selectedGameRef.current = {
      tournamentIndex: roundDataSelected.tournamentIndex,
      round: roundDataSelected.round,
      gameId: game.id,
    };
    setRoundData({
      tournamentIndex: roundDataSelected.tournamentIndex,
      tournamentId: roundDataSelected.tournamentId,
      tournamentName: roundDataSelected.tournamentName,
      round: roundDataSelected.round,
      info: {
        pairings: [roundDataSelected.info.pairings[index]],
      },
      games: [game],
      cacheKey: game.id,
    });
  }

  function selectEmptyAnalysis() {
    const cacheKey = "empty-analysis";
    const cache = emptyAnalysisCacheRef.current;

    // The analysis board is intentionally independent from a LiveChessCloud
    // game, so periodic API updates can never replace its position or PGN.
    selectedGameRef.current = null;
    gamesTreesRef.current[cacheKey] = cache;
    currentCacheKeyRef.current = cacheKey;
    setActiveCacheKey(cacheKey);
    setRoundData(null);
    setFollowLiveCacheKey(null);
    setAnalysisGame(cache.game);
    setAnalysisPairing(cache.pairing);

    const targetNode = cache.lastActiveNode;
    currentNodeRef.current = targetNode;
    setGameRoot(cache.root);
    setCurrentNode(targetNode);
    setAnalysisCurrentNode(targetNode);
    setBestMove(null);
    clearVariations();
    analyze(targetNode.fen, { multiPv: Math.max(1, engineVariations) });
  }

  const syncSelectedGame = useCallback((rounds: RoundData[]) => {
    const selected = selectedGameRef.current;
    if (!selected) {
      return;
    }

    const round = rounds.find(candidate =>
      candidate.tournamentIndex === selected.tournamentIndex &&
      candidate.round === selected.round,
    );
    const gameIndex = round?.games.findIndex(game => game.id === selected.gameId) ?? -1;
    const game = gameIndex >= 0 ? round?.games[gameIndex] : undefined;
    if (!round || !game) {
      return;
    }

    setRoundData({
      tournamentIndex: round.tournamentIndex,
      tournamentId: round.tournamentId,
      tournamentName: round.tournamentName,
      round: round.round,
      info: { pairings: [round.info.pairings[gameIndex]] },
      games: [game],
      cacheKey: game.id,
    });
  }, []);

  useEffect(() => {
    if (currentNodeRef.current) {
      analyze(currentNodeRef.current.fen, { multiPv: Math.max(1, engineVariations) });
    }
  }, [engineVariations]);

  function createGameTree(game: Game, index: number): TreeNode {
    const chess = new Chess();

    const root: TreeNode = {
      id: `game-${index}-root`,
      fen: chess.fen(),
      parent: null,
      variations: [],
      isMain: true,
    };

    let current = root;

    for (const m of game.moves ?? []) {
      const san = extractSan(m);
      let move = null;

      try {
        move = chess.move(san);
      } catch (e) {
        console.warn("Invalid game move:", {
          original: m,
          san,
          fen: chess.fen(),
          error: e instanceof Error ? e.message : String(e),
        });
      }

      if (move) {
        const node: TreeNode = {
          id: uuidv4(),
          move: move.san,
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          fen: chess.fen(),
          parent: current,
          variations: [],
          isMain: true,
        };

        current.main = node;
        current = node;
      }
    }

    return root;
  }

  function goToNode(target: TreeNode) {
    setBestMove(null);
    clearVariations();

    currentNodeRef.current = target;
    setCurrentNode(target);

    const cacheKey = currentCacheKeyRef.current;
    const cache = gamesTreesRef.current[cacheKey];

    if (cache) {
      cache.lastActiveNode = target;
      if (cacheKey === "empty-analysis") {
        setAnalysisCurrentNode(target);
      }
      if (followLiveCacheKey === cacheKey && target.id !== getLastMainNode(cache.root).id) {
        setFollowLiveCacheKey(null);
      }
    }

    analyze(target.fen, { multiPv: Math.max(1, engineVariations) });
  }

  function selectGame(
    game: Game,
    index: number,
    cacheKey: string = String(index),
  ) {
    const previousFen = currentNodeRef.current?.fen;
    const previousCacheKey = currentCacheKeyRef.current;
    // Follow live is a mode for the currently selected live board. Keep the
    // mode enabled when the user chooses another board and follow that board's
    // latest move immediately.
    const shouldFollowLive = followLiveCacheKey !== null;
    currentCacheKeyRef.current = cacheKey;
    setActiveCacheKey(cacheKey);

    let targetNode: TreeNode;
    let treeChanged = false;

    const existingCache = gamesTreesRef.current[cacheKey];

    if (existingCache) {
      const sync = syncLiveMainLine(existingCache.root, game.moves ?? []);
      if (sync.invalidMoves.length) {
        console.warn("Ignoring invalid live moves until the API corrects them:", sync.invalidMoves);
      }
      targetNode = shouldFollowLive
        ? sync.lastNode
        : existingCache.lastActiveNode;
      existingCache.lastActiveNode = targetNode;
      treeChanged = sync.changed;
    } else {
      const root = createGameTree(game, index);

      let lastNode = root;

      while (lastNode.main) {
        lastNode = lastNode.main;
      }

      const newCache: GameCache = {
        root,
        lastActiveNode: lastNode,
      };

      gamesTreesRef.current[cacheKey] = newCache;

      targetNode = lastNode;
    }

    const cache = gamesTreesRef.current[cacheKey];

    if (shouldFollowLive) {
      setFollowLiveCacheKey(cacheKey);
    }

    setGameRoot(treeChanged ? { ...cache.root } : cache.root);
    setCurrentIndexGame(index);

    currentNodeRef.current = targetNode;
    setCurrentNode(targetNode);

    if (previousCacheKey !== cacheKey || previousFen !== targetNode.fen) {
      analyze(targetNode.fen, { multiPv: Math.max(1, engineVariations) });
    }
  }

  function goBack() {
    const node = currentNodeRef.current;

    if (node && node.parent) {
      goToNode(node.parent);
    }
  }

  function goNext() {
    const node = currentNodeRef.current;

    if (node && node.main) {
      goToNode(node.main);
    }
  }

  function goToStart() {
    if (gameRoot) {
      goToNode(gameRoot);
    }
  }

  function goToLast() {
    let node = gameRoot;

    if (node) {
      while (node.main) {
        node = node.main;
      }

      goToNode(node);
    }
  }

  function changeFollowLive(enabled: boolean) {
    if (!enabled) {
      if (followLiveCacheKey === currentCacheKeyRef.current) {
        setFollowLiveCacheKey(null);
      }
      return;
    }

    const cache = gamesTreesRef.current[currentCacheKeyRef.current];
    if (cache) {
      setFollowLiveCacheKey(currentCacheKeyRef.current);
      goToNode(getLastMainNode(cache.root));
    }
  }

  function makeMove(from: string, to: string, promotion?: string) {
    const node = currentNodeRef.current;
    if (!node) {
      return;
    }
    const next = addTreeMove(node, from, to, promotion);
    goToNode(next);
    setGameRoot(prev => prev ? { ...prev } : prev);
  }

  function addEngineVariation(moves: string[]) {
    const startNode = currentNodeRef.current;
    if (!startNode || !moves.length) {
      return;
    }
    let node = startNode;
    for (const uci of moves) {
      try {
        node = addTreeMove(node, uci.slice(0, 2), uci.slice(2, 4), uci[4]);
      } catch (error) {
        console.warn("Engine move error", error);
        break;
      }
    }
    if (node === startNode) {
      return;
    }
    setGameRoot(prev => prev ? { ...prev } : prev);
    goToNode(node);
  }

  useEffect(() => {
    if (roundData?.games && roundData.games.length > 0) {
      selectGame(
        roundData.games[0],
        0,
        roundData.cacheKey ?? `default-${roundData.games[0].id}`,
      );
    }
  }, [roundData]);

  function loadPgn(pgn: string) {
    const root = loadGamePgn(pgn);

    if (root) {
      const metadata = getPgnMetadata(pgn);
      let lastNode = root;

      while (lastNode.main) {
        lastNode = lastNode.main;
      }

      const cache: GameCache = {
        root,
        lastActiveNode: lastNode,
        game: metadata.game,
        pairing: metadata.pairing,
      };

      // The imported game lives in the persistent final analysis-board slot.
      // It consequently remains there when the user switches to a live board
      // and back again.
      const cacheKey = "empty-analysis";

      gamesTreesRef.current[cacheKey] = cache;
      emptyAnalysisCacheRef.current = cache;
      currentCacheKeyRef.current = cacheKey;
      setActiveCacheKey(cacheKey);

      // An imported PGN takes ownership of the active analysis until the user
      // explicitly chooses a live game again. Otherwise the next API poll
      // would immediately restore that live game's move list over the PGN.
      selectedGameRef.current = null;
      setFollowLiveCacheKey(null);
      setAnalysisGame(metadata.game);
      setAnalysisPairing(metadata.pairing);

      setGameRoot(root);
      setCurrentNode(lastNode);
      setAnalysisCurrentNode(lastNode);

      currentNodeRef.current = lastNode;

      setBestMove(null);
      clearVariations();

      analyze(lastNode.fen, { multiPv: Math.max(1, engineVariations) });
    }
  }

  return {
    roundData,
    selectRoundGame,
    selectEmptyAnalysis,
    tournaments,
    gameRoot,
    currentIndexGame,
    currentNode,
    followLive: followLiveCacheKey === activeCacheKey,
    canImportPgn: activeCacheKey === "empty-analysis",
    analysisGame,
    analysisPairing,
    analysisMainNode: getLastMainNode(emptyAnalysisCacheRef.current.root),
    changeFollowLive,
    renderLine,
    goToNode,
    goBack,
    goNext,
    goToStart,
    goToLast,
    makeMove,
    bestMove,
    evalScore,
    rawEvalScore,
    addEngineVariation,
    variations,
    variationsFen,
    loadPgn,
    syncSelectedGame,
  };
}
