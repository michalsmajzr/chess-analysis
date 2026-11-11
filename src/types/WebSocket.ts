/** Request sent to the remote evaluation WebSocket. */
export type EvaluationRequest = {
  type: "analyze";
  gameId: string;
  fen: string;
  requestId: string;
};

/** Response carrying a normalized Stockfish evaluation. */
export type EvaluationResponse = {
  type: "evaluation";
  gameId: string;
  fen: string;
  requestId: string;
  score: number;
  mate?: number;
  depth?: number;
};

/** Request to stop observing a remote evaluation. */
export type EvaluationUnsubscribe = {
  type: "unsubscribe";
  gameId: string;
};
