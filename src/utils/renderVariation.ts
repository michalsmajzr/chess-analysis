import type { TreeNode } from "@/types/Game";
import type { RenderItem, RenderVariationResult } from "@/types/Render";

export function renderVariation(
  node: TreeNode,
  current: TreeNode | null,
  startMoveNumber: number,
  startsWithWhite: boolean,
): RenderVariationResult {
  const items: RenderItem[] = [];
  let moveNumber = startMoveNumber;
  let whiteTurn = startsWithWhite;

  function appendMove(move: TreeNode, showBlackNumber: boolean) {
    if (whiteTurn || showBlackNumber) {
      items.push({
        type: "variation_label",
        text: whiteTurn ? `${moveNumber}.` : `${moveNumber}...`,
      });
    }
    items.push({ type: "move", node: move, active: current === move });
  }

  function appendAlternatives(parent: TreeNode) {
    const [, turn, , , , number] = parent.fen.split(" ");
    for (const alternative of parent.variations) {
      items.push({ type: "text", text: " (" });
      items.push(...renderVariation(alternative, current, Number(number), turn === "w").items);
      items.push({ type: "text", text: ")" });
    }
  }

  let cursor = node;
  let afterAlternative = false;
  appendMove(cursor, true);

  while (cursor.main) {
    if (!whiteTurn) {
      moveNumber++;
    }
    whiteTurn = !whiteTurn;
    appendMove(cursor.main, afterAlternative);
    // Alternatives replace cursor.main: show them before its continuation,
    // instead of appending them after the entire remaining line.
    appendAlternatives(cursor);
    afterAlternative = cursor.variations.length > 0;
    cursor = cursor.main;
  }

  // Older trees can end with alternatives without a main reply.
  appendAlternatives(cursor);
  return { items, lastMoveNumber: moveNumber };
}
