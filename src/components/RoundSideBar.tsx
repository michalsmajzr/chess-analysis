import { SmallChessBoard } from "./SmallChessBoard";
import { RoundData } from "@/types/Game";

export function RoundSideBar({
  rounds,
  onSelect,
}: {
  rounds: RoundData[];
  onSelect: (roundData: RoundData, index: number) => void;
}) {
  return (
    <div className="w-73 h-full flex flex-col gap-2 pr-2 overflow-y-auto overflow-x-hidden">
      {rounds.map((roundData) => (
        <div key={`${roundData.tournamentIndex}-${roundData.round}`}>
          <div className="text-xs font-bold mb-1 break-all">
            {roundData.tournamentName}
          </div>

          <div className="text-xs opacity-60 mb-2">Round {roundData.round}</div>

          <div className="flex flex-col gap-3">
            {roundData.games.map((game, index) => (
              <SmallChessBoard
                key={game.id ?? index}
                game={game}
                pairing={roundData.info?.pairings?.[index]}
                onClick={() => onSelect(roundData, index)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
