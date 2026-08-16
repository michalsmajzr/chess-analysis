"use client";
import { useEffect, useRef } from "react";
import { createBoard } from "@/utils/createBoard";
import "@/lib/cm-chessboard/assets/chessboard.css";
import { EngineArrow } from "@/types/Engine";

export default function ChessBoard({
  fen,
  lastMove,
  onMove,
  disableExtensions = false,
  className = "w-120",
  engineArrows = [],
}: {
  fen: string;
  lastMove?: { from: string; to: string } | null;
  onMove?: (from: string, to: string, promotion?: string) => void;
  disableExtensions?: boolean;
  className?: string;
  engineArrows?: EngineArrow[];
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardInstance = useRef<ReturnType<typeof createBoard> | null>(null);
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    if (!boardRef.current) return;
    const board = createBoard(
      boardRef.current,
      fen,
      (from: string, to: string, promotion: string) => {
        onMoveRef.current?.(from, to, promotion);
      },
      disableExtensions,
    );
    boardInstance.current = board;

    return () => {
      board.destroy();
      boardInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!boardInstance.current) return;
    const frame = requestAnimationFrame(() => {
      boardInstance.current?.setFen(fen);
    });

    return () => cancelAnimationFrame(frame);
  }, [fen]);

  useEffect(() => {
    if (!boardInstance.current) return;
    const frame = requestAnimationFrame(() => {
      boardInstance.current?.setLastMove(
        lastMove?.from ?? null,
        lastMove?.to ?? null,
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [lastMove]);

  useEffect(() => {
    if (!boardInstance.current) return;
    boardInstance.current.setEngineArrows(engineArrows);
  }, [engineArrows]);

  return <div ref={boardRef} className={className} />;
}
