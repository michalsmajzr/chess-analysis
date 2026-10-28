"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ChessboardView } from "@/components/broadcast/chessboard/ChessboardView";
import { obsClient } from "@/websocket/obsClient";
import type { BoardDragData, ObsBoardData } from "@/types/Obs";

export function HostChessboard() {
  const [data, setData] = useState<ObsBoardData | null>(null);
  const [drag, setDrag] = useState<BoardDragData | undefined>();

  useEffect(
    () => obsClient.subscribeBoard(
      next => flushSync(() => setData(next)),
      next => flushSync(() => setDrag(previous => ({
        ...previous,
        ...next,
        targets: next.targets ?? (next.active ? previous?.targets : undefined),
      }))),
    ),
    [],
  );

  return <ChessboardView data={data} drag={drag} />;
}
