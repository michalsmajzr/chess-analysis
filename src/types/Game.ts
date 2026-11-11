export interface Tournament {
  id: string;
  name: string;
  rounds: Round[];
}

export interface Round {
  id: string;
  name: string;
  games: Game[];
}

export type Result = "BLACKWIN" | "WHITEWIN" | "DRAW" | "*" | undefined;

export interface Pairing {
  white: Player;
  black: Player;
}

export interface Game {
  id: string;
  white: Player;
  black: Player;
  result?: Result;
  headers: Record<string, string>;
  moves: string[];
  clock?: {
    white?: number;
    black?: number;
    /** LiveChessCloud server timestamp in milliseconds. */
    time?: number;
    timestamp?: number;
    /** `true` means White's clock runs; `false` means Black's. */
    run?: boolean | null;
  };
}

export interface Player {
  fname: string;
  lname: string;
  fideid?: string | null;
  title?: string | null;
  elo?: number | null;
  icon?: string | null;
}

export interface RoundInfo {
  pairings: Pairing[];
}

export interface RoundData {
  tournamentIndex: number;
  tournamentId: string;
  tournamentName: string;
  round: number;
  info: RoundInfo;
  games: Game[];
  cacheKey?: string;
}
