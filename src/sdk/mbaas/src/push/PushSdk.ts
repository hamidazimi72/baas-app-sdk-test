import { CoreSdk } from "../core/CoreSdk.js";

export interface PushPayload {
  type: "PUSH";
  pushId?: string;
  appId?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  priority?: "LOW" | "NORMAL" | "HIGH";
  ttlSeconds?: number;
  expiresAt?: number;
  timestamp?: number;
  image?: string;
}

interface WebSocketMessage {
  type: "HELLO" | "AUTH" | "CONNECTED" | "PUSH" | "AUTH_ERROR" | "PING" | "PONG";
  [key: string]: unknown;
}

interface CoordinationMessage {
  type: "CANDIDATE" | "LEADER" | "HEARTBEAT" | "RELEASE";
  tabId?: string;
  leaderId?: string;
}

export type PushSdkErrorListener = (error: Error) => void;

export class PushSdk {
  private static readonly reconnectBaseDelayMs = 1_000;
  private static readonly reconnectMaxDelayMs = 30_000;
  private static readonly maxReconnectAttempts = 10;
  private static readonly authTimeoutMs = 10_000;
  private static readonly reconnectableCloseCodes = new Set([1006, 4008]);

  private readonly core: CoreSdk;
  private socket: WebSocket | null = null;
  private authenticatedSocket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private authTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private reconnectEnabled = false;
  private networkListenersAttached = false;
  private isOffline = false;
  private connectionGeneration = 0;
  private readonly authSentSockets = new WeakSet<WebSocket>();
  private readonly errorListeners = new Set<PushSdkErrorListener>();
  private readonly tabId = PushSdk.createTabId();
  private readonly coordinationChannelName: string;
  private coordinationChannel: BroadcastChannel | null = null;
  private coordinationStarted = false;
  private isLeader = false;
  private leaderId: string | null = null;
  private leaderLastSeenAt = 0;
  private readonly candidateIds = new Set<string>();
  private electionTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private leaderWatchdogTimer: ReturnType<typeof setInterval> | null = null;

  private readonly handleOffline = (): void => {
    this.isOffline = true;
    this.clearReconnectTimer();
    this.clearAuthTimer();

    const socket = this.socket;

    if (socket && socket.readyState !== WebSocket.CLOSED) {
      this.connectionGeneration += 1;
      this.socket = null;
      this.authenticatedSocket = null;
      socket.close();
    }
  };

  private readonly handleOnline = (): void => {
    this.isOffline = false;
    this.reconnectAttempts = 0;

    if (this.reconnectEnabled && !this.socket) {
      this.connect();
    }
  };

