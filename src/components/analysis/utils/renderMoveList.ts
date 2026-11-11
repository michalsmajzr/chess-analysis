import { Chess } from "chess.js";
import type { RenderItem } from "@/features/analysis/types/render";
import type { TreeNode } from "@/features/analysis/types/tree";

/** Converts a game tree into rows consumed by AnalysisSideBar. */
export function renderMoveList(
  node: TreeNode,
  current: TreeNode | null,
): RenderItem[] {
  const out: RenderItem[] = [];

  // Recursively adds a variation branch to the output, handling nested continuations and alternatives.
  const addVariationBranch = (firstNode: TreeNode, depth: number): void => {
    const content: RenderItem[] = [];
    const deferredBranches: { node: TreeNode; depth: number }[] = [];

    // Appends a single move to the content array, including its variation label if necessary.
    const appendMove = (branchNode: TreeNode, isFirstMove: boolean) => {
      const parent = branchNode.parent;
      if (!parent) {
        return;
      }

      const chess = new Chess(parent.fen);

      if (chess.turn() === "w" || isFirstMove) {
        content.push({
          type: "variation_label",
          text:
            chess.turn() === "w"
              ? `${chess.moveNumber()}.`
              : `${chess.moveNumber()}...`,
        });
      }

      content.push({
        type: "move",
        node: branchNode,
        active: current === branchNode,
      });
    };

    // Appends an inline branch, handling its main continuation and any nested alternatives.
    const appendInlineBranch = (
      branchFirstNode: TreeNode,
      branchDepth: number,
    ) => {
      // Recursively appends the main continuation and handles any deferred branches for this inline branch.
      const appendContinuation = (inlineNode: TreeNode): void => {
        if (!inlineNode.main) {
          // At the end of a line, alternatives form their own visible branch.
          deferredBranches.push(
            ...inlineNode.variations.map((node) => ({
              node,
              depth: branchDepth + 1,
            })),
          );
          return;
        }

        // If there is no main continuation, all variations are deferred for separate rendering.
        if (
          inlineNode.isMain === false &&
          inlineNode.variations.length >= 2
        ) {
          deferredBranches.push(
            { node: inlineNode.main, depth: branchDepth + 1 },
            ...inlineNode.variations.map((node) => ({
              node,
              depth: branchDepth + 1,
            })),
          );
          return;
        }

        // At this point, we have a main continuation to render inline.
        const mainContinuation = inlineNode.main;
        appendMove(mainContinuation, false);

        // Handle any nested alternatives for this main continuation inline.
        if (inlineNode.variations.length >= 2) {
          // If there are multiple variations, defer them for separate rendering.
          deferredBranches.push(
            ...inlineNode.variations.map((node) => ({
              node,
              depth: branchDepth + 1,
            })),
          );
        } else {
          // If there is only one variation, render it inline without parentheses.
          for (const childVariation of inlineNode.variations) {
            content.push({ type: "text", text: " (" });
            appendInlineBranch(childVariation, branchDepth + 1);
            content.push({ type: "text", text: ")" });
          }
        }

        // Recursively append the main continuation for this inline branch.
        appendContinuation(mainContinuation);
      }

      // Append the first move of the inline branch, marking it as the start of a variation.
      appendMove(branchFirstNode, true);
      appendContinuation(branchFirstNode);
    };

    // Start rendering the inline branch from the first node.
    appendInlineBranch(firstNode, depth);
    out.push({ type: "variation_row", depth, content });

    // Render any deferred branches after the main inline branch has been processed.
    for (const deferredBranch of deferredBranches) {
      addVariationBranch(deferredBranch.node, deferredBranch.depth);
    }
  };

  // Add all variations for the given node, rendering them as separate branches.
  const addVariations = (node: TreeNode): void => {
    if (!node.variations.length) {
      return;
    }

    // Iterate over each top-level variation and render it as a separate branch.
    for (const variation of node.variations) {
      addVariationBranch(variation, 0);
    }
  };

  let currentNode: TreeNode | null = node;

  // Traverse the main line of the game, rendering moves and handling variations inline.
  while (currentNode) {
    const nextNode: TreeNode | undefined = currentNode.main;

    // If the current node has no main continuation, we will handle its variations and exit the loop.
    if (!nextNode) {
      addVariations(currentNode);
      break;
    }

    // Extract the turn and move number from the FEN string to determine move display.
    const [, turn, , , , moveNumber] = currentNode.fen.split(" ");
    const isWhiteTurn = turn === "w";

    // Determine if we need to display the move number for this turn.
    if (isWhiteTurn) {
      out.push({
        type: "move_number",
        text: `${moveNumber}.`,
      });
    }

    // Append the move for the current node in the main line.
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
