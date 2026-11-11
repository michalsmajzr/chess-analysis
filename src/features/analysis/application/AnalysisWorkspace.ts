import { GameTree } from "@/features/analysis/domain/GameTree";
import { createEmptyGameTree } from "@/features/analysis/domain/CreateGameTree";
import type {
  AnalysisWorkspaceEntry,
  AnalysisWorkspaceResult,
  AnalysisWorkspaceState,
} from "@/features/analysis/types/workspace";
import type { TreeNode } from "@/features/analysis/types/tree";

/** Manages open analysis trees and the selected position. */
export class AnalysisWorkspace {
  private readonly entries = new Map<string, AnalysisWorkspaceEntry>();
  private activeKey = "empty-analysis";
  private followLiveKey: string | null = null;
  private revision = 0;

  constructor() {
    this.entries.set("empty-analysis", {
      key: "empty-analysis",
      tree: createEmptyGameTree(),
      gameIndex: 0,
    });
  }

  /** Returns the current view model for React and other adapters. */
  get state(): AnalysisWorkspaceState {
    const active = this.activeEntry;
    const analysis = this.emptyEntry;

    return {
      activeKey: this.activeKey,
      revision: this.revision,
      gameRoot: active.tree.root,
      currentNode: active.tree.current,
      currentIndexGame: active.gameIndex,
      roundData: active.roundData ?? null,
      activeGame: active.game,
      activePairing: active.pairing,
      analysisGame: analysis.game,
      analysisPairing: analysis.pairing,
      analysisMainNode: analysis.tree.lastMainNode,
      followLive: this.followLiveKey === this.activeKey,
      canImportPgn: this.activeKey === "empty-analysis",
    };
  }

  /** Reads an open tree so an external synchronizer can update it. */
  getTree(key: string): GameTree | undefined {
    return this.entries.get(key)?.tree;
  }

  /** Activates a prepared tree and stores it under its stable cache key. */
  openGame(
    entry: AnalysisWorkspaceEntry,
    preserveFollowLive = false,
    treeChanged = true,
  ): AnalysisWorkspaceResult {
    const shouldFollow = preserveFollowLive && this.hasFollowLive;
    const activeEntryChanged = this.activeKey !== entry.key;

    this.entries.set(entry.key, entry);
    this.activeKey = entry.key;

    if (entry.key === "empty-analysis") {
      this.followLiveKey = null; 
    } else if (shouldFollow) {
      this.followLiveKey = entry.key;
    }

    return this.changed(treeChanged || activeEntryChanged);
  }

  /** Returns to the persistent local analysis tree. */
  selectEmptyAnalysis(): AnalysisWorkspaceResult {
    if (this.activeKey === "empty-analysis") {
      return { changed: false };
    }

    this.activeKey = "empty-analysis";
    this.followLiveKey = null;

    return this.changed();
  }

  /** Selects a node in the active tree and exits follow-live when needed. */
  goToNode(node: TreeNode): AnalysisWorkspaceResult {
    const tree = this.activeEntry.tree;

    if (tree.current === node) {
      return { changed: false };
    }

    tree.select(node);
    if (this.followLiveKey === this.activeKey && node !== tree.lastMainNode) {
      this.followLiveKey = null;
    }

    return this.changed();
  }

  /** Selects the parent move when one exists. */
  goBack(): AnalysisWorkspaceResult {
    const node = this.activeEntry.tree.current.parent;
    return node ? this.goToNode(node) : { changed: false };
  }

  /** Selects the main-line continuation when one exists. */
  goNext(): AnalysisWorkspaceResult {
    const node = this.activeEntry.tree.current.main;
    return node ? this.goToNode(node) : { changed: false };
  }

  /** Selects the initial position of the active tree. */
  goToStart(): AnalysisWorkspaceResult {
    return this.goToNode(this.activeEntry.tree.root);
  }

  /** Selects the final move of the active main line. */
  goToLast(): AnalysisWorkspaceResult {
    return this.goToNode(this.activeEntry.tree.lastMainNode);
  }

  /** Enables or disables following the final live move. */
  setFollowLive(enabled: boolean): AnalysisWorkspaceResult {
    if (!enabled) {
      if (this.followLiveKey !== this.activeKey) return { changed: false };
      this.followLiveKey = null;
      return this.changed();
    }

    this.followLiveKey = this.activeKey;
    this.activeEntry.tree.goToLast();
    return this.changed();
  }

  /** Adds a legal user move to the active tree. */
  addMove(from: string, to: string, promotion?: string): AnalysisWorkspaceResult {
    this.activeEntry.tree.addMove(from, to, promotion);
    this.stopFollowingWhenLeavingMainLine();
    return this.changed();
  }

  /** Adds an engine line as a variation of the active position. */
  addEngineVariation(moves: string[]): AnalysisWorkspaceResult {
    const node = this.activeEntry.tree.addEngineVariation(moves);
    this.stopFollowingWhenLeavingMainLine();
    return node ? this.changed() : { changed: false };
  }

  /** Indicates whether the active entry should follow incoming live moves. */
  get followsActiveGame(): boolean {
    return this.followLiveKey === this.activeKey;
  }

  /** Indicates whether any live board is currently being followed. */
  get hasFollowLive(): boolean {
    return this.followLiveKey !== null;
  }

  /** Gets the active analysis workspace entry. */
  private get activeEntry(): AnalysisWorkspaceEntry {
    const entry = this.entries.get(this.activeKey);
    
    if (!entry) {
      throw new Error(`Unknown analysis workspace entry: ${this.activeKey}`);
    }

    return entry;
  }

  /** Gets the empty analysis workspace entry. */
  private get emptyEntry(): AnalysisWorkspaceEntry {
    const entry = this.entries.get("empty-analysis");

    if (!entry) {
      throw new Error("Missing empty analysis entry");
    }

    return entry;
  }

  /** Marks the workspace as changed and optionally triggers analysis. */
  private changed(shouldAnalyze = true): AnalysisWorkspaceResult {
    this.revision += 1;
    return { changed: true, state: this.state, shouldAnalyze };
  }

  /** Stops follow-live once the selected node is outside the live main line. */
  private stopFollowingWhenLeavingMainLine() {
    if (
      this.followLiveKey === this.activeKey &&
      this.activeEntry.tree.current !== this.activeEntry.tree.lastMainNode
    ) {
      this.followLiveKey = null;
    }
  }
}
