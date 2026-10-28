import { RoundsMenu } from "./RoundsMenu";
import { Tournament } from "@/types/Game";

export function TournamentsMenu({
  tournaments = [],
  onRoundChange,
  className,
}: {
  tournaments?: Tournament[];
  onRoundChange: (
    baseId: string,
    roundId: number,
    tournamentIndex: number,
  ) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-4 p-2 max-[1276px]:flex-wrap max-[1276px]:justify-center ${className ?? ""}`}>
      {tournaments.map((tournament: Tournament, index: number) => (
        <div
          key={`${tournament.id}-${index}`}
          className="border-r pr-4 last:border-0 last:pr-0 max-[1276px]:border-r-0 max-[1276px]:pr-0"
        >
          <div className="mb-1 text-xs font-bold opacity-50 uppercase">
            {tournament.name ?? tournament.id}
          </div>

          <RoundsMenu
            tournament={tournament}
            onClick={(baseId: string, roundId: number) =>
              onRoundChange(baseId, roundId, index)
            }
          />
        </div>
      ))}
    </div>
  );
}
