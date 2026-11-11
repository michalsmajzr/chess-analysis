import type { BoardMarker, EngineArrow } from "@/types/Engine";
import type { Game, Pairing } from "@/types/Game";

/** Transient drag state mirrored to broadcast chessboards. */
export type BoardDragData = {
  active: boolean;
  from?: string;
  to?: string | null;
  targets?: string[];
};

/** One small board published for multiboard broadcast views. */
export type ObsGameData = {
  fen: string;
  lastMove?: { from: string; to: string } | null;
  evalScore?: number;
  game: Game;
  pairing?: Pairing;
};

/** The active analysis board published to the main broadcast view. */
export type ObsBoardData = ObsGameData & {
  liveFen: string;
  liveLastMove?: { from: string; to: string } | null;
  arrows: EngineArrow[];
  markers: BoardMarker[];
  moveAnimationId: number;
};

/** Messages received by the browser-side OBS client. */
export type ObsServerMessage =
  | { type: "publisher-authenticated" }
  | { type: "publisher-revoked"; reason?: string }
  | { type: "board"; data: ObsBoardData }
  | { type: "board-drag"; data: BoardDragData }
  | { type: "game-count"; count: number }
  | { type: "game"; game: number; data: ObsGameData }
  | { type: "game-removed"; game: number };
