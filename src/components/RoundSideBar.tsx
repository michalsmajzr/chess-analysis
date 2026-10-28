import { SmallChessBoard } from "./SmallChessBoard";
import { EmptyAnalysisBoard } from "./EmptyAnalysisBoard";
import { Game, Pairing, RoundData } from "@/types/Game";

export function RoundSideBar({
  rounds,
  onSelect,
  onSelectEmpty,
  analysisFen,
  analysisLastMove,
  analysisGame,
  analysisPairing,
}: {
  rounds: RoundData[];
  onSelect: (roundData: RoundData, index: number, board: number) => void;
  onSelectEmpty: () => void;
  analysisFen: string;
  analysisLastMove: { from: string; to: string } | null;
  analysisGame?: Game;
  analysisPairing?: Pairing;
}) {
  return (
    <div className="round-sidebar-scroll h-full w-62 shrink-0 flex flex-col gap-2 overflow-y-auto overflow-x-hidden max-[1276px]:h-auto max-[1276px]:w-full max-[1276px]:flex-row max-[1276px]:items-start max-[1276px]:gap-3 max-[1276px]:px-4 max-[1276px]:pb-2 max-[1276px]:overflow-x-auto max-[1276px]:overflow-y-hidden">
      {rounds.map((roundData, roundIndex) => (
        <div key={`${roundData.tournamentIndex}-${roundData.round}`} className="shrink-0 max-[1276px]:flex max-[1276px]:gap-3">
          <div className="mb-1 text-xs font-bold break-all max-[1276px]:hidden">
            {roundData.tournamentName}
          </div>

          <div className="mb-2 text-xs opacity-60 max-[1276px]:hidden">Round {roundData.round}</div>

          <div className="flex flex-col gap-3 max-[1276px]:flex-row">
            {roundData.games.map((game, index) => {
              const board = rounds.slice(0, roundIndex).reduce(
                (count, round) => count + round.games.length, 0,
              ) + index + 1;
              return <SmallChessBoard
                key={game.id ?? index}
                game={game}
                pairing={roundData.info?.pairings?.[index]}
                obsGame={board}
                onClick={() => onSelect(roundData, index, board)}
              />
            })}
          </div>
        </div>
      ))}
      <EmptyAnalysisBoard
        fen={analysisFen}
        lastMove={analysisLastMove}
        obsGame={rounds.reduce((count, round) => count + round.games.length, 0) + 1}
        game={analysisGame}
        pairing={analysisPairing}
        onClick={onSelectEmpty}
      />
    </div>
  );
}
