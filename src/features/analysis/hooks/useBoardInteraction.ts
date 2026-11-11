import { useCallback, useMemo, useState } from "react";
import type { BoardMarker, EngineArrow } from "@/types/Engine";
import type { TreeNode } from "@/features/analysis/types/tree";

type BoardAnnotations = { arrows: EngineArrow[]; markers: BoardMarker[] };

const EMPTY_ANNOTATIONS: BoardAnnotations = { arrows: [], markers: [] };

/** Keeps board annotations and move animation state tied to the current node. */
export function useBoardInteraction(
  currentNode: TreeNode | null,
  positionRevision: number,
  makeMove: (from: string, to: string, promotion?: string) => void,
) {
  const [moveAnimationId, setMoveAnimationId] = useState(0);
  const [annotations, setAnnotations] = useState<{
    positionId?: string;
    positionRevision?: number;
  } & BoardAnnotations>(EMPTY_ANNOTATIONS);

  /** Records a played move and advances the board animation sequence. */
  const onMove = useCallback((from: string, to: string, promotion?: string) => {
    setMoveAnimationId(value => value + 1);
    makeMove(from, to, promotion);
  }, [makeMove]);

  /** Saves arrows and markers only for the currently displayed position. */
  const onAnnotationsChange = useCallback((next: BoardAnnotations) => {
    setAnnotations({
      positionId: currentNode?.id,
      positionRevision,
      ...next,
    });
  }, [currentNode?.id, positionRevision]);

  const currentAnnotations = useMemo(
    () => annotations.positionId === currentNode?.id &&
      annotations.positionRevision === positionRevision
      ? annotations
      : EMPTY_ANNOTATIONS,
    [annotations, currentNode?.id, positionRevision],
  );

  return { moveAnimationId, currentAnnotations, onMove, onAnnotationsChange };
}
