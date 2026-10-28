import AccountBoxIcon from "@mui/icons-material/AccountBox";
import type { Player } from "@/types/Game";

export function EvalBarPlayer({
  player,
  side,
}: {
  player?: Player;
  side: "left" | "right";
}) {
  const icon = (
    <div className="flex size-11 shrink-0 items-center justify-center bg-transparent text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
      <AccountBoxIcon sx={{ fontSize: 37 }} />
    </div>
  );
  const name = (
    <div
      className={`min-w-0 flex-1 truncate px-3 text-[23px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
        side === "right" ? "text-right" : "text-left"
      }`}
    >
      {player?.lname ?? ""}
    </div>
  );

  return (
    <div className="flex min-w-0 items-center">
      {side === "left" ? icon : name}
      {side === "left" ? name : icon}
    </div>
  );
}
