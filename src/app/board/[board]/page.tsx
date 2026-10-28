"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useParams } from "next/navigation";
import { SmallBoardView } from "@/components/broadcast/smallboard/SmallBoardView";
import { obsClient } from "@/websocket/obsClient";
import type { ObsGameData } from "@/types/Obs";

export default function BoardStreamPage() {
  const params = useParams<{ board: string }>();
  const gameNumber = Number(params.board);
  const [data, setData] = useState<ObsGameData | null>(null);

  useEffect(() => {
    if (!Number.isInteger(gameNumber) || gameNumber < 1) {
      return;
    }
    return obsClient.subscribeGame(gameNumber, next => {
      flushSync(() => setData(next));
    });
  }, [gameNumber]);

  return <SmallBoardView data={data} />;
}
