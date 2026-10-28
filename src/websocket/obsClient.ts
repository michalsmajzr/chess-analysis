import type { BoardDragData, ObsBoardData, ObsGameData, ObsServerMessage } from "@/types/Obs";

type Listener<T> = (data: T) => void;

export class ObsClient {
  private socket: WebSocket | null = null;
  private pending = new Map<string, string>();
  private published = new Map<string, string>();
  private retry: ReturnType<typeof setTimeout> | undefined;
  private boardListeners = new Set<Listener<ObsBoardData>>();
  private dragListeners = new Set<Listener<BoardDragData>>();
  private gameCountListeners = new Set<Listener<number>>();
  private gameListeners = new Map<number, Set<Listener<ObsGameData | null>>>();
  private publisherListeners = new Set<Listener<{ active: boolean; message?: string }>>();
  private publisherToken: string | null = null;
  private publisherRequested = false;
  private publisherAuthorized = false;

  private notifyPublisher(active: boolean, message?: string) {
    this.publisherListeners.forEach(listener => listener({ active, message }));
  }

  private needsSocket() {
    return this.publisherRequested || this.boardListeners.size > 0 || this.dragListeners.size > 0 ||
      this.gameCountListeners.size > 0 || [...this.gameListeners.values()].some(listeners => listeners.size > 0);
  }

  private connect() {
    if (this.socket || typeof window === "undefined") {
      return;
    }
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/obs`);
    this.socket = socket;
    socket.onopen = () => {
      if (this.publisherRequested && this.publisherToken) {
        socket.send(JSON.stringify({ type: "publisher-auth", token: this.publisherToken }));
      }
      for (const message of this.pending.values()) {socket.send(message);}
      this.pending.clear();
      if (this.boardListeners.size) {
        socket.send(JSON.stringify({ type: "subscribe-board" }));
      }
      if (this.gameCountListeners.size) {
        socket.send(JSON.stringify({ type: "subscribe-game-count" }));
      }
      for (const [game, listeners] of this.gameListeners) {
        if (listeners.size) {
          socket.send(JSON.stringify({ type: "subscribe-game", game }));
        }
      }
    };
    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data) as ObsServerMessage;
        if (message.type === "publisher-authenticated") {
          this.publisherAuthorized = true;
          this.notifyPublisher(true);
          for (const published of this.published.values()) {socket.send(published);}
        }
        if (message.type === "publisher-revoked") {
          this.publisherAuthorized = false;
          this.publisherRequested = false;
          this.notifyPublisher(false, "Vysílání převzal jiný klient.");
        }
        if (message.type === "board") {
          this.boardListeners.forEach(listener => listener(message.data));
        }
        if (message.type === "board-drag") {
          this.dragListeners.forEach(listener => listener(message.data));
        }
        if (message.type === "game-count") {
          this.gameCountListeners.forEach(listener => listener(message.count));
        }
        if (message.type === "game") {
          this.gameListeners.get(message.game)?.forEach(listener => listener(message.data));
        }
        if (message.type === "game-removed") {
          this.gameListeners.get(message.game)?.forEach(listener => listener(null));
        }
      } catch {}
    };
    socket.onclose = event => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = null;
      this.publisherAuthorized = false;
      if (event?.code === 1008 && this.publisherRequested) {
        this.publisherRequested = false;
        this.notifyPublisher(false, "Token nebyl serverem ověřen.");
      }
      if (this.needsSocket() && !this.retry) {
        this.retry = setTimeout(() => { this.retry = undefined; this.connect(); }, 100);
      }
    };
  }

  private send(message: unknown, key: string, retain = false) {
    const serialized = JSON.stringify(message);
    const type = typeof message === "object" && message !== null && "type" in message
      ? (message as { type?: unknown }).type
      : undefined;
    const requiresPublisher = typeof type === "string" &&
      (type.startsWith("publish-") || type === "switch-camera");
    if (retain) {
      this.published.set(key, serialized);
    }
    // A standby client does not even open the broadcast connection merely
    // because its local board changed. It can still connect as a viewer.
    if (requiresPublisher && !this.publisherRequested) {
      return;
    }
    this.connect();
    if ((!requiresPublisher || this.publisherAuthorized) && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(serialized);
    } else if (!retain && !(typeof type === "string" && type.startsWith("subscribe-"))) {
      this.pending.set(key, serialized);
    }
  }

  activatePublisher(token: string) {
    const normalized = token.trim().toUpperCase();
    if (!normalized) {
      this.notifyPublisher(false, "Zadejte vysílací token.");
      return;
    }
    this.publisherToken = normalized;
    this.publisherRequested = true;
    this.publisherAuthorized = false;
    this.connect();
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "publisher-auth", token: this.publisherToken }));
    }
  }

  subscribePublisherStatus(listener: Listener<{ active: boolean; message?: string }>) {
    this.publisherListeners.add(listener);
    listener({ active: this.publisherAuthorized });
    return () => {
      this.publisherListeners.delete(listener);
    };
  }

  publishGame(game: number, data: ObsGameData) {
    this.send({ type: "publish-game", game, data }, `publish-game:${game}`, true);
  }
  publishGameCount(count: number) {
    for (const key of [...this.published.keys()]) {
      const match = /^publish-game:(\d+)$/.exec(key);
      if (match && Number(match[1]) > count) {
        this.published.delete(key);
      }
    }
    this.send({ type: "publish-game-count", count }, "publish-game-count", true);
  }
  publishBoard(data: ObsBoardData) {
    this.send({ type: "publish-board", data }, "publish-board", true);
  }
  publishBoardDrag(data: BoardDragData) {
    this.send({ type: "publish-board-drag", data }, "publish-board-drag", true);
  }
  switchCamera(board: number) {
    this.send({ type: "switch-camera", board }, "switch-camera");
  }

  subscribeGameCount(listener: Listener<number>) {
    this.gameCountListeners.add(listener);
    this.send({ type: "subscribe-game-count" }, "subscribe-game-count");
    return () => {
      this.gameCountListeners.delete(listener);
    };
  }

  subscribeGame(game: number, listener: Listener<ObsGameData | null>) {
    const listeners = this.gameListeners.get(game) ?? new Set();
    listeners.add(listener);
    this.gameListeners.set(game, listeners);
    this.send({ type: "subscribe-game", game }, `subscribe-game:${game}`);
    return () => {
      listeners.delete(listener);
    };
  }

  subscribeBoard(listener: Listener<ObsBoardData>, dragListener?: Listener<BoardDragData>) {
    this.boardListeners.add(listener);
    if (dragListener) {
      this.dragListeners.add(dragListener);
    }
    this.send({ type: "subscribe-board" }, "subscribe-board");
    return () => {
      this.boardListeners.delete(listener);
      if (dragListener) {
        this.dragListeners.delete(dragListener);
      }
    };
  }
}

export const obsClient = new ObsClient();
