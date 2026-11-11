import { Chess } from "chess.js";
import { v4 as uuidv4 } from "uuid";
import type { TreeNode } from "@/features/analysis/types/tree";
import { extractLiveSan } from "@/utils/extractLiveSan";

/**
 * Updates the main line of a cached analysis tree to match the latest live moves.
 */
function setMainStatus(node: TreeNode, isMain: boolean) {
  let current: TreeNode | undefined = node;
  while (current) {
    current.isMain = isMain;
    current = current.main;
  }
}

/**
 * Moves the current main line of a parent node to its variations.
 * Returns true if a main line was moved.
 */
function moveMainToVariations(parent: TreeNode): boolean {
  const previousMain = parent.main;
  if (!previousMain) {
    return false;
  }

  setMainStatus(previousMain, false);

  if (!parent.variations.some(variation => variation.id === previousMain.id)) {
    parent.variations.push(previousMain);
  }
  parent.main = undefined;

  return true;
}

/**
 * Makes a cached analysis tree match the latest authoritative move list.
 *
 * A replaced live move is retained as a variation, so user/engine analysis is
 * never discarded. Invalid transient API moves are skipped; all later moves
 * are still attempted from the last known legal position on the next poll.
 */
export function syncLiveMainLine(root: TreeNode, moves: string[]) {
  let chess: Chess | undefined;
  let current = root;
  let changed = false;
  const invalidMoves: string[] = [];

  for (const rawMove of moves) {
    const san = extractLiveSan(rawMove);
    if (!san) {
      continue;
    }

    // If the next move matches the current main line, just follow it.
    if (current.main?.move === san) {
      current.main.isMain = true;
      current = current.main;
      chess = undefined;
      continue;
    }

    chess ??= new Chess(current.fen);

    let move;
    try {
      move = chess.move(san);
    } catch {
      invalidMoves.push(rawMove);
      continue;
    }

    if (!move) {
      invalidMoves.push(rawMove);
      continue;
    }

    const fen = chess.fen();
    if (current.main?.fen === fen) {
      current.main.isMain = true;
      current = current.main;
      continue;
    }

    changed = moveMainToVariations(current) || changed;

    const variationIndex = current.variations.findIndex(
      variation => variation.fen === fen,
    );
    if (variationIndex >= 0) {
      const [existing] = current.variations.splice(variationIndex, 1);
      setMainStatus(existing, true);
      current.main = existing;
      current = existing;
      changed = true;
      continue;
    }

    const liveNode: TreeNode = {
      id: uuidv4(),
      move: move.san,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      fen,
      parent: current,
      variations: [],
      isMain: true,
    };
    current.main = liveNode;
    current = liveNode;
    changed = true;
  }

  changed = moveMainToVariations(current) || changed;

  return { lastNode: current, changed, invalidMoves };
}
