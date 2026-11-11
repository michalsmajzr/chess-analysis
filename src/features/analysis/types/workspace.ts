import type { Game, Pairing, RoundData } from "@/types/Game";
import type { GameTree } from "@/features/analysis/domain/GameTree";
import type { TreeNode } from "@/features/analysis/types/tree";

/** Represents an entry in the analysis workspace, including the game tree and associated metadata. */
export type AnalysisWorkspaceEntry = {
  key: string;
  tree: GameTree;
  game?: Game;
  pairing?: Pairing;
  roundData?: RoundData | null;
  gameIndex: number;
};

/** Represents the complete state of the analysis workspace, including the active game, current node, and analysis settings. */
export type AnalysisWorkspaceState = {
  activeKey: string;
  /** Increments after every command that changes visible workspace state. */
  revision: number;
  gameRoot: TreeNode;
  currentNode: TreeNode;
  currentIndexGame: number;
  roundData: RoundData | null;
  activeGame?: Game;
  activePairing?: Pairing;
  analysisGame?: Game;
  analysisPairing?: Pairing;
  analysisMainNode: TreeNode;
  followLive: boolean;
  canImportPgn: boolean;
};

/** Represents the result of an operation on the analysis workspace, indicating whether the state changed. */
export type AnalysisWorkspaceResult =
  | { changed: false }
  | {
      changed: true;
      state: AnalysisWorkspaceState;
      /** Whether the selected position changed and requires new engine work. */
      shouldAnalyze: boolean;
    };
