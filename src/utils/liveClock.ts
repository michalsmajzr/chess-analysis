import type { Game } from "@/types/Game";

export function isFinishedGame(game?: Game) {
  const result = String(game?.result ?? "");
  return result === "DRAW" || result === "WHITEWIN" || result === "BLACKWIN";
}

export function getLiveClock(game: Game, now = Date.now()) {
  let white = 3600;
  let black = 3600;
  let lastServerTime = now;

  if (game.clock) {
    white = game.clock.white ?? white;
    black = game.clock.black ?? black;
    lastServerTime = game.clock.time || now;
  } else {
    game.moves.forEach((move, index) => {
      const seconds = Number(move.trim().split(/\s+/)[1]?.split("+")[0]);
      if (!Number.isFinite(seconds)) {
        return;
      }
      if (index % 2 === 0) {
        white = seconds;
      } else {
        black = seconds;
      }
    });
  }

  // LiveChessCloud can leave `clock.run` set after it has already supplied a
  // result. A result is authoritative: keep the final server clock frozen.
  if (!isFinishedGame(game)) {
    const lag = Math.max(0, Math.floor((now - lastServerTime) / 1000));
    if (game.clock?.run === true) {
      white = Math.max(0, white - lag);
    } else if (game.clock?.run === false) {
      black = Math.max(0, black - lag);
    }
  }

  return { white, black };
}

export function formatClockTime(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) {
    return "--:--:--";
  }
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const rest = wholeSeconds % 60;
  return [hours, minutes, rest].map(value => String(value).padStart(2, "0")).join(":");
}
