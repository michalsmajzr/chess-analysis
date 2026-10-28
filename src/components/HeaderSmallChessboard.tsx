import AccountBoxIcon from "@mui/icons-material/AccountBox";
import { Pairing, Game } from "@/types/Game";
import { ChessClock } from "@/components/ChessClock";
import { hasFinalResult } from "@/utils/getScore";

export function HeaderSmallChessboard({
  pairings,
  activeGame,
  score,
  color,
}: {
  pairings?: Pairing;
  activeGame?: Game;
  score: string;
  color: "white" | "black";
}) {
  const player = color === "white" ? pairings?.white : pairings?.black;

  return (
    <div
      className={`flex items-center justify-between gap-2 font-semibold text-sm text-black bg-gradient-to-r from-stone-200 to-white border border-stone-500 overflow-hidden ${
        color === "white" ? "rounded-b" : "rounded-t"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center">
        {player?.icon ? (
          <img src={player.icon} alt="logo" className="border-r border-stone-500 w-8 h-8" />
        ) : <AccountBoxIcon sx={{ fontSize: 26 }} />}
        <div className="min-w-0 flex-1 truncate px-2 py-1">
          {player ? `${player.fname} ${player.lname}` : ""}
        </div>
      </div>

      {hasFinalResult(activeGame?.result) &&
        activeGame?.moves?.length > 0 && (
          <div className="bg-stone-800 text-white px-1 py-0.5 rounded text-xs font-bold">
            {score}
          </div>
        )}

      <ChessClock game={activeGame} color={color} />
    </div>
  );
}
