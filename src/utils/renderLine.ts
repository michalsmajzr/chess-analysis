import { Chess } from "chess.js";
import { TreeNode } from "@/types/Game";
import { RenderItem } from "@/types/Render";
import { renderVariation } from "@/utils/renderVariation";

export function renderLine(
  node: TreeNode,
  current: TreeNode | null,
): RenderItem[] {
  const out: RenderItem[] = [];

  const addVariations = (node: TreeNode): void => {
    if (!node.variations.length) {
      return;
    }

    const chess = new Chess(node.fen);

    for (const variation of node.variations) {
      out.push({
        type: "variation_row",
        content: renderVariation(
          variation,
          current,
          chess.moveNumber(),
          chess.turn() === "w",
        ).items,
      });
    }
  };

  let currentNode: TreeNode | null = node;

  while (currentNode) {
    const nextNode: TreeNode | undefined = currentNode.main;

    if (!nextNode) {
      addVariations(currentNode);
      break;
    }

    const chess = new Chess(currentNode.fen);
    const isWhiteTurn = chess.turn() === "w";

    if (isWhiteTurn) {
      out.push({
        type: "move_number",
        text: `${chess.moveNumber()}.`,
      });
    }

    out.push({
      type: "move",
      node: nextNode,
      active: current === nextNode,
      color: isWhiteTurn ? "w" : "b",
    });

    addVariations(currentNode);

    currentNode = nextNode;
  }

  return out;
}
