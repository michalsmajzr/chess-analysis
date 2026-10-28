"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { createBoard } from "@/utils/createBoard";
import "@/lib/cm-chessboard/assets/chessboard.css";
import { BoardMarker, EngineArrow } from "@/types/Engine";
import type { BoardDragData } from "@/types/Obs";

function isSingleMoveTransition(
  previousFen: string,
  nextFen: string,
  lastMove?: { from: string; to: string } | null,
) {
  if (!lastMove) {
    return false;
  }
  try {
    const chess = new Chess(previousFen);
    const move = chess.moves({ verbose: true }).find(candidate =>
      candidate.from === lastMove.from && candidate.to === lastMove.to,
    );
    if (!move) {
      return false;
    }
    chess.move(move);
    return chess.fen() === nextFen;
  } catch {
    return false;
  }
}

export default function ChessBoard({
  fen,
  lastMove,
  onMove,
  disableExtensions = false,
  className = "w-120",
  engineArrows = [],
  broadcastArrows,
  broadcastMarkers,
  onAnnotationsChange,
  dragPreview,
  onDragChange,
  animatePosition = false,
  animationKey,
  animationTrigger,
  annotationsResetKey,
}: {
  fen: string;
  lastMove?: { from: string; to: string } | null;
  onMove?: (from: string, to: string, promotion?: string) => void;
  disableExtensions?: boolean;
  className?: string;
  engineArrows?: EngineArrow[];
  broadcastArrows?: EngineArrow[];
  broadcastMarkers?: BoardMarker[];
  onAnnotationsChange?: (annotations: { arrows: EngineArrow[]; markers: BoardMarker[] }) => void;
  dragPreview?: BoardDragData;
  onDragChange?: (drag: BoardDragData) => void;
  animatePosition?: boolean;
  animationKey?: string;
  animationTrigger?: number;
  annotationsResetKey?: string;
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardInstance = useRef<ReturnType<typeof createBoard> | null>(null);
  const [boardGeneration, setBoardGeneration] = useState(0);
  const onMoveRef = useRef(onMove);
  const onAnnotationsChangeRef = useRef(onAnnotationsChange);
  const onDragChangeRef = useRef(onDragChange);
  const hasSyncedPositionRef = useRef(false);
  const displayedFenRef = useRef<string | null>(null);
  const animationKeyRef = useRef(animationKey);
  const annotationsResetKeyRef = useRef(annotationsResetKey);

  useEffect(() => {
    onMoveRef.current = onMove;
    onAnnotationsChangeRef.current = onAnnotationsChange;
    onDragChangeRef.current = onDragChange;
  }, [onMove, onAnnotationsChange, onDragChange]);

  useEffect(() => {
    const resetAfterBackground = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      // cm-chessboard queues requestAnimationFrame animations while a browser
      // source is hidden. Recreate it at the latest FEN instead of replaying
      // that stale queue when the source becomes visible again.
      hasSyncedPositionRef.current = false;
      displayedFenRef.current = null;
      setBoardGeneration(value => value + 1);
    };
    document.addEventListener("visibilitychange", resetAfterBackground);
    return () => document.removeEventListener("visibilitychange", resetAfterBackground);
  }, [animatePosition]);

  useLayoutEffect(() => {
    if (!boardRef.current) {
      return;
    }
    const board = createBoard(
      boardRef.current,
      fen,
      (from: string, to: string, promotion: string) => {
        onMoveRef.current?.(from, to, promotion);
      },
      disableExtensions,
      annotations => onAnnotationsChangeRef.current?.(annotations),
      drag => onDragChangeRef.current?.(drag),
    );
    boardInstance.current = board;

    return () => {
      board.destroy();
      boardInstance.current = null;
    };
  }, [boardGeneration]);

  useLayoutEffect(() => {
    if (!boardInstance.current) {
      return;
    }
    const sameAnimationContext = animationKeyRef.current === animationKey;
    const previousFen = displayedFenRef.current;
    boardInstance.current.setFen(
      fen,
      animatePosition &&
        hasSyncedPositionRef.current &&
        sameAnimationContext &&
        !!previousFen &&
        isSingleMoveTransition(previousFen, fen, lastMove),
    );
    hasSyncedPositionRef.current = true;
    displayedFenRef.current = fen;
    animationKeyRef.current = animationKey;
  }, [fen, lastMove, animatePosition, animationKey, boardGeneration]);

  useLayoutEffect(() => {
    if (!boardInstance.current) {
      return;
    }
    boardInstance.current.setLastMove(
      lastMove?.from ?? null,
      lastMove?.to ?? null,
    );
  }, [lastMove, boardGeneration]);

  useLayoutEffect(() => {
    if (!boardInstance.current) {
      return;
    }
    boardInstance.current.setEngineArrows(engineArrows);
  }, [engineArrows, boardGeneration]);

  useLayoutEffect(() => {
    if (!boardInstance.current) {
      return;
    }
    if (annotationsResetKeyRef.current === annotationsResetKey) {
      return;
    }
    boardInstance.current.clearAnnotations();
    annotationsResetKeyRef.current = annotationsResetKey;
  }, [annotationsResetKey, boardGeneration]);

  useLayoutEffect(() => {
    if (!boardInstance.current || broadcastArrows === undefined) {
      return;
    }
    boardInstance.current.setBroadcastAnnotations(
      broadcastArrows,
      broadcastMarkers ?? [],
    );
    if (dragPreview) {
      boardInstance.current.setDragPreview(dragPreview);
    }
  }, [broadcastArrows, broadcastMarkers, dragPreview, boardGeneration]);

  return <div ref={boardRef} className={className} />;
}
