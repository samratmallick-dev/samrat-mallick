import { io } from "socket.io-client";
import { getAccessToken, refreshAuthOnce } from "./api.js";

const socketUrlFromApiBase = () => {
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      if (!apiBase) return "";
      try {
            // VITE_API_BASE_URL ends in /api/v1, but Socket.io needs the bare origin.
            return new URL(apiBase).origin;
      } catch {
            return apiBase;
      }
};

const SOCKET_URL = import.meta.env.DEV
      ? import.meta.env.VITE_SOCKET_URL || "http://localhost:8000"
      : import.meta.env.VITE_SOCKET_URL || socketUrlFromApiBase();

if (!SOCKET_URL) {
      throw new Error("Socket URL is not configured. Set VITE_API_BASE_URL.");
}

let socket = null;
let isConnecting = false;
let authErrorHandler = null;
let authRetries = 0;
const MAX_AUTH_RETRIES = 2;

const authPayload = (tokenOverride) => {
      const token = tokenOverride ?? getAccessToken?.() ?? null;
      return token ? { token } : {};
};

export const setSocketAccessToken = (token) => {
      if (socket) {
            socket.auth = authPayload(token);
      }
};

export const onSocketAuthError = (handler) => {
      authErrorHandler = typeof handler === "function" ? handler : null;
      return () => {
            if (authErrorHandler === handler) authErrorHandler = null;
      };
};

export const getSocket = () => {
      if (socket?.connected || isConnecting) return socket;

      isConnecting = true;

      socket = io(SOCKET_URL, {
            auth: authPayload(),
            transports: ["websocket", "polling"],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
      });

      socket.on("connect", () => {
            isConnecting = false;
            authRetries = 0;
            socket.auth = authPayload();
      });

      socket.on("disconnect", () => {
            isConnecting = false;
      });

      socket.on("connect_error", (err) => {
            isConnecting = false;
            if (err?.message !== "Unauthorized") return;

            // The handshake rejected the access token (expired or revoked).
            // Reuse the REST client's coordinated refresh, then retry a bounded
            // number of times so a dead session cannot loop forever.
            if (authRetries < MAX_AUTH_RETRIES && getAccessToken()) {
                  authRetries += 1;
                  refreshAuthOnce()
                        .then(() => {
                              socket.auth = authPayload();
                              if (!socket.connected) socket.connect();
                        })
                        .catch(() => {
                              authRetries = MAX_AUTH_RETRIES;
                              authErrorHandler?.(err);
                        });
            } else {
                  authErrorHandler?.(err);
            }
      });

      socket.on("reconnect_attempt", () => {
            socket.auth = authPayload();
      });

      return socket;
};

export const connectSocket = () => {
      const s = getSocket();
      if (!s.connected) s.connect();
      return s;
};

export const disconnectSocket = () => {
      if (socket) {
            socket.disconnect();
            socket = null;
            isConnecting = false;
      }
};

export const onSocketEvent = (event, callback) => {
      const s = getSocket();
      s.on(event, callback);
      return () => s.off(event, callback);
};

export const offSocketEvent = (event, callback) => {
      if (socket) socket.off(event, callback);
};

export const emitSocketEvent = (event, data, ack) => {
      const s = getSocket();
      if (s.connected) {
            if (typeof ack === "function") {
                  s.emit(event, data, ack);
            } else {
                  s.emit(event, data);
            }
            return true;
      }
      return false;
};
