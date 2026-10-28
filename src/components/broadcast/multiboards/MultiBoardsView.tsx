"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { SmallBoardView } from "@/components/broadcast/smallboard/SmallBoardView";
import type { ObsGameData } from "@/types/Obs";
import { obsClient } from "@/websocket/obsClient";

function MultiBoard({
  gameNumber,
  showEvalBar,
  onAvailability,
}: {
  gameNumber: number;
  showEvalBar: boolean;
  onAvailability: (gameNumber: number, available: boolean) => void;
}) {
  const [data, setData] = useState<ObsGameData | null>(null);

  useEffect(
    () => obsClient.subscribeGame(gameNumber, next => {
      flushSync(() => setData(next));
      onAvailability(gameNumber, next !== null);
    }),
    [gameNumber, onAvailability],
  );

  if (!data) {
    return null;
  }

  return (
    <div className="min-w-0 w-full self-center justify-self-center sm:w-[var(--multiboard-width)]">
      <SmallBoardView data={data} showEvalBar={showEvalBar} fluid compactHeaders />
    </div>
  );
}

/** Broadcast wall with up to five boards per row and a live server count. */
export function MultiBoardsView({ showEvalBar }: { showEvalBar: boolean }) {
  const [gameCount, setGameCount] = useState(0);
  const [availableGames, setAvailableGames] = useState<Set<number>>(new Set());
  const [isFourK, setIsFourK] = useState(false);

  useEffect(() => obsClient.subscribeGameCount(count => {
    setGameCount(count);
    // The final published board is the private import/analysis board. It is
    // useful on /board/[id] but must never appear on the public multiboard wall.
    setAvailableGames(previous => new Set([...previous].filter(game => game < count)));
  }), []);

  useEffect(() => {
    // A 4K display can report a roughly Full-HD CSS width when Windows uses
    // 200% scaling, therefore recognise either a wide canvas or its DPI.
    const query = window.matchMedia("(min-width: 3000px), (min-width: 1500px) and (min-resolution: 1.5dppx)");
    const update = () => setIsFourK(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const onAvailability = useCallback((gameNumber: number, available: boolean) => {
    setAvailableGames(previous => {
      const next = new Set(previous);
      if (available) next.add(gameNumber);
      else next.delete(gameNumber);
      return next;
    });
  }, []);

  // Keep sparse broadcasts visually balanced: 4 becomes 2 + 2, 5 becomes
  // 3 + 2, and larger sets keep no more than five boards per row.
  const visibleGameCount = Math.max(0, gameCount - 1);
  const availableCount = [...availableGames].filter(game => game <= visibleGameCount).length;
  const rows = availableCount === 0
    ? 0
    : Math.max(1, Math.ceil(availableCount / 5), availableCount >= 4 ? 2 : 1);
  // From the eleventh board onward keep five columns so the first ten remain
  // visible in the two top rows; extra boards continue below by scrolling.
  const columns = availableCount > 10 ? 5 : rows ? Math.ceil(availableCount / rows) : 1;
  const desktopColumns = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
    5: "sm:grid-cols-5",
  }[columns] ?? "sm:grid-cols-5";
  // Tablets and PCs always fit the first ten boards in two rows. Additional
  // rows deliberately scroll instead of shrinking the whole wall to unreadable
  // tiles or clipping the first row on a 4K source.
  const fittingRows = Math.min(rows, 2);
  const padding = isFourK ? 40 : 24;
  const horizontalGap = isFourK ? 28 : 12;
  const verticalGap = isFourK ? 32 : 16;
  const tileWidth = fittingRows
    ? `min(calc((100vw - ${padding}px - ${(columns - 1) * horizontalGap}px) / ${columns}), calc((100vh - ${padding}px - ${(fittingRows - 1) * verticalGap}px - ${fittingRows * 56}px) / ${fittingRows} + 16px))`
    : "0px";
  const gridStyle = { "--multiboard-width": tileWidth } as CSSProperties;
  const verticalAlignment = rows > 2 ? "sm:content-start" : "sm:content-center";

  return (
    <main
      className={`multiboard-wall grid h-screen w-screen grid-cols-1 content-start overflow-y-auto bg-zinc-50 dark:bg-black ${desktopColumns} ${verticalAlignment}`}
      style={gridStyle}
    >
      {Array.from({ length: visibleGameCount }, (_, index) => (
        <MultiBoard
          key={index + 1}
          gameNumber={index + 1}
          showEvalBar={showEvalBar}
          onAvailability={onAvailability}
        />
      ))}
    </main>
  );
}
