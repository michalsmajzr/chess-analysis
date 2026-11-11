import { createGameTreeFromRoot } from "@/features/analysis/tree/CreateGameTree";
import { getPgnMetadata, loadGamePgn } from "@/features/analysis/pgn/PgnParser";

/** Parses a PGN into an analysis tree and its display metadata. */
export function importPgn(pgn: string) {
  const root = loadGamePgn(pgn);
  if (!root) return { imported: false as const };

  const metadata = getPgnMetadata(pgn);
  return {
    imported: true as const,
    tree: createGameTreeFromRoot(root),
    game: metadata.game,
    pairing: metadata.pairing,
  };
}
