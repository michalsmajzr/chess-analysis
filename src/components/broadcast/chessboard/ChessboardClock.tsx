"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "@/types/Game";
import { formatClockTime, getLiveClock, isFinishedGame } from "@/utils/liveClock";

export function ChessboardClock({
  game,
  color,
}: {
  game?: Game;
  color: "white" | "black";
}) {
  const previousRunRef = useRef<boolean | null | undefined>(undefined);
  const baseRef = useRef<{ white: number; black: number; timestamp: number } | null>(null);
  const [displayTime, setDisplayTime] = useState<number | null>(null);

  useEffect(() => {
    if (!game) {
      return;
    }

    const updateClock = () => {
      const base = getLiveClock(game);
      const run = game.clock?.run;
      const isPaused = !game.clock || run === null || run === undefined;

      if (
        !baseRef.current ||
        base.white !== baseRef.current.white ||
        base.black !== baseRef.current.black ||
        previousRunRef.current !== run
      ) {
        baseRef.current = { ...base, timestamp: Date.now() };
      }

      if (isFinishedGame(game) || isPaused) {
        setDisplayTime(color === "white" ? baseRef.current.white : baseRef.current.black);
        previousRunRef.current = run;
        return;
      }

      const elapsed = Math.floor((Date.now() - baseRef.current.timestamp) / 1000);
      const isWhiteRunning = run === true;
      setDisplayTime(
        color === "white"
          ? (isWhiteRunning ? Math.max(0, baseRef.current.white - elapsed) : baseRef.current.white)
          : (!isWhiteRunning ? Math.max(0, baseRef.current.black - elapsed) : baseRef.current.black),
      );
      previousRunRef.current = run;
    };

    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, [game, color]);

  return (
    <div
      className={`flex h-full min-w-[136px] items-center justify-center px-3 text-center font-mono text-[24px] leading-none font-medium tabular-nums ${
        color === "black" ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {game ? formatClockTime(displayTime) : "--:--:--"}
    </div>
  );
}
