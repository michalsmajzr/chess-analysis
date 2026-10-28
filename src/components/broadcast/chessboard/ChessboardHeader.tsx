import AccountBoxIcon from "@mui/icons-material/AccountBox";
import { ChessboardClock } from "./ChessboardClock";
import { getScore, hasFinalResult } from "@/utils/getScore";
import type { ObsBoardData } from "@/types/Obs";

export function ChessboardHeader({
  data,
  color,
}: {
  data: ObsBoardData | null;
  color: "white" | "black";
}) {
  const player = data?.pairing?.[color];
  const showScore = hasFinalResult(data?.game.result);

  return (
    <div className="grid h-[54px] grid-cols-[minmax(0,1fr)_72px_220px] items-center overflow-hidden rounded-md border border-stone-300 bg-white text-black">
      <div className="flex h-full min-w-0 items-center">
        {player && (
          <>
            {player.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.icon}
                alt={`${player.fname} ${player.lname}`}
                className="aspect-square h-full shrink-0 object-cover"
              />
            ) : (
              <div className="flex aspect-square h-full shrink-0 items-center justify-center bg-black text-white">
                <AccountBoxIcon sx={{ fontSize: 40 }} />
              </div>
            )}
            <div className="flex min-w-0 items-baseline gap-3 px-8 whitespace-nowrap">
              <span className="text-[23px] font-bold text-amber-700">{player.title}</span>
              <span className="truncate text-[25px] font-bold">{player.fname} {player.lname}</span>
              {player.elo != null && (
                <span className="text-[21px] font-normal">{player.elo}</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-center">
        {showScore && (
          <div className="flex h-[40px] min-w-[38px] items-center justify-center rounded-md bg-stone-800 px-2 text-[25px] font-bold text-white">
            {getScore(data.game.result, color)}
          </div>
        )}
      </div>

      <div className="flex h-full justify-end">
        <ChessboardClock game={data?.game} color={color} />
      </div>
    </div>
  );
}
