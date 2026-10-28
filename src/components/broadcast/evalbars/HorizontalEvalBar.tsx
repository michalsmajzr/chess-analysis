export function HorizontalEvalBar({ evalScore }: { evalScore: number }) {
  const clamped = Math.max(-5, Math.min(5, evalScore));
  const whitePercent = ((clamped + 5) / 10) * 100;

  return (
    <div className="relative h-7 w-full overflow-hidden border border-stone-500">
      <div className="absolute inset-y-0 left-1/2 z-10 w-[2px] -translate-x-1/2 bg-orange-300" />
      <div className="flex h-full">
        <div className="h-full bg-white" style={{ width: `${whitePercent}%` }} />
        <div className="h-full bg-black" style={{ width: `${100 - whitePercent}%` }} />
      </div>
    </div>
  );
}
