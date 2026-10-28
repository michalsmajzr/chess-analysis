import { Chess } from "chess.js";
import { v4 as uuidv4 } from "uuid";
import type { TreeNode } from "@/types/Game";

/** Shared insertion rules for board moves and engine lines. */
export function addTreeMove(node: TreeNode, from: string, to: string, promotion?: string): TreeNode {
  const chess = new Chess(node.fen);
  const move = chess.move({ from, to, promotion });
  if (node.main?.move === move.san) {
    return node.main;
  }
  const existing = node.variations.find(variation => variation.move === move.san);
  if (existing) {
    return existing;
  }

  const next: TreeNode = {
    id: uuidv4(),
    move: move.san,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    fen: chess.fen(),
    parent: node,
    variations: [],
    isMain: false,
  };
  // Analysis never changes the official main line. The first analytical move
  // is a variation even at the end of a live game; its later continuation can
  // use `main` inside that variation. Only API synchronisation promotes moves.
  if (!node.isMain && !node.main) {
    node.main = next;
  }
  else {
    node.variations.push(next);
  }
  return next;
}
