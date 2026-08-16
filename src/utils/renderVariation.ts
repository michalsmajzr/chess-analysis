import { Chess } from "chess.js";
import { TreeNode } from "@/types/Game";
import {
  RenderItem,
  RenderChainResult,
  RenderVariationResult,
} from "@/types/Render";

function getMoveNumberFromFen(fen: string): number {
  const parts = fen.split(" ");
  return parseInt(parts[5], 10);
}

export function renderVariation(
  node: TreeNode,
  current: TreeNode | null,
  startMoveNumber: number,
  startsWithWhite: boolean,
): RenderVariationResult {
  const items: RenderItem[] = [];

  function renderChain(
    firstNode: TreeNode,
    moveNumber: number,
    isWhiteTurn: boolean,
    isFirstNode = true,
  ): RenderChainResult {
    const chainItems: RenderItem[] = [];

    let n: TreeNode | null = firstNode;
    let currentMoveNumber = moveNumber;
    let whiteTurn = isWhiteTurn;
    let first = isFirstNode;

    while (n) {
      const isWhite = whiteTurn;

      if (isWhite) {
        chainItems.push({
          type: "variation_label",
          text: `${currentMoveNumber}.`,
        });
      } else if (first) {
        chainItems.push({
          type: "variation_label",
          text: `${currentMoveNumber}...`,
        });
      }

      chainItems.push({
        type: "move",
        node: n,
        active: current === n,
      });

      if (n.main) {
        const nextMoveNumber = isWhite
          ? currentMoveNumber
          : currentMoveNumber + 1;

        const mainResult = renderChain(n.main, nextMoveNumber, !isWhite, false);

        chainItems.push(...mainResult.items);

        currentMoveNumber = mainResult.lastMoveNumber;
        whiteTurn = mainResult.isWhiteTurn;

        if (n.variations.length) {
          for (const v of n.variations) {
            chainItems.push({
              type: "text",
              text: " (",
            });

            const variationMoveNumber = getMoveNumberFromFen(n.fen);
            const variationStartsWithWhite = new Chess(n.fen).turn() === "w";

            const result = renderVariation(
              v,
              current,
              variationMoveNumber,
              variationStartsWithWhite,
            );

            chainItems.push(...result.items);

            chainItems.push({
              type: "text",
              text: ")",
            });
          }
        }

        first = false;
        n = null;
      } else {
        if (n.variations.length) {
          for (const v of n.variations) {
            chainItems.push({
              type: "text",
              text: " (",
            });

            const variationMoveNumber = getMoveNumberFromFen(n.fen);
            const variationStartsWithWhite = new Chess(n.fen).turn() === "w";

            const result = renderVariation(
              v,
              current,
              variationMoveNumber,
              variationStartsWithWhite,
            );

            chainItems.push(...result.items);

            chainItems.push({
              type: "text",
              text: ")",
            });
          }
        }

        first = false;
        n = null;
      }
    }

    return {
      items: chainItems,
      lastMoveNumber: currentMoveNumber,
      isWhiteTurn: whiteTurn,
    };
  }

  const result = renderChain(node, startMoveNumber, startsWithWhite, true);

  items.push(...result.items);

  return {
    items,
    lastMoveNumber: result.lastMoveNumber,
  };
}
