export function ChessboardEvalBar({ evalScore }: { evalScore: number }) {
  const clamped = Math.max(-5, Math.min(5, evalScore));
  const whitePercent = ((clamped + 5) / 10) * 100;

  return (
    <div className="relative h-full w-full overflow-hidden border border-stone-400 bg-transparent">
      <div className="absolute top-1/2 left-0 z-10 h-[3px] w-full -translate-y-1/2 bg-orange-300" />
      <div style={{ height: `${100 - whitePercent}%` }} className="bg-black" />
      <div style={{ height: `${whitePercent}%` }} className="bg-white" />
    </div>
  );
}
