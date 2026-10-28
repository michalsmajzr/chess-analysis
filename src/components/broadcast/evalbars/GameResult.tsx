import { getScore } from "@/utils/getScore";
import type { Result } from "@/types/Game";

export function GameResult({ result }: { result: Result }) {
  return (
    <div className="flex h-8 items-center justify-center rounded-md bg-stone-900 px-4 text-[20px] font-bold text-white">
      <span>{getScore(result, "white")}</span>
      <span className="px-2">:</span>
      <span>{getScore(result, "black")}</span>
    </div>
  );
}
