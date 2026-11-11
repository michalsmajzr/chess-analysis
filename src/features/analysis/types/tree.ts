/** Represents a node in the analysis tree, including the move, FEN, parent, main line, and variations. */
export interface TreeNode {
  id: string;
  move?: string;
  from?: string;
  to?: string;
  promotion?: string;
  fen: string;
  parent: TreeNode | null;
  main?: TreeNode;
  variations: TreeNode[];
  isMain: boolean;
}
