'use strict';

class PushSdk {
    static createTabId() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    static hashScope(value) {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }
    constructor(core) {
        this.socket = null;
        this.authenticatedSocket = null;
        this.reconnectTimer = null;
        this.authTimer = null;
        this.reconnectAttempts = 0;
        this.reconnectEnabled = false;
        this.networkListenersAttached = false;
        this.isOffline = false;
        this.connectionGeneration = 0;
        this.authSentSockets = new WeakSet();
        this.errorListeners = new Set();
        this.tabId = PushSdk.createTabId();
        this.coordinationChannel = null;
        this.coordinationStarted = false;
        this.isLeader = false;
        this.leaderId = null;
        this.leaderLastSeenAt = 0;
        this.candidateIds = new Set();
        this.electionTimer = null;
        this.heartbeatTimer = null;
        this.leaderWatchdogTimer = null;
        this.handleOffline = () => {
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
        this.handleOnline = () => {
            this.isOffline = false;
            this.reconnectAttempts = 0;
            if (this.reconnectEnabled && !this.socket) {
                this.connect();
            }
        };
        if (!core) {
            throw new Error("PushSdk requires a CoreSdk instance.");
        }
        if (typeof core.request !== "function") {
            throw new Error("Invalid CoreSdk instance: missing request method.");
        }
        this.core = core;
        this.coordinationChannelName = `mbaas-push-coordination:${PushSdk.hashScope(core.apiKey)}`;
    }
    onError(listener) {
        if (typeof listener !== "function") {
            throw new Error("PushSdk onError listener must be a function.");
        }
        this.errorListeners.add(listener);
        return () => {
            this.errorListeners.delete(listener);
        };
    }
    async requestPermission() {
        if (typeof Notification === "undefined") {
            throw new Error("Notifications are not supported in this environment.");
        }
        const permission = Notification.permission;
        return permission === "default" ? Notification.requestPermission() : permission;
    }
    async start() {
        const permission = await this.requestPermission();
        if (permission === "granted") {
            await this.ensureInstallationToken();
            this.connect();
        }
        return permission;
    }
    async ensureInstallationToken() {
        let token = await this.core.getInstallationToken();
        if (!token) {
            await this.core.initializeApp();
            token = await this.core.getInstallationToken();
        }
        if (!token) {
            throw new Error("Unable to start PushSdk: installation token is missing.");
        }
    }
    connect() {
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
    connectSocket() {
        if (!this.isLeader || !this.reconnectEnabled || this.isOffline) {
            return;
        }
        if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
            return;
        }
        let socket;
        try {
            socket = new WebSocket(this.core.getWebSocketUrl());
        }
        catch (error) {
            this.notifyError(error);
            throw error;
        }
        const generation = ++this.connectionGeneration;
        this.socket = socket;
        this.authenticatedSocket = null;
        this.startAuthTimeout(socket, generation);
        socket.addEventListener("message", (event) => {
            void this.handleMessage(socket, generation, event.data).catch((error) => {
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
    startCoordination() {
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
            channel.addEventListener("message", (event) => {
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
                if (!this.leaderId || Date.now() - this.leaderLastSeenAt > 6000) {
                    this.leaderId = null;
                    this.leaderLastSeenAt = 0;
                    this.candidateIds.clear();
                    this.candidateIds.add(this.tabId);
                    this.scheduleElection(0);
                }
            }, 2000);
        }
        catch (error) {
            this.notifyError(error);
            this.becomeLeader();
        }
    }
    handleCoordinationMessage(message) {
        if (!message || typeof message.type !== "string") {
            return;
        }
        if (message.type === "CANDIDATE" && message.tabId && message.tabId !== this.tabId) {
            if (this.isLeader) {
                this.postCoordinationMessage({ type: "LEADER", leaderId: this.tabId });
            }
            else if (!this.leaderId) {
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
    acceptLeader(leaderId) {
        if (leaderId === this.tabId) {
            this.becomeLeader();
            return;
        }
        if (this.isLeader) {
            if (leaderId < this.tabId) {
                this.becomeFollower(leaderId);
            }
            else {
                this.postCoordinationMessage({ type: "LEADER", leaderId: this.tabId });
            }
            return;
        }
        this.leaderId = leaderId;
        this.leaderLastSeenAt = Date.now();
        this.clearElectionTimer();
    }
    scheduleElection(delayMs = 100) {
        if (this.electionTimer || this.isLeader || !this.reconnectEnabled) {
            return;
        }
        this.electionTimer = setTimeout(() => {
            this.electionTimer = null;
            this.electLeader();
        }, delayMs);
    }
    electLeader() {
        if (!this.coordinationStarted || this.isLeader || !this.reconnectEnabled) {
            return;
        }
        if (this.leaderId && Date.now() - this.leaderLastSeenAt <= 6000) {
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
    becomeLeader() {
        this.clearElectionTimer();
        this.isLeader = true;
        this.leaderId = this.tabId;
        this.leaderLastSeenAt = Date.now();
        this.postCoordinationMessage({ type: "LEADER", leaderId: this.tabId });
        if (!this.heartbeatTimer && this.coordinationChannel) {
            this.heartbeatTimer = setInterval(() => {
                this.postCoordinationMessage({ type: "HEARTBEAT", leaderId: this.tabId });
            }, 2000);
        }
        this.connectSocket();
    }
    becomeFollower(leaderId) {
        this.isLeader = false;
        this.leaderId = leaderId;
        this.leaderLastSeenAt = Date.now();
        this.clearElectionTimer();
        this.clearReconnectTimer();
        this.stopHeartbeat();
        this.stopSocket();
    }
    postCoordinationMessage(message) {
        try {
            this.coordinationChannel?.postMessage(message);
        }
        catch (error) {
            this.notifyError(error);
        }
    }
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    clearElectionTimer() {
        if (this.electionTimer) {
            clearTimeout(this.electionTimer);
            this.electionTimer = null;
        }
    }
    stopSocket() {
        this.clearAuthTimer();
        this.connectionGeneration += 1;
        const socket = this.socket;
        this.socket = null;
        this.authenticatedSocket = null;
        if (socket && socket.readyState !== WebSocket.CLOSED) {
            socket.close();
        }
    }
    stopCoordination() {
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
    disconnect() {
        this.reconnectEnabled = false;
        this.clearReconnectTimer();
        this.reconnectAttempts = 0;
        this.stopCoordination();
        this.stopSocket();
    }
    scheduleReconnect(closeCode) {
        if (!this.reconnectEnabled ||
            this.isOffline ||
            !PushSdk.reconnectableCloseCodes.has(closeCode) ||
            this.reconnectTimer ||
            this.reconnectAttempts >= PushSdk.maxReconnectAttempts) {
            return;
        }
        this.reconnectAttempts += 1;
        const exponentialDelay = Math.min(PushSdk.reconnectBaseDelayMs * 2 ** (this.reconnectAttempts - 1), PushSdk.reconnectMaxDelayMs);
        const jitter = 0.8 + Math.random() * 0.4;
        const delay = Math.round(exponentialDelay * jitter);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.reconnectEnabled && !this.isOffline) {
                this.connect();
            }
        }, delay);
    }
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    notifyError(error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        for (const listener of this.errorListeners) {
            try {
                listener(normalizedError);
            }
            catch {
                // A consumer's error handler must not interrupt the SDK connection flow.
            }
        }
    }
    startAuthTimeout(socket, generation) {
        this.clearAuthTimer();
        this.authTimer = setTimeout(() => {
            if (this.socket === socket && this.connectionGeneration === generation && this.authenticatedSocket !== socket) {
                this.notifyError(new Error("WebSocket AUTH timeout after 10 seconds."));
                socket.close(4008, "AUTH timeout");
            }
        }, PushSdk.authTimeoutMs);
    }
    clearAuthTimer() {
        if (this.authTimer) {
            clearTimeout(this.authTimer);
            this.authTimer = null;
        }
    }
    attachNetworkListeners() {
        if (this.networkListenersAttached || typeof window === "undefined") {
            return;
        }
        window.addEventListener("offline", this.handleOffline);
        window.addEventListener("online", this.handleOnline);
        this.networkListenersAttached = true;
    }
    async handleMessage(socket, generation, rawMessage) {
        if (this.socket !== socket || this.connectionGeneration !== generation) {
            return;
        }
        let payload;
        try {
            payload = JSON.parse(rawMessage);
        }
        catch {
            this.notifyError(new Error("Received invalid JSON from WebSocket."));
            return;
        }
        if (payload.type === "HELLO") {
            if (this.authSentSockets.has(socket)) {
                return;
            }
            const token = await this.core.getInstallationToken();
            if (this.socket !== socket ||
                this.connectionGeneration !== generation ||
                !token ||
                socket.readyState !== WebSocket.OPEN) {
                return;
            }
            this.authSentSockets.add(socket);
            socket.send(JSON.stringify({
                type: "AUTH",
                token,
            }));
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
            await this.showPushNotification(payload);
        }
    }
    async showPushNotification(payload) {
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
PushSdk.reconnectBaseDelayMs = 1000;
PushSdk.reconnectMaxDelayMs = 30000;
PushSdk.maxReconnectAttempts = 10;
PushSdk.authTimeoutMs = 10000;
PushSdk.reconnectableCloseCodes = new Set([1006, 4008]);

exports.PushSdk = PushSdk;
