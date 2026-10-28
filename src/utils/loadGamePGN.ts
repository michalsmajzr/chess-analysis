import { Chess } from "chess.js";
import { Game, Pairing, Result, TreeNode } from "@/types/Game";
import { v4 as uuidv4 } from "uuid";

type BranchKind = "main" | "variation";

function readHeader(pgn: string, name: string): string | undefined {
  const match = pgn.match(
    new RegExp(`^\\s*\\[${name}\\s+"([^"]*)"\\]\\s*$`, "mi"),
  );

  return match?.[1];
}

function readHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const match of pgn.matchAll(/^\s*\[([^\s\]]+)\s+"([^"]*)"\]\s*$/gm)) {
    headers[match[1]] = match[2];
  }
  return headers;
}

function playerFromPgn(name: string | undefined, elo: string | undefined) {
  const provided = name?.trim() ?? "";
  // Older local exports used the placeholder "Player". It is not a real
  // player name and should keep an analysis-board header empty.
  const value = provided.toLowerCase() === "player" ? "" : provided;
  const parts = value.includes(",")
    ? value.split(",").map(part => part.trim()).reverse()
    : value.split(/\s+/).filter(Boolean);
  return {
    fname: parts.slice(0, -1).join(" ") || parts[0] || "",
    lname: parts.length > 1 ? parts[parts.length - 1] : "",
    elo: elo && /^\d+$/.test(elo) ? Number(elo) : undefined,
  };
}

function clockSeconds(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parts = value.trim().split(":").map(Number);
  if (!parts.length || parts.some(part => !Number.isFinite(part))) return undefined;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Metadata for the persistent analysis board's headers. */
export function getPgnMetadata(pgn: string): { game: Game; pairing?: Pairing } {
  const headers = readHeaders(pgn);
  const white = playerFromPgn(headers.White, headers.WhiteElo);
  const black = playerFromPgn(headers.Black, headers.BlackElo);
  const resultByPgn: Record<string, Result> = {
    "1-0": "WHITEWIN",
    "0-1": "BLACKWIN",
    "1/2-1/2": "DRAW",
    "*": "*",
  };
  const clockValues = [...pgn.matchAll(/\[%clk\s+([^\]\s]+)\]/g)]
    .map(match => clockSeconds(match[1]));
  const latestClock = (color: "white" | "black") => {
    for (let index = clockValues.length - 1; index >= 0; index--) {
      if ((color === "white" ? index % 2 === 0 : index % 2 === 1) && clockValues[index] !== undefined) {
        return clockValues[index];
      }
    }
    return undefined;
  };
  const whiteClock = clockSeconds(headers.WhiteClock) ?? latestClock("white");
  const blackClock = clockSeconds(headers.BlackClock) ?? latestClock("black");
  const pairing = white.fname || white.lname || black.fname || black.lname ? { white, black } : undefined;

  return {
    game: {
      id: `pgn-${uuidv4()}`,
      white,
      black,
      result: resultByPgn[headers.Result] ?? "*",
      headers,
      moves: headers.Result && headers.Result !== "*" ? ["loaded"] : [],
      clock: whiteClock !== undefined || blackClock !== undefined
        ? { white: whiteClock, black: blackClock, run: null, timestamp: Date.now() }
        : undefined,
    },
    pairing,
  };
}

function tokenizeMoves(pgn: string): string[] {
  return pgn
    .replace(/^\s*\[[^\]]*\]\s*$/gm, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/;[^\r\n]*/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, " ")
    // Support both "1. e4" and compact "1.e4" PGN notation.
    .replace(/(\d+)\.(\.\.)?([^\s().]+)/g, "$1.$2 $3")
    .replace(/([()])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
}

function isMoveNumber(token: string): boolean {
  return /^\d+\.(?:\.\.)?$/.test(token);
}

export function loadGamePgn(pgn: string): TreeNode | null {
  try {
    const root: TreeNode = {
      id: `loaded-pgn-root-${uuidv4()}`,
      fen: readHeader(pgn, "FEN") ?? new Chess().fen(),
      parent: null,
      variations: [],
      isMain: true,
    };
    const tokens = tokenizeMoves(pgn);
    const index = { value: 0 };

    function addMove(
      parent: TreeNode,
      san: string,
      kind: BranchKind,
      isMainNode: boolean,
    ): TreeNode | null {
      const chess = new Chess(parent.fen);
      let move;

      try {
        move = chess.move(san.replace(/[!?]+$/g, ""));
      } catch (error) {
        console.warn("Skipping invalid PGN move", {
          san,
          fen: parent.fen,
          error,
        });
        return null;
      }

      if (!move) {
        return null;
      }

      const existing =
        kind === "main"
          ? parent.main
          : parent.variations.find(
              (child) =>
                child.move === move.san &&
                child.from === move.from &&
                child.to === move.to &&
                child.promotion === move.promotion,
            );

      if (existing) {
        return existing;
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
        isMain: isMainNode,
      };

      if (kind === "main") {
        parent.main = node;
      }
      else {
        parent.variations.push(node);
      }

      return node;
    }

    function parseLine(startNode: TreeNode, firstKind: BranchKind): void {
      let parent = startNode;
      let nextKind = firstKind;
      const isMainLine = firstKind === "main";

      while (index.value < tokens.length) {
        const token = tokens[index.value++];

        if (token === ")") {
          return;
        }

        if (token === "(") {
          // Recursive annotation variations begin before the immediately
          // preceding move, i.e. from that move's parent position.
          parseLine(parent.parent ?? startNode, "variation");
          continue;
        }

        if (isMoveNumber(token)) {
          continue;
        }

        const nextNode = addMove(parent, token, nextKind, isMainLine);

        if (nextNode) {
          parent = nextNode;
          nextKind = "main";
        }
      }
    }

    parseLine(root, "main");
    return root;
  } catch (error) {
    console.warn("Failed to load PGN", error);
    return null;
  }
}
