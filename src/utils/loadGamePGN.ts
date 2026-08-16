import { Chess } from "chess.js";
import { TreeNode } from "@/types/Game";
import { v4 as uuidv4 } from "uuid";

export function loadGamePgn(pgn: string): TreeNode | null {
  try {
    const root: TreeNode = {
      id: `loaded-pgn-root-${uuidv4()}`,
      fen: new Chess().fen(),
      parent: null,
      variations: [],
      isMain: true,
    };
    const text = pgn
      .replace(/^\s*\[[^\]]*\]\s*$/gm, " ")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/\$\d+/g, " ")
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, " ");
    const tokens = text
      .replace(/\(/g, " ( ")
      .replace(/\)/g, " ) ")
      .split(/\s+/)
      .map((x) => x.trim())
      .filter(Boolean);

    function isMoveNumber(token: string) {
      return /^\d+\.(?:\.\.)?$/.test(token);
    }

    function addMove(
      parent: TreeNode,
      chess: Chess,
      san: string,
      isMain: boolean,
    ): TreeNode | null {
      let move;

      try {
        move = chess.move(san);
      } catch (error) {
        console.warn("PGN move error:", {
          token: san,
          fen: chess.fen(),
          legalMoves: chess.moves(),
          error: error instanceof Error ? error.message : String(error),
        });

        return null;
      }

      if (move) {
        if (isMain && parent.main?.move === move.san) {
          return parent.main;
        }

        if (!isMain) {
          const existing = parent.variations.find(
            (v) =>
              v.move === move.san &&
              v.from === move.from &&
              v.to === move.to &&
              v.promotion === move.promotion,
          );

          if (existing) {
            return existing;
          }
        }

        const node: TreeNode = {
          id: uuidv4(),
          move: move.san,
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          fen: chess.fen(),
          parent,
          main: undefined,
          variations: [],
          isMain,
        };

        if (isMain) {
          parent.main = node;
        } else {
          parent.variations.push(node);
        }

        return node;
      }

      return null;
    }

    function parseLine(
      index: { value: number },
      startNode: TreeNode,
      startChess: Chess,
      isMainLine: boolean,
    ): TreeNode {
      let currentNode = startNode;

      let positionBeforeLastMove = new Chess(startChess.fen());

      while (index.value < tokens.length) {
        const token = tokens[index.value];

        if (token === ")") {
          index.value++;
          return currentNode;
        }

        if (token === "(") {
          index.value++;

          parseLine(
            index,
            currentNode.parent ?? startNode,
            new Chess(positionBeforeLastMove.fen()),
            false,
          );
        } else if (isMoveNumber(token)) {
          index.value++;
        } else {
          const chess = new Chess(
            currentNode === startNode && isMainLine
              ? startChess.fen()
              : currentNode.fen,
          );

          const nextNode = addMove(
            currentNode,
            chess,
            token.replace(/[!?]+$/g, ""),
            isMainLine,
          );

          if (nextNode) {
            positionBeforeLastMove = new Chess(currentNode.fen);

            currentNode = nextNode;

            index.value++;

            isMainLine = true;
          } else {
            index.value++;
          }
        }
      }

      return currentNode;
    }

    const index = { value: 0 };

    parseLine(index, root, new Chess(), true);

    return root;
  } catch (error) {
    console.warn("Failed to load PGN:", error);
    return null;
  }
}
