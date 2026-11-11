import { addTreeMove } from "@/features/analysis/tree/addTreeMove";
import { syncLiveMainLine } from "@/features/analysis/tree/syncLiveMainLine";
import type { TreeNode } from "@/features/analysis/types/tree";

/** Game tree for managing chess positions and variations. */
export class GameTree {
  constructor(
    public readonly root: TreeNode, // The root node of the game tree
    private currentNode: TreeNode = root, // The currently selected node in the game tree
  ) {}

  /** Returns the currently selected position. */
  get current(): TreeNode {
    return this.currentNode;
  }

  /** Finds the final node of any tree's main line. */
  static getLastMainNode(root: TreeNode): TreeNode {
    let node = root;

    while (node.main) {
      node = node.main;
    }

    return node;
  }

  /** Returns the final node of this tree's main line. */
  get lastMainNode(): TreeNode {
    return GameTree.getLastMainNode(this.root);
  }

  /** Makes an existing tree node the current position. */
  select(node: TreeNode): TreeNode {
    this.currentNode = node;

    return node;
  }

  /** Moves to the parent position, if available. */
  goBack(): TreeNode | null {
    return this.currentNode.parent ? this.select(this.currentNode.parent) : null;
  }

  /** Moves to the main-line continuation, if available. */
  goNext(): TreeNode | null {
    return this.currentNode.main ? this.select(this.currentNode.main) : null;
  }

  /** Moves to the root position. */
  goToStart(): TreeNode {
    return this.select(this.root);
  }

  /** Moves to the final main-line position. */
  goToLast(): TreeNode {
    return this.select(this.lastMainNode);
  }

  /** Inserts a legal move and makes it current. */
  addMove(from: string, to: string, promotion?: string): TreeNode {
    return this.select(addTreeMove(this.currentNode, from, to, promotion));
  }

  /** Inserts an engine PV as a variation from the current position. */
  addEngineVariation(moves: string[]): TreeNode | null {
    if (!moves.length) return null;

    const start = this.currentNode;
    let node = start;
    for (const uci of moves) {
      node = addTreeMove(node, uci.slice(0, 2), uci.slice(2, 4), uci[4]);
    }

    return node === start ? null : this.select(node);
  }

  /** Synchronizes the game tree with live moves. */
  syncLiveMoves(moves: string[]) {
    return syncLiveMainLine(this.root, moves);
  }
}
