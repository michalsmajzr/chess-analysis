import { Chess } from "chess.js";
import { TreeNode } from "@/types/Game";

function serializeChain(
  firstNode: TreeNode | undefined,
  startFen: string,
): string {
  if (!firstNode) {
    return "";
  }

  const chess = new Chess(startFen);
  const parts: string[] = [];

  let node: TreeNode | undefined = firstNode;

  while (node) {
    if (!node.move) {
      break;
    }

    const turn = chess.turn();
    const moveNumber = chess.moveNumber();
    const isBlackMoveNumber = turn === "b" && parts.length === 0;

    try {
      chess.move(node.move);
    } catch (error) {
      console.warn("PGN variation error", {
        error: error instanceof Error ? error.message : String(error),
      });

      break;
    }

    if (turn === "w") {
      parts.push(`${moveNumber}. ${node.move}`);
    } else if (isBlackMoveNumber) {
      parts.push(`${moveNumber}... ${node.move}`);
    } else {
      parts.push(node.move);
    }

    if (node.main) {
      const mainText = serializeChain(node.main, chess.fen());

      if (mainText) {
        parts.push(mainText);
      }
    }

    for (const variation of node.variations) {
      const variationText = serializeChain(variation, node.fen);

      if (variationText) {
        parts.push(`(${variationText})`);
      }
    }

    break;
  }

  return parts.join(" ").trim();
}

function serializeVariation(startNode: TreeNode, startFen: string): string {
  return serializeChain(startNode, startFen);
}

function serializeMainLine(root: TreeNode, startFen: string): string {
  const chess = new Chess(startFen);
  const parts: string[] = [];
  let node = root.main;

  while (node) {
    if (!node.move) {
      break;
    }

    const turn = chess.turn();
    const moveNumber = chess.moveNumber();

    try {
      chess.move(node.move);

      if (turn === "w") {
        parts.push(`${moveNumber}. ${node.move}`);
      } else {
        parts.push(node.move);
      }

      const variationStartFen = node.fen;

      if (node.main && node.main.move) {
        const mainNode = node.main;
        const mainTurn = chess.turn();
        const mainMoveNumber = chess.moveNumber();

        if (mainNode.move) {
          try {
            chess.move(mainNode.move);

            if (mainTurn === "w") {
              parts.push(`${mainMoveNumber}. ${mainNode.move}`);
            } else {
              parts.push(mainNode.move);
            }

            for (const variation of node.variations) {
              const variationText = serializeVariation(
                variation,
                variationStartFen,
              );

              if (variationText) {
                parts.push(`(${variationText})`);
              }
            }

            node = mainNode.main;
          } catch (error) {
            console.warn("PGN main error", {
              error: error instanceof Error ? error.message : String(error),
            });

            break;
          }
        }
      } else {
        break;
      }
    } catch (error) {
      console.warn("PGN main error", {
        error: error instanceof Error ? error.message : String(error),
      });

      break;
    }
  }

  return parts.join(" ").trim();
}

export function downloadGamePgn(gameRoot: TreeNode | null) {
  if (gameRoot) {
    const initialFen = gameRoot.fen;
    const pgnMoves = serializeMainLine(gameRoot, initialFen);
    const pgnHeaders = [
      '[Event "Analysis"]',
      '[Site "Local Analysis"]',
      `[Date "${new Date().toISOString().slice(0, 10).replace(/-/g, ".")}"]`,
      '[Round "?"]',
      '[White "Player"]',
      '[Black "Player"]',
      '[Result "*"]',
      "",
    ].join("\n");
    const fullPgn = `${pgnHeaders}${pgnMoves} *`;
    const blob = new Blob([fullPgn], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `analysis-${Date.now()}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
