const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const TICK_RATE = 20;
const DT = 1 / TICK_RATE;
const FINISH_LAPS = 3;
const TRACK_LENGTH = 1000;
const MAX_PLAYERS = 8;

app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Zion Racing Online" }));

const players = new Map();
const coinCount = 12;
const coins = Array.from({ length: coinCount }, (_, i) => ({
  id: i,
  progress: (i / coinCount) * TRACK_LENGTH,
  active: true
}));

const palette = ["#ff4e35", "#17a8ff", "#ffcc22", "#39d353", "#b86cff", "#ff66b3", "#ffffff", "#ff8b24"];

function cleanName(value) {
  const name = String(value || "Racer").replace(/[<>]/g, "").trim().slice(0, 14);
  return name || "Racer";
}
function wrapProgress(n) {
  return ((n % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
}
function distanceAround(a, b) {
  const d = Math.abs(wrapProgress(a) - wrapProgress(b));
  return Math.min(d, TRACK_LENGTH - d);
}
function publicPlayer(p) {
  return {
    id: p.id, name: p.name, color: p.color, progress: p.progress,
    lane: p.lane, speed: p.speed, lap: p.lap, coins: p.coins,
    finished: p.finished, finishPlace: p.finishPlace
  };
}

io.on("connection", socket => {
  socket.on("join", data => {
    if (players.has(socket.id)) return;
    if (players.size >= MAX_PLAYERS) {
      socket.emit("joinError", "This race is full. Try again in a moment.");
      return;
    }
    const p = {
      id: socket.id,
      name: cleanName(data && data.name),
      color: palette[players.size % palette.length],
      progress: Math.random() * 14,
      lane: (players.size % 5 - 2) * 0.12,
      speed: 0,
      throttle: 0,
      steer: 0,
      boost: false,
      lap: 0,
      coins: 0,
      finished: false,
      finishPlace: null,
      lastCoinAt: 0
    };
    players.set(socket.id, p);
    socket.emit("joined", { id: p.id, name: p.name, color: p.color, maxPlayers: MAX_PLAYERS, finishLaps: FINISH_LAPS });
    io.emit("notice", `${p.name} joined the race`);
    emitState();
  });

  socket.on("input", input => {
    const p = players.get(socket.id);
    if (!p || p.finished || !input) return;
    p.throttle = Math.max(-1, Math.min(1, Number(input.throttle) || 0));
    p.steer = Math.max(-1, Math.min(1, Number(input.steer) || 0));
    p.boost = Boolean(input.boost);
  });

  socket.on("disconnect", () => {
    const p = players.get(socket.id);
    if (p) {
      players.delete(socket.id);
      io.emit("notice", `${p.name} left the race`);
      emitState();
    }
  });
});

let finishCounter = 0;
function emitState() {
  io.emit("state", {
    players: [...players.values()].map(publicPlayer),
    coins,
    maxPlayers: MAX_PLAYERS,
    finishLaps: FINISH_LAPS
  });
}

setInterval(() => {
  for (const p of players.values()) {
    if (p.finished) continue;

    const accel = p.throttle > 0 ? 0.32 : p.throttle < 0 ? -0.55 : -0.12;
    p.speed = Math.max(0, Math.min(p.boost ? 1.45 : 1.05, p.speed + accel * DT * 3.5));
    if (p.boost && p.coins > 0) {
      p.speed = Math.min(1.6, p.speed + 0.18 * DT);
    }

    // Steering changes the lane; the server clamps it to the track.
    p.lane = Math.max(-1, Math.min(1, p.lane + p.steer * DT * 1.45));
    p.progress += p.speed * DT * 25;

    if (p.progress >= TRACK_LENGTH) {
      p.progress -= TRACK_LENGTH;
      p.lap += 1;
      io.emit("notice", `${p.name} started lap ${Math.min(p.lap + 1, FINISH_LAPS)}!`);
      if (p.lap >= FINISH_LAPS) {
        p.finished = true;
        p.speed = 0;
        p.finishPlace = ++finishCounter;
        io.emit("notice", `${p.name} finished in place ${p.finishPlace}!`);
      }
    }

    // Pick up coins near the player's position along the lap.
    const now = Date.now();
    if (now - p.lastCoinAt > 450) {
      for (const coin of coins) {
        if (coin.active && distanceAround(p.progress, coin.progress) < 11) {
          coin.active = false;
          p.coins += 1;
          p.lastCoinAt = now;
          io.to(p.id).emit("coin", { total: p.coins });
          break;
        }
      }
    }
  }

  // Replenish collected coins after a short race beat.
  const inactive = coins.filter(c => !c.active);
  if (inactive.length) {
    const coin = inactive[0];
    coin.active = true;
  }
  emitState();
}, 1000 / TICK_RATE);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Zion Racing Online listening on port ${PORT}`);
});
