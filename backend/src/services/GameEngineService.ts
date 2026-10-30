import type { Server } from "socket.io";
import { GAME_PHASES, GAME_STATUS } from "../constants/gameConstants";
import { GameController } from "../controllers/GameController";
import { database } from "../database";

interface SocketSession {
  socketId: string;
  userId: string;
  sessionToken: string;
  gameId: string;
  gameCode: string;
}

class GameEngineService {
  private io: Server | null = null;
  private socketSessions = new Map<string, SocketSession>();
  private gameTimers = new Map<string, NodeJS.Timeout>();
  private sweepInterval: NodeJS.Timeout | null = null;
  private advancingGames = new Set<string>();

  initialize(io: Server): void {
    this.io = io;

    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }

    this.sweepInterval = setInterval(() => {
      void this.checkExpiredPhases();
    }, 1000);
  }

  shutdown(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    for (const timer of this.gameTimers.values()) {
      clearTimeout(timer);
    }
    this.gameTimers.clear();
  }

  registerSocketSession(session: SocketSession): void {
    this.socketSessions.set(session.socketId, session);
  }

  getSocketSession(socketId: string): SocketSession | undefined {
    return this.socketSessions.get(socketId);
  }

  removeSocketSession(socketId: string): SocketSession | undefined {
    const existing = this.socketSessions.get(socketId);
    this.socketSessions.delete(socketId);
    return existing;
  }

  schedulePhaseTimer(gameId: string, phaseEndsAt: string | null): void {
    const existing = this.gameTimers.get(gameId);
    if (existing) {
      clearTimeout(existing);
      this.gameTimers.delete(gameId);
    }

    if (!phaseEndsAt) {
      return;
    }

    const delayMs = Math.max(
      50,
      new Date(phaseEndsAt).getTime() - Date.now()
    );

    const timer = setTimeout(() => {
      this.gameTimers.delete(gameId);
      void this.triggerPhaseAdvance(gameId);
    }, delayMs);

    this.gameTimers.set(gameId, timer);
  }

  async triggerPhaseAdvance(gameId: string): Promise<void> {
    if (this.advancingGames.has(gameId)) {
      return;
    }

    this.advancingGames.add(gameId);
    try {
      const updatedGame = await GameController.advancePhase(gameId);
      if (updatedGame) {
        this.schedulePhaseTimer(updatedGame.id, updatedGame.phaseEndsAt);
        await this.broadcastGameState(updatedGame.id);
      }
    } catch (error) {
      console.error("Failed to advance game phase:", error);
    } finally {
      this.advancingGames.delete(gameId);
    }
  }

  private async checkExpiredPhases(): Promise<void> {
    try {
      const res = await database.query(
        `SELECT id
         FROM games
         WHERE status = $1
           AND current_phase != $2
           AND phase_ends_at IS NOT NULL
           AND phase_ends_at <= NOW()
           AND deleted_at IS NULL`,
        [GAME_STATUS.IN_PROGRESS, GAME_PHASES.GAME_OVER]
      );

      for (const row of res.rows) {
        void this.triggerPhaseAdvance(String(row.id));
      }
    } catch {
      return;
    }
  }

  async broadcastGameState(gameIdOrCode: string): Promise<void> {
    if (!this.io) return;

    const matchingSessions: SocketSession[] = [];
    for (const session of this.socketSessions.values()) {
      if (
        session.gameId === gameIdOrCode ||
        session.gameCode.toUpperCase() === gameIdOrCode.toUpperCase()
      ) {
        matchingSessions.push(session);
      }
    }

    if (matchingSessions.length === 0) return;

    let latestPhaseEndsAt: string | null = null;
    let resolvedGameId: string | null = null;

    await Promise.all(
      matchingSessions.map(async (session) => {
        try {
          const state = await GameController.getFilteredGameState(
            session.gameId,
            session.userId
          );
          resolvedGameId = state.game.id;
          latestPhaseEndsAt = state.game.phaseEndsAt;
          this.io?.to(session.socketId).emit("game:state", state);
        } catch {
          return;
        }
      })
    );

    if (resolvedGameId) {
      this.schedulePhaseTimer(resolvedGameId, latestPhaseEndsAt);
    }
  }

  notifyPlayerRemoved(gameId: string, removedUserId: string): void {
    if (!this.io) return;
    for (const [socketId, session] of this.socketSessions.entries()) {
      if (session.gameId === gameId && session.userId === removedUserId) {
        this.io.to(socketId).emit("game:removed", {
          message: "You were removed from the game by the host."
        });
        this.socketSessions.delete(socketId);
      }
    }
  }

  notifyGameDeleted(gameId: string): void {
    if (!this.io) return;
    const timer = this.gameTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.gameTimers.delete(gameId);
    }

    for (const [socketId, session] of this.socketSessions.entries()) {
      if (session.gameId === gameId) {
        this.io.to(socketId).emit("game:deleted", {
          message: "The game was deleted by the host."
        });
        this.socketSessions.delete(socketId);
      }
    }
  }

  getActiveSummary(): { activeGames: number; connectedPlayers: number } {
    const uniqueGames = new Set<string>();
    for (const session of this.socketSessions.values()) {
      uniqueGames.add(session.gameId);
    }
    return {
      activeGames: uniqueGames.size,
      connectedPlayers: this.socketSessions.size
    };
  }
}

export const gameEngine = new GameEngineService();

