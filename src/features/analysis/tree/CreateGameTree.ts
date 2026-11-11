import { Chess } from "chess.js";
import { v4 as uuidv4 } from "uuid";
import type { Game } from "@/types/Game";
import { GameTree } from "@/features/analysis/tree/GameTree";
import { extractLiveSan } from "@/utils/extractLiveSan";
import type { TreeNode } from "@/features/analysis/types/tree";

/** Creates an empty tree at the standard chess starting position. */
export function createEmptyGameTree(): GameTree {
  const root: TreeNode = {
    id: `empty-root-${uuidv4()}`,
    fen: new Chess().fen(),
    parent: null,
    variations: [],
    isMain: true,
  };
  return new GameTree(root);
}

/** Wraps a parsed PGN root in a navigable analysis tree. */
export function createGameTreeFromRoot(root: TreeNode): GameTree {
  return new GameTree(root, GameTree.getLastMainNode(root));
}

/** Builds a tree whose main line contains the moves supplied by a live game. */
export function createGameTreeFromLiveGame(
  game: Game,
  index: number,
  onInvalidMove?: (move: string, fen: string, error: unknown) => void,
): GameTree {
  const chess = new Chess();
  const root: TreeNode = {
    id: `game-${index}-root`,
    fen: chess.fen(),
    parent: null,
    variations: [],
    isMain: true,
  };
  let node = root;

  for (const rawMove of game.moves ?? []) {
    try {
      const move = chess.move(extractLiveSan(rawMove));
      if (!move) continue;
      const next: TreeNode = {
        id: uuidv4(), move: move.san, from: move.from, to: move.to,
        promotion: move.promotion, fen: chess.fen(), parent: node,
        variations: [], isMain: true,
      };
      node.main = next;
      node = next;
    } catch (error) {
      onInvalidMove?.(rawMove, chess.fen(), error);
    }
  }
  return new GameTree(root, node);
}
