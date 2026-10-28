import type { EnginePV } from "@/types/Engine";

/** Keep per-variation events intact; select rank 1 only for the main evaluation. */
export function getPrimaryVariation(event: { pv?: EnginePV; variations?: EnginePV[] }) {
  return event.variations?.find(variation => variation.rank === 1) ??
    (event.pv?.rank === 1 ? event.pv : undefined);
}

/** Convert an engine evaluation, already normalized to White, to an evalbar value. */
export function getEvalScore(
  evaluation: { score?: number; mate?: number; fen?: string },
): number | undefined {
  if (evaluation.mate !== undefined) {
    if (evaluation.mate === 0) {
      // The side to move is checkmated. Signed zero cannot encode the winner.
      if (!evaluation.fen) {
        return undefined;
      }
      return evaluation.fen.split(" ")[1] === "w" ? -100 : 100;
    }
    return evaluation.mate > 0 ? 100 : -100;
  }
  return evaluation.score;
}
