import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Tournament, RoundData, Game, TreeNode, GameCache } from "@/types/Game";
import { v4 as uuidv4 } from "uuid";
import { BASES } from "@/api/config";
import { loadTournaments } from "@/api/liveChessCloud";
import { useStockfish } from "@/stockfish/useStockfish";
import { renderLine } from "@/utils/renderLine";
import { loadGamePgn } from "@/utils/loadGamePGN";

export function extractSan(move: string) {
  return move
    .replace(/^\d+\.\s*/, "")
    .replace(/\{.*?\}/g, "")
    .replace(/\$\d+/g, "")
    .replace(/[?!]+/g, "")
    .trim()
    .split(" ")[0];
}

export function useGameTree(engineVariations = 3) {
  const {
    evalScore,
    bestMove,
    analyze,
    setBestMove,
    variations,
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

  const currentNodeRef = useRef<TreeNode | null>(initialRoot);
  const gamesTreesRef = useRef<Record<string, GameCache>>({});

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [gameRoot, setGameRoot] = useState<TreeNode | null>(initialRoot);
  const [currentIndexGame, setCurrentIndexGame] = useState<number>(0);
  const [currentNode, setCurrentNode] = useState<TreeNode | null>(initialRoot);

  const loadedPgnTreeRef = useRef<GameCache | null>(null);

  const currentCacheKeyRef = useRef<string>("key");

  useEffect(() => {
    loadTournaments(BASES)
      .then(setTournaments)
      .catch((error) => {
        console.error("Failed to load tournaments:", error);
      });
  }, []);

  function selectRoundGame(roundDataSelected: RoundData, index: number) {
    const game = roundDataSelected.games[index];

    if (!game) return;

    setRoundData({
      tournamentIndex: roundDataSelected.tournamentIndex,
      tournamentId: roundDataSelected.tournamentId,
      tournamentName: roundDataSelected.tournamentName,
      round: roundDataSelected.round,
      info: {
        pairings: [roundDataSelected.info.pairings[index]],
      },
      games: [game],
      cacheKey: `${roundDataSelected.tournamentIndex}-${roundDataSelected.round}-${index}`,
    });
  }

  useEffect(() => {
    if (currentNodeRef.current) {
      analyze(currentNodeRef.current.fen, {
        multiPv: Math.max(1, engineVariations),
      });
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
    }

    analyze(target.fen, {
      multiPv: Math.max(1, engineVariations),
    });
  }

  function selectGame(
    game: Game,
    index: number,
    cacheKey: string = String(index),
  ) {
    currentCacheKeyRef.current = cacheKey;

    let targetNode: TreeNode;

    const existingCache = gamesTreesRef.current[cacheKey];

    if (existingCache) {
      targetNode = existingCache.lastActiveNode;
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

    setGameRoot(cache.root);
    setCurrentIndexGame(index);

    currentNodeRef.current = targetNode;
    setCurrentNode(targetNode);

    analyze(targetNode.fen, {
      multiPv: Math.max(1, engineVariations),
    });
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

  function makeMove(from: string, to: string, promotion?: string) {
    const node = currentNodeRef.current;

    if (node) {
      const chess = new Chess(node.fen);

      const move = chess.move({
        from,
        to,
        promotion,
      });

      if (move) {
        const san = move.san;

        if (node.main?.move === san) {
          goToNode(node.main);
        } else {
          const existingVar = node.variations.find((v) => v.move === san);

          if (existingVar) {
            goToNode(existingVar);
          } else {
            const newNode: TreeNode = {
              id: uuidv4(),
              move: san,
              from: move.from,
              to: move.to,
              promotion: move.promotion,
              fen: chess.fen(),
              parent: node,
              main: undefined,
              variations: [],
              isMain: false,
            };

            if (node.isMain === false) {
              if (!node.main) {
                node.main = newNode;
              } else {
                node.variations.push(newNode);
              }

              newNode.isMain = false;
            } else {
              node.variations.push(newNode);
              newNode.isMain = false;
            }

            goToNode(newNode);

            setGameRoot((prev) => {
              if (prev) {
                return { ...prev };
              }

              return prev;
            });
          }
        }
      }
    }
  }

  function addEngineVariation(moves: string[]) {
    const startNode = currentNodeRef.current;

    if (!startNode || moves.length === 0) return;

    let node = startNode;
    let firstNode: TreeNode | null = null;

    for (const uci of moves) {
      const chess = new Chess(node.fen);

      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;

      let move;

      try {
        move = chess.move({
          from,
          to,
          promotion,
        });
      } catch (error) {
        console.warn("Engine move error", error);
        break;
      }

      if (!move) break;

      const san = move.san;

      const newNode: TreeNode = {
        id: uuidv4(),
        move: san,
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        fen: chess.fen(),
        parent: node,
        main: undefined,
        variations: [],
        isMain: false,
      };

      if (!firstNode) {
        startNode.variations.push(newNode);
        firstNode = newNode;
      } else {
        node.main = newNode;
      }

      node = newNode;
    }

    if (!firstNode) return;

    setGameRoot((prev) => (prev ? { ...prev } : prev));

    currentNodeRef.current = node;
    setCurrentNode(node);

    const cacheKey = currentCacheKeyRef.current;
    const cache = gamesTreesRef.current[cacheKey];

    if (cache) {
      cache.lastActiveNode = node;
    }

    setBestMove(null);

    analyze(node.fen, {
      multiPv: Math.max(1, engineVariations),
    });
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
      let lastNode = root;

      while (lastNode.main) {
        lastNode = lastNode.main;
      }

      const cache: GameCache = {
        root,
        lastActiveNode: lastNode,
      };

      const cacheKey = `loaded-pgn-${root.id}`;

      gamesTreesRef.current[cacheKey] = cache;
      currentCacheKeyRef.current = cacheKey;

      loadedPgnTreeRef.current = cache;

      setGameRoot(root);
      setCurrentNode(lastNode);

      currentNodeRef.current = lastNode;

      setBestMove(null);
      clearVariations();

      analyze(lastNode.fen, {
        multiPv: Math.max(1, engineVariations),
      });
    }
  }

  return {
    roundData,
    selectRoundGame,
    tournaments,
    gameRoot,
    currentIndexGame,
    currentNode,
    renderLine,
    goToNode,
    goBack,
    goNext,
    goToStart,
    goToLast,
    makeMove,
    bestMove,
    evalScore,
    addEngineVariation,
    variations,
    loadPgn,
  };
}
