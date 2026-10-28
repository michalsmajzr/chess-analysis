export function SmallBoardEvalBar({
  evalScore,
  wide = false,
}: {
  evalScore: number;
  wide?: boolean;
}) {
  const clamped = Math.max(-5, Math.min(5, evalScore));
  const whitePercent = ((clamped + 5) / 10) * 100;

  return (
    <div className={`relative h-full ${wide ? "w-4" : "w-3"} overflow-hidden border border-stone-500`}>
      <div className="absolute top-1/2 left-0 z-10 h-1 w-full -translate-y-1/2 bg-orange-300" />
      <div style={{ height: `${100 - whitePercent}%` }} className="bg-black" />
      <div style={{ height: `${whitePercent}%` }} className="bg-white" />
    </div>
  );
}