  private static createTabId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private static hashScope(value: string): string {
    let hash = 2_166_136_261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16_777_619);
    }

    return (hash >>> 0).toString(16);
  }

  constructor(core: CoreSdk) {
    if (!core) {
      throw new Error("PushSdk requires a CoreSdk instance.");
    }
    if (typeof core.request !== "function") {
      throw new Error("Invalid CoreSdk instance: missing request method.");
    }

    this.core = core;
    this.coordinationChannelName = `mbaas-push-coordination:${PushSdk.hashScope(core.apiKey)}`;
  }

  onError(listener: PushSdkErrorListener): () => void {
    if (typeof listener !== "function") {
      throw new Error("PushSdk onError listener must be a function.");
    }

    this.errorListeners.add(listener);

    return () => {
      this.errorListeners.delete(listener);
    };
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === "undefined") {
      throw new Error("Notifications are not supported in this environment.");
    }

    const permission = Notification.permission;

    return permission === "default" ? Notification.requestPermission() : permission;
  }

  async start(): Promise<NotificationPermission> {
    const permission = await this.requestPermission();

    if (permission === "granted") {
      await this.ensureInstallationToken();
      this.connect();
    }

    return permission;
  }

  private async ensureInstallationToken(): Promise<void> {
    let token = await this.core.getInstallationToken();

    if (!token) {
      await this.core.initializeApp();
      token = await this.core.getInstallationToken();
    }

    if (!token) {
      throw new Error("Unable to start PushSdk: installation token is missing.");
    }
  }

  connect(): void {
    if (typeof WebSocket === "undefined") {
      throw new Error("WebSocket is not supported in this environment.");
    }

    this.reconnectEnabled = true;
    this.attachNetworkListeners();
    this.clearReconnectTimer();

    if (this.isOffline || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      this.isOffline = true;
      return;
    }

    this.startCoordination();

    if (!this.isLeader) {
      return;
    }

    this.connectSocket();
  }

  private connectSocket(): void {
    if (!this.isLeader || !this.reconnectEnabled || this.isOffline) {
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    let socket: WebSocket;

    try {
      socket = new WebSocket(this.core.getWebSocketUrl());
    } catch (error) {
      this.notifyError(error);
      throw error;
    }

    const generation = ++this.connectionGeneration;
    this.socket = socket;
    this.authenticatedSocket = null;
    this.startAuthTimeout(socket, generation);

    socket.addEventListener("message", (event) => {
      void this.handleMessage(socket, generation, event.data).catch((error: unknown) => {
        this.notifyError(error);
      });
    });

    socket.addEventListener("error", () => {
      this.notifyError(new Error("WebSocket connection error."));
    });

    socket.addEventListener("close", (event) => {
      if (this.socket !== socket || generation !== this.connectionGeneration) {
        return;
      }

      this.clearAuthTimer();
      this.socket = null;
      this.authenticatedSocket = null;
      this.scheduleReconnect(event.code);
    });
  }

  private startCoordination(): void {
    if (this.coordinationStarted) {
      return;
    }

    this.coordinationStarted = true;

    if (typeof BroadcastChannel === "undefined") {
      this.becomeLeader();
      return;
    }

    try {
      const channel = new BroadcastChannel(this.coordinationChannelName);
      this.coordinationChannel = channel;
      channel.addEventListener("message", (event: MessageEvent<CoordinationMessage>) => {
        this.handleCoordinationMessage(event.data);
      });
      channel.addEventListener("messageerror", () => {
        this.notifyError(new Error("PushSdk BroadcastChannel message error."));
      });

      this.candidateIds.add(this.tabId);
      this.postCoordinationMessage({ type: "CANDIDATE", tabId: this.tabId });
      this.scheduleElection();
      this.leaderWatchdogTimer = setInterval(() => {
        if (this.isLeader || !this.reconnectEnabled) {
          return;
        }

        if (!this.leaderId || Date.now() - this.leaderLastSeenAt > 6_000) {
          this.leaderId = null;
          this.leaderLastSeenAt = 0;
          this.candidateIds.clear();
          this.candidateIds.add(this.tabId);
          this.scheduleElection(0);
        }
      }, 2_000);
    } catch (error) {
      this.notifyError(error);
      this.becomeLeader();
    }
  }

  private handleCoordinationMessage(message: CoordinationMessage): void {
    if (!message || typeof message.type !== "string") {
      return;
    }

    if (message.type === "CANDIDATE" && message.tabId && message.tabId !== this.tabId) {
      if (this.isLeader) {
        this.postCoordinationMessage({ type: "LEADER", leaderId: this.tabId });
      } else if (!this.leaderId) {
        this.candidateIds.add(message.tabId);
      }
      return;
    }

    if ((message.type === "LEADER" || message.type === "HEARTBEAT") && message.leaderId) {
      this.acceptLeader(message.leaderId);

      if (message.type === "HEARTBEAT" && message.leaderId === this.leaderId) {
        this.leaderLastSeenAt = Date.now();
      }
      return;
    }

    if (message.type === "RELEASE" && message.leaderId && message.leaderId === this.leaderId) {
      this.leaderId = null;
      this.leaderLastSeenAt = 0;
      this.candidateIds.clear();
      this.candidateIds.add(this.tabId);
      this.scheduleElection(0);
    }
  }

  private acceptLeader(leaderId: string): void {
    if (leaderId === this.tabId) {
      this.becomeLeader();
      return;
    }

    if (this.isLeader) {
      if (leaderId < this.tabId) {
        this.becomeFollower(leaderId);
      } else {
        this.postCoordinationMessage({ type: "LEADER", leaderId: this.tabId });
      }
      return;
    }

    this.leaderId = leaderId;
    this.leaderLastSeenAt = Date.now();
    this.clearElectionTimer();
  }

  private scheduleElection(delayMs = 100): void {
    if (this.electionTimer || this.isLeader || !this.reconnectEnabled) {
      return;
    }

    this.electionTimer = setTimeout(() => {
      this.electionTimer = null;
      this.electLeader();
    }, delayMs);
  }

  private electLeader(): void {
    if (!this.coordinationStarted || this.isLeader || !this.reconnectEnabled) {
      return;
    }

    if (this.leaderId && Date.now() - this.leaderLastSeenAt <= 6_000) {
      return;
    }

    this.candidateIds.add(this.tabId);
    const electedLeader = [...this.candidateIds].sort()[0];

    if (electedLeader === this.tabId) {
      this.becomeLeader();
      return;
    }

    this.leaderId = electedLeader;
    this.leaderLastSeenAt = Date.now();
  }

  private becomeLeader(): void {
    this.clearElectionTimer();
    this.isLeader = true;
    this.leaderId = this.tabId;
    this.leaderLastSeenAt = Date.now();
    this.postCoordinationMessage({ type: "LEADER", leaderId: this.tabId });

    if (!this.heartbeatTimer && this.coordinationChannel) {
      this.heartbeatTimer = setInterval(() => {
        this.postCoordinationMessage({ type: "HEARTBEAT", leaderId: this.tabId });
      }, 2_000);
    }

    this.connectSocket();
  }

  private becomeFollower(leaderId: string): void {
    this.isLeader = false;
    this.leaderId = leaderId;
    this.leaderLastSeenAt = Date.now();
    this.clearElectionTimer();
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.stopSocket();
  }

  private postCoordinationMessage(message: CoordinationMessage): void {
    try {
      this.coordinationChannel?.postMessage(message);
    } catch (error) {
      this.notifyError(error);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearElectionTimer(): void {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
      this.electionTimer = null;
    }
  }

  private stopSocket(): void {
    this.clearAuthTimer();
    this.connectionGeneration += 1;

    const socket = this.socket;
    this.socket = null;
    this.authenticatedSocket = null;

    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
  }

  private stopCoordination(): void {
    if (this.isLeader) {
      this.postCoordinationMessage({ type: "RELEASE", leaderId: this.tabId });
    }

    this.clearElectionTimer();
    this.stopHeartbeat();

    if (this.leaderWatchdogTimer) {
      clearInterval(this.leaderWatchdogTimer);
      this.leaderWatchdogTimer = null;
    }

    this.coordinationChannel?.close();
    this.coordinationChannel = null;
    this.coordinationStarted = false;
    this.isLeader = false;
    this.leaderId = null;
    this.leaderLastSeenAt = 0;
    this.candidateIds.clear();
  }

  disconnect(): void {
    this.reconnectEnabled = false;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    this.stopCoordination();
    this.stopSocket();
  }

  private scheduleReconnect(closeCode: number): void {
    if (
      !this.reconnectEnabled ||
      this.isOffline ||
      !PushSdk.reconnectableCloseCodes.has(closeCode) ||
      this.reconnectTimer ||
      this.reconnectAttempts >= PushSdk.maxReconnectAttempts
    ) {
      return;
    }

    this.reconnectAttempts += 1;
    const exponentialDelay = Math.min(
      PushSdk.reconnectBaseDelayMs * 2 ** (this.reconnectAttempts - 1),
      PushSdk.reconnectMaxDelayMs,
    );
    const jitter = 0.8 + Math.random() * 0.4;
    const delay = Math.round(exponentialDelay * jitter);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (this.reconnectEnabled && !this.isOffline) {
        this.connect();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyError(error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    for (const listener of this.errorListeners) {
      try {
        listener(normalizedError);
      } catch {
        // A consumer's error handler must not interrupt the SDK connection flow.
      }
    }
  }

  private startAuthTimeout(socket: WebSocket, generation: number): void {
    this.clearAuthTimer();
    this.authTimer = setTimeout(() => {
      if (this.socket === socket && this.connectionGeneration === generation && this.authenticatedSocket !== socket) {
        this.notifyError(new Error("WebSocket AUTH timeout after 10 seconds."));
        socket.close(4008, "AUTH timeout");
      }
    }, PushSdk.authTimeoutMs);
  }

  private clearAuthTimer(): void {
    if (this.authTimer) {
      clearTimeout(this.authTimer);
      this.authTimer = null;
    }
  }

  private attachNetworkListeners(): void {
    if (this.networkListenersAttached || typeof window === "undefined") {
      return;
    }

    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("online", this.handleOnline);
    this.networkListenersAttached = true;
  }

  private async handleMessage(socket: WebSocket, generation: number, rawMessage: string): Promise<void> {
    if (this.socket !== socket || this.connectionGeneration !== generation) {
      return;
    }

    let payload: WebSocketMessage;

    try {
      payload = JSON.parse(rawMessage) as WebSocketMessage;
    } catch {
      this.notifyError(new Error("Received invalid JSON from WebSocket."));
      return;
    }

    if (payload.type === "HELLO") {
      if (this.authSentSockets.has(socket)) {
        return;
      }

      const token = await this.core.getInstallationToken();

      if (
        this.socket !== socket ||
        this.connectionGeneration !== generation ||
        !token ||
        socket.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      this.authSentSockets.add(socket);

      socket.send(
        JSON.stringify({
          type: "AUTH",
          token,
        }),
      );
      return;
    }

    if (payload.type === "CONNECTED") {
      this.clearAuthTimer();
      this.authenticatedSocket = socket;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      return;
    }

    if (payload.type === "AUTH_ERROR") {
      const message = typeof payload.message === "string" ? payload.message : "WebSocket authentication failed.";
      this.notifyError(new Error(message));

      if (this.socket === socket) {
        this.authenticatedSocket = null;
        socket.close();
      }
      return;
    }

    if (payload.type === "PING" && this.authenticatedSocket === socket) {
      socket.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
      return;
    }

    if (payload.type === "PUSH" && this.authenticatedSocket === socket) {
      await this.showPushNotification(payload as PushPayload);
    }
  }

  private async showPushNotification(payload: PushPayload): Promise<void> {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return;
    }

    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported in this environment.");
    }

    const options = {
      ...payload,
      image: payload.image || undefined,
      data: {
        pushId: payload?.pushId,
      },
    };

    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(options.title || "", { ...options });
  }
}
