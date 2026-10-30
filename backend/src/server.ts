import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { checkDatabase, database, initializeDatabaseSchema } from "./database";
import { gameRouter } from "./routes/gameRoutes";
import { gameEngine } from "./services/GameEngineService";
import { registerSocketHandlers } from "./socket/socketHandlers";
import { apiRateLimitMiddleware, securityHeadersMiddleware } from "./utils/security";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const httpServer = createServer(app);

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.disable("x-powered-by");
app.use(securityHeadersMiddleware);
app.use(apiRateLimitMiddleware);
app.use(
  cors({
    origin: clientOrigin,
    methods: ["GET", "POST", "DELETE", "OPTIONS"]
  })
);
app.use(express.json({ limit: "32kb" }));

const io = new Server(httpServer, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST", "DELETE"]
  },
  maxHttpBufferSize: 1e6
});

gameEngine.initialize(io);

app.get("/api/health", async (_request, response) => {
  const databaseConnected = await checkDatabase();

  response.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "degraded",
    service: "motive-server",
    database: databaseConnected ? "connected" : "disconnected",
    ...gameEngine.getActiveSummary()
  });
});

app.use("/api/games", gameRouter);
app.use("/games", gameRouter);

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

async function start(): Promise<void> {
  await initializeDatabaseSchema();

  const connected = await checkDatabase();
  if (!connected) {
    throw new Error(
      "PostgreSQL is unavailable. Start the database and check your .env settings."
    );
  }

  console.log("Database ready");

  httpServer.listen(port, host, () => {
    console.log("Server started");
  });
}

async function shutdown(): Promise<void> {
  gameEngine.shutdown();
  io.close();
  await database.end();

  httpServer.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

start().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Startup failed:", message);
  await database.end().catch(() => undefined);
  process.exit(1);
});
