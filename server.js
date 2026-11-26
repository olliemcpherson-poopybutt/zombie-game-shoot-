const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e6,
  pingInterval: 25000,
  pingTimeout: 20000
});

const PORT = process.env.PORT || 10000;
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size }));
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function leaveRoom(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  socket.data.roomCode = null;
  socket.data.role = null;
  if (!room) return;

  if (room.hostId === socket.id) {
    io.to(code).emit("room-closed", "The host left the room.");
    rooms.delete(code);
  } else if (room.guestId === socket.id) {
    room.guestId = null;
    io.to(room.hostId).emit("guest-left");
  }
}

io.on("connection", socket => {
  socket.emit("server-ready");

  socket.on("create-room", () => {
    leaveRoom(socket);
    const code = makeCode();
    rooms.set(code, { hostId: socket.id, guestId: null, createdAt: Date.now() });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = "host";
    socket.emit("room-created", { code });
  });

  socket.on("join-room", rawCode => {
    const code = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const room = rooms.get(code);
    if (!room) return socket.emit("join-error", "Room not found. Check the code.");
    if (room.guestId && room.guestId !== socket.id) return socket.emit("join-error", "That room is full.");
    leaveRoom(socket);
    room.guestId = socket.id;
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = "guest";
    socket.emit("room-joined", { code });
    io.to(room.hostId).emit("guest-joined");
  });

  socket.on("snapshot", payload => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.data.role !== "host" || room.hostId !== socket.id) return;
    if (!payload || typeof payload !== "object") return;
    socket.to(code).volatile.emit("snapshot", payload);
  });

  socket.on("guest-input", input => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.data.role !== "guest" || room.guestId !== socket.id) return;
    if (!input || typeof input !== "object") return;
    const safe = {
      up: !!input.up, down: !!input.down, left: !!input.left, right: !!input.right,
      shoot: !!input.shoot,
      storeToggle: !!input.storeToggle,
      weapon: typeof input.weapon === "string" ? input.weapon.slice(0, 24) : null,
      action: input.action && typeof input.action === "object" ? input.action : null
    };
    io.to(room.hostId).emit("guest-input", safe);
  });

  socket.on("game-action", action => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.data.role !== "guest" || room.guestId !== socket.id) return;
    if (!action || typeof action !== "object") return;
    const type = String(action.type || "");
    if (type === "buyWeapon" && typeof action.id === "string" && action.id.length <= 24) {
      io.to(room.hostId).emit("guest-action", { type, id: action.id });
    } else if (type === "buyUpgrade" && ["cooldown", "health", "speed"].includes(action.id)) {
      io.to(room.hostId).emit("guest-action", { type, id: action.id });
    } else if (type === "storeToggle") {
      io.to(room.hostId).emit("guest-action", { type });
    }
  });

  socket.on("disconnect", () => leaveRoom(socket));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Zombie Shooter server listening on ${PORT}`);
});
