import { EvalBarGameRow } from "./EvalBarGameRow";

export function EvalBarsView({ gameNumbers }: { gameNumbers: number[] }) {
  return (
    <div className="flex w-fit flex-col gap-2 bg-transparent">
      {gameNumbers.map(gameNumber => (
        <EvalBarGameRow key={gameNumber} gameNumber={gameNumber} />
      ))}
    </div>
  );
}
