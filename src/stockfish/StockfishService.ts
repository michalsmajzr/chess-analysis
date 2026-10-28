import { Chess } from "chess.js";
import {
  EngineMove,
  EnginePV,
  AnalyzeOptions,
  PendingAnalysis,
  EngineCallback,
} from "@/types/Engine";

// Depth 8 is quick enough to populate the panel, while avoiding the very
// noisy opening guesses from the first few Stockfish iterations.
const FIRST_PV_DEPTH = 8;

export class StockfishService {
  private worker: Worker | null = null;
  private callback: EngineCallback | null = null;

  private activeFen: string | null = null;

  private currentAnalysisId = 0;
  private activeAnalysisId = 0;

  private currentEpoch = 0;
  private activeEpoch = 0;

  private isThinking = false;
  private isReady = false;

  private pendingAnalysis: PendingAnalysis | null = null;

  private variations = new Map<number, EnginePV>();
  private bestDepthByPV = new Map<number, number>();

  private lastScore: number | undefined;
  private lastMate: number | undefined;

  getEpoch(): number {
    return this.currentEpoch;
  }

  init() {
    if (typeof window !== "undefined" && !this.worker) {
      const worker = new Worker("/stockfish/stockfish-18-lite-single.js");

      this.worker = worker;

      worker.onmessage = (e) => {
        const line = e.data;

        if (typeof line === "string") {
          if (line === "readyok") {
            this.isReady = true;

            if (this.pendingAnalysis && !this.isThinking) {
              const next = this.pendingAnalysis;
              this.pendingAnalysis = null;

              this.executeAnalysis(
                next.fen,
                next.id,
                next.epoch,
                next.multiPv,
                next.depth,
              );
            }
          } else if (line.startsWith("info")) {
            if (this.activeFen) {
              this.handleInfo(line, this.activeFen, this.activeAnalysisId);
            }
          } else if (line.startsWith("bestmove")) {
            this.handleBestMove(line);
          }
        }
      };

      worker.onerror = (error) => {
        console.error("Stockfish worker error:", error);

        this.isThinking = false;
        this.isReady = false;
      };

      worker.postMessage("uci");
      worker.postMessage("isready");
    }
  }

  private handleBestMove(line: string) {
    const match = line.match(/bestmove\s([a-h][1-8])([a-h][1-8])([qrbn]?)/);

    const fen = this.activeFen;
    const analysisId = this.activeAnalysisId;
    const epoch = this.activeEpoch;

    const bestMove = match
      ? {
          from: match[1],
          to: match[2],
          promotion: match[3] || undefined,
        }
      : null;

    if (fen) {
      this.callback?.({
        type: "bestmove",
        fen,
        analysisId,
        epoch,
        bestMove,
        score: this.lastScore,
        mate: this.lastMate,
      });
    }

    this.isThinking = false;

    if (this.pendingAnalysis) {
      const next = this.pendingAnalysis;
      this.pendingAnalysis = null;

      this.executeAnalysis(
        next.fen,
        next.id,
        next.epoch,
        next.multiPv,
        next.depth,
      );
    }
  }

  private handleInfo(line: string, msgFen: string, msgId: number) {
    if (/\b(?:lowerbound|upperbound)\b/.test(line)) {
      return;
    }
    const depthMatch = line.match(/depth (\d+)/);

    if (depthMatch) {
      const depth = Number(depthMatch[1]);

      if (depth >= FIRST_PV_DEPTH) {
        const multiPvMatch = line.match(/multipv (\d+)/);
        const rank = multiPvMatch ? Number(multiPvMatch[1]) : 1;
        const previousDepth = this.bestDepthByPV.get(rank) ?? 0;

        // One update per rank and depth keeps the Multi-PV display readable.
        if (depth > previousDepth) {
          this.bestDepthByPV.set(rank, depth);
          const pvMatch = line.match(/\spv\s+(.+)$/);

          if (pvMatch) {
            const moves = pvMatch[1]
              .trim()
              .split(/\s+/)
              .filter((move) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move));

            if (moves.length) {
              const firstMove = moves[0];
              const bestMove: EngineMove = {
                from: firstMove.slice(0, 2),
                to: firstMove.slice(2, 4),
                promotion:
                  firstMove.length > 4 ? firstMove.slice(4, 5) : undefined,
              };
              const chess = new Chess(msgFen);
              const isWhiteTurn = chess.turn() === "w";
              let score: number | undefined;
              let mate: number | undefined;
              const cpMatch = line.match(/score cp (-?\d+)/);

              if (cpMatch) {
                let cp = Number(cpMatch[1]);
                if (!isWhiteTurn) {
                  cp = -cp;
                }

                score = cp / 100;
              }

              const mateMatch = line.match(/score mate (-?\d+)/);
              if (mateMatch) {
                const mateIn = Number(mateMatch[1]);
                mate = isWhiteTurn ? mateIn : -mateIn;
                score = undefined;
              }

              if (rank === 1 && (score !== undefined || mate !== undefined)) {
                this.lastScore = score;
                this.lastMate = mate;
              }

              const pv: EnginePV = {
                rank,
                depth,
                score,
                mate,
                moves,
                bestMove,
              };

              this.variations.set(rank, pv);
              const variations = Array.from(this.variations.values()).sort(
                (a, b) => a.rank - b.rank,
              );

              this.callback?.({
                type: "info",
                fen: msgFen,
                analysisId: msgId,
                epoch: this.activeEpoch,
                depth,
                score,
                mate,
                bestMove,
                pv,
                variations,
              });
            }
          }
        }
      }
    }
  }

  setCallback(cb: EngineCallback) {
    this.callback = cb;
  }

  analyzeFen(fen: string, options: AnalyzeOptions = {}) {
    if (this.worker && fen) {
      const multiPv = Math.max(1, Math.min(options.multiPv ?? 1, 3));
      const depth = options.depth ?? 24;
      this.currentAnalysisId++;
      this.currentEpoch++;
      const id = this.currentAnalysisId;
      const epoch = this.currentEpoch;
      const request: PendingAnalysis = {
        fen,
        id,
        epoch,
        multiPv,
        depth,
      };

      if (this.isThinking) {
        this.pendingAnalysis = request;
        this.worker.postMessage("stop");
      } else if (!this.isReady) {
        this.pendingAnalysis = request;
        this.worker.postMessage("isready");
      } else {
        this.executeAnalysis(fen, id, epoch, multiPv, depth);
      }
    }
  }

  private executeAnalysis(
    fen: string,
    id: number,
    epoch: number,
    multiPv: number,
    depth: number,
  ) {
    if (this.worker) {
      if (this.isThinking) {
        this.pendingAnalysis = {
          fen,
          id,
          epoch,
          multiPv,
          depth,
        };

        this.worker.postMessage("stop");
      } else {
        this.isThinking = true;

        this.variations.clear();
        this.bestDepthByPV.clear();

        this.lastScore = undefined;
        this.lastMate = undefined;

        this.activeFen = fen;
        this.activeAnalysisId = id;
        this.activeEpoch = epoch;

        this.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(`go depth ${depth}`);
      }
    }
  }

  destroy() {
    this.worker?.terminate();

    this.worker = null;
    this.activeFen = null;
    this.pendingAnalysis = null;
    this.isThinking = false;
    this.isReady = false;

    this.variations.clear();
    this.bestDepthByPV.clear();
  }
}
