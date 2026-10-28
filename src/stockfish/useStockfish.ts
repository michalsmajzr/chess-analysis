"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSmoothEval } from "@/stockfish/useSmoothEval";
import { Chess } from "chess.js";
import { StockfishService } from "@/stockfish/StockfishService";
import { getEvalScore, getPrimaryVariation } from "@/stockfish/getEvalScore";
import { EnginePV, AnalyzeOptions, BestMove } from "@/types/Engine";

// Multi-PV at depth 24 is needlessly slow for a live analysis panel. Depth 18
// still gives a finished, stable line while keeping the UI responsive.
const DEFAULT_ANALYSIS_DEPTH = 18;

export function useStockfish(initialFen?: string) {
  const serviceRef = useRef<StockfishService | null>(null);
  const activeEpochRef = useRef(0);

  const [rawEval, setRawEval] = useState(0);
  const [bestMove, setBestMove] = useState<BestMove | null>(null);
  const [variations, setVariations] = useState<EnginePV[]>([]);
  const [variationsFen, setVariationsFen] = useState<string | null>(null);

  const evalScore = useSmoothEval(rawEval, 0.06);

  const resetVariations = useCallback(() => {
    setVariations([]);
    setVariationsFen(null);
  }, []);

  useEffect(() => {
    const service = new StockfishService();
    service.init();

    service.setCallback((event) => {
      if (event.epoch === activeEpochRef.current) {
        if (event.type === "info") {
          const primary = getPrimaryVariation(event);
          const score = primary ? getEvalScore({ ...primary, fen: event.fen }) : undefined;
          if (score !== undefined) {
            setRawEval(score);
          }

          if (event.variations) {
            // Ranks stay stable and StockfishService only advances a rank at
            // a new depth. React therefore updates the changed row in place.
            setVariations(event.variations);
            setVariationsFen(event.fen ?? null);
          }

          if (primary?.bestMove && primary.depth >= 15) {
            setBestMove({
              move: primary.bestMove,
              fen: event.fen ?? null,
              depth: primary.depth,
            });
          }
        }

        if (event.type === "bestmove") {
          const score = getEvalScore(event);
          if (score !== undefined) {
            setRawEval(score);
          } else if (!event.bestMove && event.fen) {
            const chess = new Chess(event.fen);

            if (chess.isStalemate()) {
              setRawEval(0);
            } else if (chess.isCheckmate()) {
              const isWhiteTurn = chess.turn() === "w";

              setRawEval(isWhiteTurn ? -100 : 100);
            }
          }

          setBestMove({
            move: event.bestMove ?? null,
            fen: event.fen ?? null,
            isFinal: true,
          });
        }
      }
    });

    serviceRef.current = service;

    return () => {
      service.destroy();
    };
  }, []);

  useEffect(() => {
    if (initialFen && serviceRef.current) {
      serviceRef.current.analyzeFen(initialFen, {
        depth: DEFAULT_ANALYSIS_DEPTH,
      });
      activeEpochRef.current = serviceRef.current.getEpoch();
    }
  }, [initialFen]);

  function analyze(fen: string, options: AnalyzeOptions = {}) {
    if (serviceRef.current && fen) {
      setBestMove(null);
      resetVariations();

      serviceRef.current.analyzeFen(fen, {
        ...options,
        depth: options.depth ?? DEFAULT_ANALYSIS_DEPTH,
      });

      activeEpochRef.current = serviceRef.current.getEpoch();
    }
  }

  const clearVariations = useCallback(() => {
    resetVariations();
    setBestMove(null);
  }, [resetVariations]);

  return {
    evalScore,
    rawEvalScore: rawEval,
    bestMove,
    variations,
    variationsFen,
    analyze,
    setBestMove,
    clearVariations,
  };
}
