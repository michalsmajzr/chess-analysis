"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { SmallBoardView } from "@/components/broadcast/smallboard/SmallBoardView";
import { obsClient } from "@/websocket/obsClient";
import type { ObsGameData } from "@/types/Obs";

export function HostGame({ gameNumber }: { gameNumber: number }) {
  const [data, setData] = useState<ObsGameData | null>(null);

  useEffect(
    () => obsClient.subscribeGame(gameNumber, next => {
      flushSync(() => setData(next));
    }),
    [gameNumber],
  );

  if (!data) {
    return null;
  }

  return (
    <div className="shrink-0">
      <SmallBoardView data={data} />
    </div>
  );
}
