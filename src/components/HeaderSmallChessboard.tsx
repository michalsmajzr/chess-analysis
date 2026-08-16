import AccountBoxIcon from "@mui/icons-material/AccountBox";
import { Pairing, Game } from "@/types/Game";

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
  return (
    <div
      className={`flex items-center justify-between gap-2 font-semibold text-sm text-black bg-gradient-to-r from-stone-200 to-white border border-stone-500 overflow-hidden ${
        color === "white" ? "rounded-b" : "rounded-t"
      }`}
    >
      <div className="flex items-center min-w-0">
        {pairings &&
          (color === "white" ? (
            <>
              {pairings?.white?.icon ? (
                <img
                  src={pairings?.white?.icon}
                  alt="logo"
                  className="border-r border-stone-500 w-8 h-8"
                />
              ) : (
                <AccountBoxIcon sx={{ fontSize: 26 }} />
              )}
              <div className="px-2 py-1 truncate">
                {pairings?.white?.fname} {pairings?.white?.lname}
              </div>
            </>
          ) : (
            <>
              {pairings?.black?.icon ? (
                <img
                  src={pairings?.black?.icon}
                  alt="logo"
                  className="border-r border-stone-500 w-8 h-8"
                />
              ) : (
                <AccountBoxIcon sx={{ fontSize: 26 }} />
              )}
              <div className="px-2 py-1 truncate">
                {pairings?.black?.fname} {pairings?.black?.lname}
              </div>
            </>
          ))}
      </div>

      {activeGame?.result &&
        activeGame?.result !== "*" &&
        activeGame?.moves?.length > 0 && (
          <div className="bg-stone-800 text-white px-1 py-0.5 rounded text-xs font-bold">
            {score}
          </div>
        )}

      <div
        className={`text-sm ${color === "white" ? "text-gray-500" : "text-gray-300"}`}
      ></div>
    </div>
  );
}
