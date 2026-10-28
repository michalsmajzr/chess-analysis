import { Chess } from "chess.js";
import { TreeNode } from "@/types/Game";
import { RenderItem } from "@/types/Render";

export function renderLine(
  node: TreeNode,
  current: TreeNode | null,
): RenderItem[] {
  const out: RenderItem[] = [];

  const addVariationBranch = (firstNode: TreeNode, depth: number): void => {
    const content: RenderItem[] = [];
    const deferredBranches: { node: TreeNode; depth: number }[] = [];

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

    const appendInlineBranch = (
      branchFirstNode: TreeNode,
      branchDepth: number,
    ) => {
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

        // Count the main continuation as one of the choices. Lichess switches
        // to separate rows when a position has three continuations in total:
        // one main continuation and two alternatives.
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

        const mainContinuation = inlineNode.main;
        appendMove(mainContinuation, false);

        // A real main continuation keeps its alternatives in PGN-style
        // parentheses immediately after that continuation, before the next
        // main move is rendered.
        if (inlineNode.variations.length >= 2) {
          deferredBranches.push(
            ...inlineNode.variations.map((node) => ({
              node,
              depth: branchDepth + 1,
            })),
          );
        } else {
          for (const childVariation of inlineNode.variations) {
            content.push({ type: "text", text: " (" });
            appendInlineBranch(childVariation, branchDepth + 1);
            content.push({ type: "text", text: ")" });
          }
        }

        appendContinuation(mainContinuation);
      }

      appendMove(branchFirstNode, true);
      appendContinuation(branchFirstNode);
    };

    appendInlineBranch(firstNode, depth);
    out.push({ type: "variation_row", depth, content });

    for (const deferredBranch of deferredBranches) {
      addVariationBranch(deferredBranch.node, deferredBranch.depth);
    }
  };

  const addVariations = (node: TreeNode): void => {
    if (!node.variations.length) {
      return;
    }

    // Use the tree-aware renderer even for one top-level alternative. It can
    // keep a small nested fork inline and promote a three-choice fork to rows.
    for (const variation of node.variations) {
      addVariationBranch(variation, 0);
    }
  };

  let currentNode: TreeNode | null = node;

  while (currentNode) {
    const nextNode: TreeNode | undefined = currentNode.main;

    if (!nextNode) {
      addVariations(currentNode);
      break;
    }

    const [, turn, , , , moveNumber] = currentNode.fen.split(" ");
    const isWhiteTurn = turn === "w";

    if (isWhiteTurn) {
      out.push({
        type: "move_number",
        text: `${moveNumber}.`,
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
