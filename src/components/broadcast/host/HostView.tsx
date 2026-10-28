import { HostChessboard } from "./HostChessboard";
import { HostGame } from "./HostGame";

const GAME_NUMBERS = Array.from({ length: 10 }, (_, index) => index + 1);

export function HostView() {
  return (
    <div className="flex h-screen min-h-0 w-full gap-4 overflow-hidden bg-zinc-950 p-4">
      <aside className="w-[360px] shrink-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
        <div className="flex w-[336px] flex-col gap-4">
          {GAME_NUMBERS.map(gameNumber => (
            <HostGame key={gameNumber} gameNumber={gameNumber} />
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 items-start justify-center overflow-auto">
        <HostChessboard />
      </main>
    </div>
  );
}
