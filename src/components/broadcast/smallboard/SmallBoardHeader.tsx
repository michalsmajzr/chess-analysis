import AccountBoxIcon from "@mui/icons-material/AccountBox";
import { ChessClock } from "@/components/ChessClock";
import { getScore, hasFinalResult } from "@/utils/getScore";
import type { ObsGameData } from "@/types/Obs";

export function SmallBoardHeader({
  data,
  color,
  compact = false,
}: {
  data: ObsGameData | null;
  color: "white" | "black";
  compact?: boolean;
}) {
  const player = data?.pairing?.[color];
  const showScore = hasFinalResult(data?.game.result) && data.game.moves.length > 0;

  return (
    <div
      className={`flex items-center justify-between ${compact ? "gap-1 text-xs 2xl:gap-2 2xl:text-sm" : "gap-2"} overflow-hidden border border-stone-500 bg-gradient-to-r from-stone-200 to-white font-semibold text-black ${
        color === "white" ? "rounded-b" : "rounded-t"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        {player && (
          <>
            {player.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.icon} alt="logo" className={`${compact ? "h-6 w-6 2xl:h-8 2xl:w-8" : "h-8 w-8"} shrink-0 border-r border-stone-500`} />
            ) : (
              <AccountBoxIcon className={`shrink-0 ${compact ? "h-6 w-6 2xl:h-8 2xl:w-8" : "h-8 w-8"}`} />
            )}
            <div className={`flex min-w-0 flex-1 items-end ${compact ? "gap-1 p-0.5 pl-2 2xl:gap-2 2xl:p-1 2xl:pl-3" : "gap-2 p-1 pl-3"}`}>
              <span className="shrink-0 text-yellow-800">{player.title}</span>
              <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                {player.fname} {player.lname}
              </span>
              {player.elo != null && (
                <span className="shrink-0 font-normal">{player.elo}</span>
              )}
            </div>
          </>
        )}
      </div>

      {showScore && (
        <div className={`rounded bg-stone-800 ${compact ? "px-1 py-0 text-xs 2xl:px-2 2xl:py-0.5 2xl:text-sm" : "px-2 py-0.5 text-sm"} font-bold text-white`}>
          {getScore(data.game.result, color)}
        </div>
      )}

      <ChessClock
        game={data?.game}
        color={color}
        textSize={compact ? "small" : "medium"}
        className={compact ? "2xl:px-2 2xl:py-1 2xl:text-base" : undefined}
      />
    </div>
  );
}
