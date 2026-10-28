import { Chess } from "chess.js";
import type { Game, Pairing, Player, Result, TreeNode } from "@/types/Game";

function formatMove(node: TreeNode, startFen: string, firstInLine: boolean): string {
  if (!node.move) {
    return "";
  }
  const chess = new Chess(startFen);
  const turn = chess.turn();
  const moveNumber = chess.moveNumber();
  chess.move(node.move);
  if (turn === "w") {
    return `${moveNumber}. ${node.move}`;
  }
  return firstInLine ? `${moveNumber}... ${node.move}` : node.move;
}

function serializeBranch(node: TreeNode, startFen: string, firstInLine: boolean): string {
  return [
    formatMove(node, startFen, firstInLine),
    serializeContinuation(node),
  ].filter(Boolean).join(" ");
}

/**
 * `parent.variations` are alternatives to `parent.main`; emit them immediately
 * after that main move. This is the Recursive Annotation Variation ordering
 * expected by PGN readers such as Lichess and chess.js.
 */
function serializeContinuation(parent: TreeNode): string {
  const main = parent.main;
  if (!main) {
    return "";
  }
  const parts = [formatMove(main, parent.fen, false)];
  for (const variation of parent.variations) {
    parts.push(`(${serializeBranch(variation, parent.fen, true)})`);
  }
  const afterMain = serializeContinuation(main);
  if (afterMain) {
    parts.push(afterMain);
  }
  return parts.filter(Boolean).join(" ");
}

export function serializeGamePgn(gameRoot: TreeNode): string {
  if (!gameRoot.main) {
    return "";
  }
  return serializeBranch(gameRoot.main, gameRoot.fen, true).trim();
}

function escapeHeader(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function playerName(player?: Player) {
  return [player?.fname, player?.lname].filter(Boolean).join(" ");
}

function pgnResult(result: Result) {
  if (result === "WHITEWIN") return "1-0";
  if (result === "BLACKWIN") return "0-1";
  if (result === "DRAW") return "1/2-1/2";
  return "*";
}

function formatClock(seconds: number | undefined) {
  if (seconds === undefined || !Number.isFinite(seconds)) return undefined;
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const rest = value % 60;
  return [hours, minutes, rest].map(part => String(part).padStart(2, "0")).join(":");
}

export function downloadGamePgn(
  gameRoot: TreeNode | null,
  game?: Game,
  pairing?: Pairing,
) {
  if (!gameRoot) {
    return;
  }
  const setupHeaders = gameRoot.fen === new Chess().fen()
    ? []
    : ['[SetUp "1"]', `[FEN "${gameRoot.fen}"]`];
  const existing = game?.headers ?? {};
  const whiteName = playerName(pairing?.white ?? game?.white) || existing.White || "";
  const blackName = playerName(pairing?.black ?? game?.black) || existing.Black || "";
  const result = pgnResult(game?.result);
  const whiteClock = formatClock(game?.clock?.white) ?? existing.WhiteClock;
  const blackClock = formatClock(game?.clock?.black) ?? existing.BlackClock;
  const headers = [
    `[Event "${escapeHeader(existing.Event ?? "Analysis")}"]`,
    `[Site "${escapeHeader(existing.Site ?? "Local Analysis")}"]`,
    `[Date "${escapeHeader(existing.Date ?? new Date().toISOString().slice(0, 10).replace(/-/g, "."))}"]`,
    `[Round "${escapeHeader(existing.Round ?? "?")}"]`,
    `[White "${escapeHeader(whiteName)}"]`,
    `[Black "${escapeHeader(blackName)}"]`,
    `[Result "${result}"]`,
    ...(existing.WhiteElo ? [`[WhiteElo "${escapeHeader(existing.WhiteElo)}"]`] : []),
    ...(existing.BlackElo ? [`[BlackElo "${escapeHeader(existing.BlackElo)}"]`] : []),
    ...(whiteClock ? [`[WhiteClock "${escapeHeader(whiteClock)}"]`] : []),
    ...(blackClock ? [`[BlackClock "${escapeHeader(blackClock)}"]`] : []),
    ...setupHeaders,
    "",
  ].join("\n");
  const moves = [serializeGamePgn(gameRoot), result].filter(Boolean).join(" ");
  const blob = new Blob([`${headers}\n${moves}`], {
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
