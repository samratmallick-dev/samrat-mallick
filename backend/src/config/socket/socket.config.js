import { Server } from "socket.io";
import Logger from "../logger/logger.config.js";
import getAllowedOrigins from "../cors/cors.config.js";
import { invalidatePublicSection } from "../../middleware/cache.middleware.js";
import { verifyAccessToken } from "../../utilities/token.utility.js";
import adminRepository from "../../repository/admin.repository.js";
import adminSessionRepository from "../../repository/adminSession.repository.js";

let io;

const bearerToken = (header) => {
      if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
      const token = header.slice(7).trim();
      return token || null;
};

export const authenticateSocketToken = async (token) => {
      if (typeof token !== "string" || !token) return null;

      try {
            const payload = verifyAccessToken(token);
            const [admin, session] = await Promise.all([
                  adminRepository.findById(payload.sub),
                  adminSessionRepository.findActiveById(payload.sid),
            ]);

            if (!admin || !admin.isActive || admin.role !== "admin") return null;
            if (!session || String(session.adminId) !== String(admin._id)) return null;

            return {
                  id: admin._id.toString(),
                  adminId: admin._id.toString(),
                  username: admin.username,
                  role: admin.role,
                  sessionId: session._id.toString(),
            };
      } catch {
            return null;
      }
};

export const initializeSocket = (server) => {
      const allowedOrigins = getAllowedOrigins();

      io = new Server(server, {
            cors: {
                  origin: (origin, callback) => {
                        if (!origin) return callback(null, true);

                        if (allowedOrigins.includes(origin)) {
                              return callback(null, true);
                        }

                        Logger.warn("Socket CORS blocked", { origin, allowedOrigins });
                        return callback(new Error(`Socket CORS blocked: ${origin}`));
                  },
                  credentials: true,
                  methods: ["GET", "POST"],
            },
            transports: ["websocket", "polling"],
            pingInterval: 25000,
            pingTimeout: 20000,
      });

      io.use(async (socket, next) => {
            const token = socket.handshake.auth?.token || bearerToken(socket.handshake.headers?.authorization);

            if (!token) {
                  socket.data.admin = null;
                  return next();
            }

            const admin = await authenticateSocketToken(token);
            if (!admin) {
                  return next(new Error("Unauthorized"));
            }

            socket.data.admin = admin;
            return next();
      });

      io.on("connection", (socket) => {
            Logger.info(`Socket connected: ${socket.id}`, {
                  origin: socket.handshake.headers.origin,
                  transport: socket.conn.transport.name,
                  authenticated: Boolean(socket.data.admin),
            });

            const denyAdminRoom = (ack, message = "Administrator authentication required") => {
                  if (typeof ack === "function") {
                        ack({ ok: false, message });
                  }
                  socket.emit("adminAccessDenied", { message });
            };

            socket.on("joinAdmin", async (payload, ack) => {
                  if (typeof payload === "function") {
                        ack = payload;
                        payload = undefined;
                  }

                  const suppliedToken = typeof payload === "string" ? payload : payload?.token;
                  let admin = suppliedToken
                        ? await authenticateSocketToken(suppliedToken)
                        : socket.data.admin || null;

                  if (admin && !suppliedToken) {
                        const session = await adminSessionRepository
                              .findActiveById(admin.sessionId)
                              .catch(() => null);
                        if (!session) admin = null;
                  }

                  if (!admin) {
                        socket.data.admin = null;
                        denyAdminRoom(ack);
                        return;
                  }

                  socket.data.admin = admin;
                  socket.join("admin");

                  if (typeof ack === "function") {
                        ack({ ok: true, adminId: admin.adminId });
                  }
                  Logger.info(`Socket ${socket.id} joined admin room`, { adminId: admin.adminId });
            });

            socket.on("leaveAdmin", () => {
                  socket.leave("admin");
            });

            socket.on("ping", (payload, ack) => {
                  const pongPayload = {
                        message: "pong",
                        serverTime: new Date().toISOString(),
                        socketId: socket.id,
                        receivedData: payload,
                  };
                  if (typeof ack === "function") {
                        ack(pongPayload);
                  }
                  socket.emit("pong", pongPayload);
            });

            socket.on("disconnect", (reason) => {
                  socket.leave("admin");
                  Logger.info(`Socket disconnected: ${socket.id}`, { reason });
            });

            socket.on("error", (error) => {
                  Logger.error(`Socket error: ${socket.id}`, { error: error.message });
            });
      });

      Logger.info("Socket.IO initialized", { origins: allowedOrigins });

      return io;
};

export const getIO = () => {
      if (!io) {
            throw new Error("Socket.io not initialized");
      }
      return io;
};

export const revokeAdminSocketAccess = ({ sessionId, adminId } = {}) => {
      if (!io) return 0;

      let revoked = 0;
      for (const socket of io.sockets.sockets.values()) {
            const admin = socket.data?.admin;
            if (!admin) continue;

            const matchesSession = sessionId && admin.sessionId === String(sessionId);
            const matchesAdmin = adminId && admin.adminId === String(adminId);
            if (!matchesSession && !matchesAdmin) continue;

            socket.leave("admin");
            socket.data.admin = null;
            socket.emit("adminAccessRevoked", { message: "Administrator session is no longer active" });
            revoked += 1;
      }
      return revoked;
};

const BROADCAST_SECTIONS = new Set([
      "hero",
      "about",
      "education",
      "skills",
      "projects",
      "services",
      "contact",
]);

export const broadcastPortfolioUpdate = (type, data = null) => {
      if (BROADCAST_SECTIONS.has(type)) {
            invalidatePublicSection(type);
      }

      const version = Date.now();

      if (!io) {
            Logger.warn("Socket.io not initialized — skipping broadcastPortfolioUpdate");
            return;
      }

      io.emit("portfolioUpdated", { type, data, version, updatedAt: new Date(version).toISOString() });
      Logger.info("Portfolio update broadcast via Socket.IO", { type, version });
};

export const broadcastPrivateAdminEvent = (event, payload) => {
      if (!io) {
            Logger.warn("Socket.io not initialized — skipping private admin event");
            return;
      }

      io.to("admin").emit(event, payload);
};
