import AccountBoxIcon from "@mui/icons-material/AccountBox";
import { Game, Pairing } from "@/types/Game";

export function HeaderBoard({
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
      className={`flex items-center justify-between gap-2 font-semibold text-black 
        bg-gradient-to-r from-stone-200 to-white border border-stone-500 overflow-hidden ${
          color === "white" ? "rounded-b" : "rounded-t"
        }`}
    >
      <div className="flex items-center">
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
                <AccountBoxIcon sx={{ fontSize: 31 }} />
              )}

              <div className="flex gap-3 items-end p-1 pl-6">
                <span className="text-yellow-800">
                  {pairings?.white?.title}{" "}
                </span>
                <span className="truncate">
                  {pairings?.white?.fname} {pairings?.white?.lname}{" "}
                </span>

                <span className="font-normal">{pairings?.white?.elo}</span>
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
                <AccountBoxIcon sx={{ fontSize: 31 }} />
              )}
              <div className="flex gap-3 items-end p-1 pl-6">
                <span className="text-yellow-800">
                  {pairings?.black?.title}{" "}
                </span>
                <span className="truncate">
                  {pairings?.black?.fname} {pairings?.black?.lname}{" "}
                </span>
                <span className="font-normal">{pairings?.black?.elo}</span>
              </div>
            </>
          ))}
      </div>

      {activeGame?.result &&
        activeGame?.result !== "*" &&
        activeGame?.moves?.length > 0 && (
          <div className="bg-stone-800 text-white px-2 py-0.5 rounded text-sm font-bold">
            {score}
          </div>
        )}

      <div
        className={`text-sm ${color === "white" ? "text-gray-500" : "text-gray-300"}`}
      ></div>
    </div>
  );
}
