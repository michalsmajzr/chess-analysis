import type { TreeNode } from "@/features/analysis/types/tree";

/** Represents items used by the move-list UI to render the analysis tree. */
export interface VariationLabelItem {
  type: "variation_label";
  text: string;
}

/** Represents a move in the move-list UI, including the node, active state, and color. */
export interface MoveItem {
  type: "move";
  node: TreeNode;
  active: boolean;
  color?: "w" | "b";
}

/** Represents a move number in the move-list UI. */
export interface MoveNumberItem {
  type: "move_number";
  text: string;
}

/** Represents a text item in the move-list UI, used for annotations or comments. */
export interface TextItem {
  type: "text";
  text: string;
}

/** Represents a row of variations in the move-list UI, including its depth and content. */
export interface VariationRowItem {
  type: "variation_row";
  depth: number;
  content: RenderItem[];
}

/** Represents any item that can be rendered in the move-list UI. */
export type RenderItem =
  | VariationLabelItem
  | MoveItem
  | MoveNumberItem
  | TextItem
  | VariationRowItem;

/** Represents the result of rendering a variation, including the generated items and the last move number. */
export interface RenderVariationResult {
  items: RenderItem[];
  lastMoveNumber: number;
}
