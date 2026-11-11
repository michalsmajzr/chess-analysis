/** Turns the move notation returned by LiveChessCloud into SAN. */
export function extractLiveSan(move: string): string {
  return move
    .replace(/^\d+\.(?:\.\.)?\s*/, "")
    .replace(/\{.*?\}/g, "")
    .replace(/\$\d+/g, "")
    .replace(/[?!]+/g, "")
    .trim()
    .split(/\s+/)[0] ?? "";
}
