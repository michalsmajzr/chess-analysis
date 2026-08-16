export function EvalBar({
  evalScore,
  width = 4,
}: {
  evalScore: number;
  width?: number;
}) {
  const clamped = Math.max(-5, Math.min(5, evalScore));
  const whitePercent = ((clamped + 5) / 10) * 100;
  const blackPercent = 100 - whitePercent;

  return (
    <div
      className="relative border border-stone-500 h-full overflow-hidden"
      style={{ width: `${width * 4}px` }}
    >
      <div className="absolute top-1/2 left-0 w-full h-1 bg-orange-300 -translate-y-1/2 z-10" />

      <div style={{ height: `${blackPercent}%` }} className="bg-black" />
      <div style={{ height: `${whitePercent}%` }} className="bg-white" />
    </div>
  );
}
