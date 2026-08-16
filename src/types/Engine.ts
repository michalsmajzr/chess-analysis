export interface EngineMove {
  from: string;
  to: string;
  promotion?: string;
}

export interface EnginePV {
  rank: number;
  depth: number;
  score?: number;
  mate?: number;
  moves: string[];
  bestMove: EngineMove | null;
}

export interface AnalyzeOptions {
  multiPv?: number;
  depth?: number;
}

export interface EngineArrow {
  from: string;
  to: string;
}

export interface BestMove {
  move: EngineMove | null;
  fen: string | null;
  depth?: number;
  isFinal?: boolean;
}

export interface PendingAnalysis {
  fen: string;
  id: number;
  epoch: number;
  multiPv: number;
  depth: number;
}

export type EngineCallback = (event: {
  type: "bestmove" | "info";
  fen?: string;
  analysisId: number;
  score?: number;
  mate?: number;
  depth?: number;
  epoch: number;
  bestMove?: EngineMove | null;
  pv?: EnginePV;
  variations?: EnginePV[];
}) => void;
