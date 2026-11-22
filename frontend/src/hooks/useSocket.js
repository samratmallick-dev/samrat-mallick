import { useEffect, useRef } from "react";
import { connectSocket, onSocketEvent, offSocketEvent } from "../config/socket";
import { getAccessToken, refreshAuthOnce } from "@/config/api";
import { whenIdle } from "@/utils/performance";

export const useSocket = (eventName, callback) => {
      const callbackRef = useRef(callback);
      callbackRef.current = callback;

      useEffect(() => {
            let cleanup;
            let cancelIdle;
            let disposed = false;

            const start = () => {
                  if (disposed) return;

                  connectSocket();
                  if (!eventName) return;

                  const handler = (payload) => callbackRef.current(payload);
                  onSocketEvent(eventName, handler);
                  cleanup = () => offSocketEvent(eventName, handler);
            };

            const schedule = () => {
                  cancelIdle = whenIdle(start);
            };

            if (document.readyState === "complete") {
                  schedule();
            } else {
                  window.addEventListener("load", schedule, { once: true });
            }

            return () => {
                  disposed = true;
                  cancelIdle?.();
                  window.removeEventListener("load", schedule);
                  cleanup?.();
            };
      }, [eventName]);
};

export const useSocketConnection = () => {
      useEffect(() => {
            const cancelIdle = whenIdle(() => connectSocket());
            return () => cancelIdle?.();
      }, []);
};

export const useAdminSocket = (eventName, callback) => {
      const callbackRef = useRef(callback);
      callbackRef.current = callback;

      useEffect(() => {
            const socket = connectSocket();
            let refreshedAfterDenial = false;

            const joinAdmin = () => {
                  const token = getAccessToken();
                  if (!token) return;
                  socket.emit("joinAdmin", { token }, (response) => {
                        if (response && response.ok === false) {
                              callbackRef.current?.({ __adminAccessDenied: true, message: response.message });
                        }
                  });
            };

            // Register listeners before joining so an immediate server-side
            // denial is never missed.
            const offDenied = onSocketEvent("adminAccessDenied", (payload) => {
                  callbackRef.current?.({ __adminAccessDenied: true, ...(payload || {}) });

                  // An expired access token is recoverable through the same
                  // single-flight refresh used by REST requests. Retry once;
                  // a revoked session must not create a refresh loop.
                  if (refreshedAfterDenial) return;
                  refreshedAfterDenial = true;
                  refreshAuthOnce()
                        .then(() => {
                              const token = getAccessToken();
                              if (token && socket.connected) socket.emit("joinAdmin", { token });
                        })
                        .catch(() => {});
            });

            const offRevoked = onSocketEvent("adminAccessRevoked", (payload) => {
                  callbackRef.current?.({ __adminAccessRevoked: true, ...(payload || {}) });
            });

            if (socket.connected) {
                  joinAdmin();
            }
            socket.on("connect", joinAdmin);

            if (!eventName) {
                  return () => {
                        offDenied();
                        offRevoked();
                        socket.off("connect", joinAdmin);
                  };
            }

            const handler = (payload) => callbackRef.current(payload);
            onSocketEvent(eventName, handler);

            return () => {
                  offSocketEvent(eventName, handler);
                  offDenied();
                  offRevoked();
                  socket.off("connect", joinAdmin);
                  if (socket.connected) socket.emit("leaveAdmin");
            };
      }, [eventName]);
};
