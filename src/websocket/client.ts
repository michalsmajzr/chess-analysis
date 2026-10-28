import type { EngineEvaluation } from "../types/Engine";
import { v4 as uuidv4 } from "uuid";
import type {
  EvaluationRequest,
  EvaluationResponse,
  EvaluationUnsubscribe,
} from "../types/WebSocket";

type Entry = {
  request: EvaluationRequest;
  evaluation?: EngineEvaluation;
  listeners: Set<() => void>;
};

function isEvaluation(value: unknown): value is EvaluationResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as Partial<EvaluationResponse>;
  return (
    message.type === "evaluation" &&
    typeof message.gameId === "string" &&
    typeof message.fen === "string" &&
    typeof message.requestId === "string" &&
    typeof message.score === "number" &&
    Number.isFinite(message.score) &&
    (message.mate === undefined ||
      (typeof message.mate === "number" && Number.isFinite(message.mate))) &&
    (message.depth === undefined ||
      (typeof message.depth === "number" && Number.isFinite(message.depth)))
  );
}

/** One connection for all boards. Inactive entries retain their last score. */
export class EvaluationClient {
  private entries = new Map<string, Entry>();
  private socket: WebSocket | null = null;
  private retry: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly getUrl: () => string) {}

  getEvaluation(gameId: string) {
    return this.entries.get(gameId)?.evaluation;
  }

  subscribe(gameId: string, fen: string, listener: () => void) {
    let entry = this.entries.get(gameId);
    const changed = !entry || entry.request.fen !== fen;
    const inactive = !entry?.listeners.size;
    if (!entry) {
      entry = { request: this.request(gameId, fen), listeners: new Set() };
      this.entries.set(gameId, entry);
    } else if (changed) {
      // Keep the last evaluation until a response for this request arrives.
      entry.request = this.request(gameId, fen);
    }
    entry.listeners.add(listener);
    if (changed || inactive) {
      this.send(entry.request);
    }
    this.connect();

    return () => {
      entry.listeners.delete(listener);
      if (!entry.listeners.size) {
        this.send({ type: "unsubscribe", gameId });
      }
      // Bound retained scores without dropping mounted boards.
      for (const [id, candidate] of this.entries) {
        if (this.entries.size <= 1000) {
          break;
        }
        if (!candidate.listeners.size) {
          this.entries.delete(id);
        }
      }
      if (!this.hasSubscribers()) {
        clearTimeout(this.retry);
        this.retry = undefined;
        const previous = this.socket;
        // React may immediately subscribe again during its development cleanup.
        // Keep an opening socket reusable; closing CONNECTING logs a browser error.
        if (previous?.readyState === WebSocket.OPEN) {
          this.socket = null;
          previous.close();
        }
      }
    };
  }

  private request(gameId: string, fen: string): EvaluationRequest {
    return { type: "analyze", gameId, fen, requestId: uuidv4() };
  }

  private hasSubscribers() {
    return [...this.entries.values()].some((entry) => entry.listeners.size > 0);
  }

  private send(request: EvaluationRequest | EvaluationUnsubscribe) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(request));
    }
  }

  private scheduleReconnect() {
    if (!this.hasSubscribers() || this.retry) {
      return;
    }
    this.retry = setTimeout(() => {
      this.retry = undefined;
      this.connect();
    }, 3000);
  }

  private connect() {
    if (this.socket || this.retry || !this.hasSubscribers()) {
      return;
    }
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.getUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = ws;
    ws.onopen = () => {
      if (this.socket !== ws) {
        return;
      }
      if (!this.hasSubscribers()) {
        this.socket = null;
        ws.close();
        return;
      }
      for (const entry of this.entries.values()) {
        if (entry.listeners.size) {
          this.send(entry.request);
        }
      }
    };
    ws.onmessage = (event) => {
      if (this.socket !== ws) {
        return;
      }
      try {
        const message: unknown = JSON.parse(event.data);
        if (!isEvaluation(message)) {
          return;
        }
        const entry = this.entries.get(message.gameId);
        if (
          !entry ||
          message.requestId !== entry.request.requestId ||
          message.fen !== entry.request.fen
        ) {
          return;
        }
        entry.evaluation = {
          score: message.score,
          mate: message.mate,
          depth: message.depth,
        };
        entry.listeners.forEach((listener) => listener());
      } catch {
        /* Ignore malformed messages and retain the last evaluation. */
      }
    };
    // Failed handshakes emit close themselves. Do not close a CONNECTING socket.
    ws.onerror = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
    ws.onclose = () => {
      if (this.socket !== ws) {
        return;
      }
      this.socket = null;
      this.scheduleReconnect();
    };
  }
}

export const evaluationClient = new EvaluationClient(
  () =>
    process.env.NEXT_PUBLIC_EVAL_WS_URL ||
    `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/eval`,
);
