import { useMemo } from "react";
import type { EngineArrow, EnginePV } from "@/types/Engine";

/** Derives sorted engine arrows for the position currently shown on the board. */
export function useEngineArrows(
  enabled: boolean,
  currentFen: string | undefined,
  variationsFen: string | null,
  variations: EnginePV[],
): EngineArrow[] {
  return useMemo(() => {
    if (!enabled || variationsFen !== currentFen) return [];
    return variations
      .filter(variation => variation.bestMove)
      .sort((left, right) => (right.score ?? -Infinity) - (left.score ?? -Infinity))
      .map(variation => ({
        from: variation.bestMove!.from,
        to: variation.bestMove!.to,
        promotion: variation.bestMove!.promotion,
        score: variation.score,
        mate: variation.mate,
      }));
  }, [enabled, currentFen, variationsFen, variations]);
}
