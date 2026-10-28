"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { LiveChessgroundView } from "@/components/broadcast/livechessground/LiveChessgroundView";
import { obsClient } from "@/websocket/obsClient";
import type { ObsBoardData } from "@/types/Obs";

export default function LiveChessgroundPage() {
  const [data, setData] = useState<ObsBoardData | null>(null);

  useEffect(
    () => obsClient.subscribeBoard(next => {
      // Render the incoming OBS state before the next browser paint.
      flushSync(() => {
        setData(next);
      });
    }),
    [],
  );

  return <LiveChessgroundView data={data} />;
}
