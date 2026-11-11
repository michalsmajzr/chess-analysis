import type { Game } from "@/types/Game";
import { GameTree } from "@/features/analysis/tree/GameTree";
import { createGameTreeFromLiveGame } from "@/features/analysis/tree/CreateGameTree";

/** Synchronizes a live game with an existing analysis tree, optionally following the latest move. */
export function syncLiveGame(
  game: Game,
  index: number,
  existingTree: GameTree | undefined,
  followLatest: boolean,
) {
  if (!existingTree) {
    return {
      tree: createGameTreeFromLiveGame(game, index, (rawMove, fen, error) => {
        console.warn("Invalid game move:", { rawMove, fen, error });
      }),
      changed: true,
    };
  }

  const sync = existingTree.syncLiveMoves(game.moves ?? []);
  if (sync.invalidMoves.length) {
    console.warn("Ignoring invalid live moves until the API corrects them:", sync.invalidMoves);
  }
  if (followLatest) existingTree.select(sync.lastNode);

  return { tree: existingTree, changed: sync.changed };
}
