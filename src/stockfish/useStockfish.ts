"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSmoothEval } from "@/stockfish/useSmoothEval";
import { Chess } from "chess.js";
import { StockfishService } from "@/stockfish/StockfishService";
import { EnginePV, AnalyzeOptions, BestMove } from "@/types/Engine";

export function useStockfish(initialFen?: string) {
  const serviceRef = useRef<StockfishService | null>(null);
  const activeEpochRef = useRef(0);

  const [rawEval, setRawEval] = useState(0);
  const [bestMove, setBestMove] = useState<BestMove | null>(null);
  const [variations, setVariations] = useState<EnginePV[]>([]);

  const evalScore = useSmoothEval(rawEval, 0.06);

  useEffect(() => {
    const service = new StockfishService();
    service.init();

    service.setCallback((event) => {
      if (event.epoch === activeEpochRef.current) {
        if (event.type === "info") {
          setRawEval(event.score ?? 0);

          if (event.variations) {
            setVariations(event.variations);
          }

          if (event.bestMove && event.depth && event.depth >= 15) {
            setBestMove({
              move: event.bestMove,
              fen: event.fen ?? null,
              depth: event.depth,
            });
          }
        }

        if (event.type === "bestmove") {
          if (event.score !== undefined) {
            setRawEval(event.score);
          } else if (event.mate !== undefined) {
            setRawEval(event.mate > 0 ? 100 : -100);
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
      serviceRef.current.analyzeFen(initialFen);
      activeEpochRef.current = serviceRef.current.getEpoch();
    }
  }, [initialFen]);

  function analyze(fen: string, options: AnalyzeOptions = {}) {
    if (serviceRef.current && fen) {
      setBestMove(null);
      setVariations([]);

      serviceRef.current.analyzeFen(fen, options);

      activeEpochRef.current = serviceRef.current.getEpoch();
    }
  }

  const clearVariations = useCallback(() => {
    setVariations([]);
    setBestMove(null);
  }, []);

  return {
    evalScore,
    bestMove,
    variations,
    analyze,
    setBestMove,
    clearVariations,
  };
}
