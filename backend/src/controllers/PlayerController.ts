import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  EVENT_TYPES,
  GAME_PHASES,
  GAME_STATUS,
  type EventType,
  type GamePhase
} from "../constants/gameConstants";
import type { Game, GamePlayer, User } from "../types/gameTypes";
import { generateSessionToken } from "../utils/codeGenerator";
import { ERROR_MESSAGES, GameError } from "../utils/errors";
import { isValidSessionToken, sanitizeUsername } from "../utils/security";

export const usernameSchema = z
  .string()
  .trim()
  .min(2, ERROR_MESSAGES.INVALID_NAME)
  .max(20, ERROR_MESSAGES.INVALID_NAME);

type Queryable = Pool | PoolClient;

export class PlayerController {
  static async getOrCreateUser(
    db: Queryable,
    usernameInput: string,
    sessionToken?: string | null
  ): Promise<User> {
    const cleanName = sanitizeUsername(usernameInput);

    if (sessionToken && isValidSessionToken(sessionToken)) {
      const existing = await db.query(
        `UPDATE users
         SET username = $1, updated_at = NOW()
         WHERE session_token = $2
         RETURNING id, username, session_token, created_at, updated_at`,
        [cleanName, sessionToken.trim()]
      );

      if (existing.rowCount && existing.rows[0]) {
        const row = existing.rows[0];
        return {
          id: row.id,
          username: row.username,
          sessionToken: row.session_token,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString()
        };
      }
    }

    const newToken = sessionToken && isValidSessionToken(sessionToken)
        ? sessionToken.trim()
        : generateSessionToken();

    const created = await db.query(
      `INSERT INTO users (username, session_token)
       VALUES ($1, $2)
       RETURNING id, username, session_token, created_at, updated_at`,
      [cleanName, newToken]
    );

    const row = created.rows[0];
    return {
      id: row.id,
      username: row.username,
      sessionToken: row.session_token,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  static async getUserBySession(
    db: Queryable,
    sessionToken?: string | null,
    userId?: string | null
  ): Promise<User | null> {
    if (!sessionToken || !isValidSessionToken(sessionToken)) {
      return null;
    }

    const res = await db.query(
      `SELECT id, username, session_token, created_at, updated_at
       FROM users
       WHERE session_token = $1`,
      [sessionToken.trim()]
    );
    if (res.rowCount && res.rows[0]) {
      const row = res.rows[0];
      if (userId && row.id !== userId) {
        return null;
      }
      return {
        id: row.id,
        username: row.username,
        sessionToken: row.session_token,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString()
      };
    }

    return null;
  }

  static async getGamePlayers(
    db: Queryable,
    gameId: string,
    hostUserId: string
  ): Promise<GamePlayer[]> {
    const res = await db.query(
      `SELECT
         gp.id,
         gp.game_id,
         gp.user_id,
         u.username,
         gp.seat_number,
         gp.is_alive,
         gp.is_ready,
         gp.is_connected,
         gp.last_protected_player_id,
         gp.joined_at,
         gp.eliminated_at,
         gp.left_at
       FROM game_players gp
       INNER JOIN users u ON u.id = gp.user_id
       WHERE gp.game_id = $1 AND gp.left_at IS NULL
       ORDER BY gp.seat_number ASC, gp.joined_at ASC`,
      [gameId]
    );

    return res.rows.map((row) => ({
      id: row.id,
      gameId: row.game_id,
      userId: row.user_id,
      username: row.username,
      seatNumber: Number(row.seat_number),
      isAlive: Boolean(row.is_alive),
      isReady: Boolean(row.is_ready),
      isConnected: Boolean(row.is_connected),
      isHost: row.user_id === hostUserId,
      lastProtectedPlayerId: row.last_protected_player_id ?? null,
      joinedAt: new Date(row.joined_at).toISOString(),
      eliminatedAt: row.eliminated_at
        ? new Date(row.eliminated_at).toISOString()
        : null,
      leftAt: row.left_at ? new Date(row.left_at).toISOString() : null
    }));
  }

  static isPlayerAlive(player: GamePlayer | undefined | null): player is GamePlayer {
    return Boolean(player && player.isAlive && !player.leftAt);
  }

  static getLivingPlayers(players: GamePlayer[]): GamePlayer[] {
    return players.filter((player) => PlayerController.isPlayerAlive(player));
  }

  static canPlayerAct(player: GamePlayer | undefined | null, game: Game): boolean {
    if (!PlayerController.isPlayerAlive(player)) {
      return false;
    }
    if (game.status !== GAME_STATUS.IN_PROGRESS) {
      return false;
    }
    if (game.currentPhase === GAME_PHASES.GAME_OVER) {
      return false;
    }
    return true;
  }

  static isValidTarget(
    target: GamePlayer | undefined | null,
    gameId: string
  ): target is GamePlayer {
    return Boolean(
      target &&
        target.gameId === gameId &&
        PlayerController.isPlayerAlive(target)
    );
  }

  static async eliminatePlayer(
    db: Queryable,
    gameId: string,
    playerId: string,
    round: number,
    phase: GamePhase,
    reason: string
  ): Promise<void> {
    await db.query(
      `UPDATE game_players
       SET is_alive = FALSE, eliminated_at = NOW()
       WHERE id = $1 AND game_id = $2 AND is_alive = TRUE`,
      [playerId, gameId]
    );

    await PlayerController.recordEvent(
      db,
      gameId,
      round,
      phase,
      EVENT_TYPES.PLAYER_ELIMINATED,
      null,
      playerId,
      { reason }
    );
  }

  static async recordEvent(
    db: Queryable,
    gameId: string,
    round: number,
    phase: GamePhase,
    eventType: EventType,
    playerId: string | null = null,
    targetPlayerId: string | null = null,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    await db.query(
      `INSERT INTO game_events (game_id, round, phase, event_type, player_id, target_player_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        gameId,
        round,
        phase,
        eventType,
        playerId,
        targetPlayerId,
        JSON.stringify(metadata)
      ]
    );
  }
}
