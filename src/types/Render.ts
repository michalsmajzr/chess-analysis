import { TreeNode } from "@/types/Game";

export interface VariationLabelItem {
  type: "variation_label";
  text: string;
}

export interface MoveItem {
  type: "move";
  node: TreeNode;
  active: boolean;
  color?: "w" | "b";
}

export interface MoveNumberItem {
  type: "move_number";
  text: string;
}

export interface TextItem {
  type: "text";
  text: string;
}

export interface VariationRowItem {
  type: "variation_row";
  content: RenderItem[];
}

export type RenderItem =
  | VariationLabelItem
  | MoveItem
  | MoveNumberItem
  | TextItem
  | VariationRowItem;

export interface RenderChainResult {
  items: RenderItem[];
  lastMoveNumber: number;
  isWhiteTurn: boolean;
}

export interface RenderVariationResult {
  items: RenderItem[];
  lastMoveNumber: number;
}
