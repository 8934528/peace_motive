import type { Pool, PoolClient } from "pg";

import { z } from "zod";
import { DEFAULT_GAME_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, type GameSettings } from "../config/gameConfig";
import { EVENT_TYPES, GAME_PHASES, GAME_STATUS, MAFIA_TIE_RULES, TIE_RULES, type GamePhase, type GameStatus, type Team } from "../constants/gameConstants";
import { withTransaction } from "../database";

import type { Game, GameJoinCode, User } from "../types/gameTypes";

import { generateGameCode, generatePlayerInviteCode } from "../utils/codeGenerator";
import { ERROR_MESSAGES, GameError } from "../utils/errors";
import { sanitizeGameName } from "../utils/security";
import { PlayerController } from "./PlayerController";
import { RoleController } from "./RoleController";
import { WinConditionController } from "./WinConditionController";

type Queryable = Pool | PoolClient;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const settingsSchema = z.object({
  minPlayers: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS).optional(),
  maxPlayers: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS).optional(),
  roleRevealTime: z.number().int().min(4).max(60).optional(),
  nightTime: z.number().int().min(10).max(180).optional(),
  morningTime: z.number().int().min(4).max(60).optional(),
  discussionTime: z.number().int().min(10).max(300).optional(),
  votingTime: z.number().int().min(10).max(180).optional(),
  voteResultTime: z.number().int().min(4).max(60).optional(),
  allowDoctorSelfSave: z.boolean().optional(),
  allowRepeatedDoctorSave: z.boolean().optional(),
  tieRule: z.enum([TIE_RULES.RUNOFF, TIE_RULES.NO_ELIMINATION]).optional(),
  mafiaTieRule: z
    .enum([
      MAFIA_TIE_RULES.RANDOM,
      MAFIA_TIE_RULES.FIRST_SUBMITTED,
      MAFIA_TIE_RULES.NO_KILL
    ])
    .optional(),
  revealVotesAfterPhase: z.boolean().optional(),
  deadCanSpectate: z.boolean().optional(),
  autoAdvanceWhenAllActed: z.boolean().optional()
});

export class LobbyController {
  static mapRowToGame(row: Record<string, unknown>): Game {
    const rawSettings =
      typeof row.settings === "object" && row.settings !== null
        ? (row.settings as Partial<GameSettings>)
        : {};

    const rawRunoff = Array.isArray(row.runoff_candidates)
      ? (row.runoff_candidates as string[])
      : [];

    const rawJoinCodes = Array.isArray(row.join_codes)
      ? (row.join_codes as GameJoinCode[])
      : [];

    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name ?? "Motive Match"),
      hostId: String(row.host_id),
      status: row.status as GameStatus,
      currentPhase: row.current_phase as GamePhase,
      currentRound: Number(row.current_round ?? 0),
      isRunoff: Boolean(row.is_runoff),
      runoffCandidates: rawRunoff.map(String),
      settings: {
        ...DEFAULT_GAME_SETTINGS,
        ...rawSettings
      },
      joinCodes: rawJoinCodes,
      pausedRemainingSeconds:
        row.paused_remaining_seconds !== null && row.paused_remaining_seconds !== undefined
          ? Number(row.paused_remaining_seconds)
          : null,
      winnerTeam: (row.winner_team as Team) ?? null,
      winnerReason: row.winner_reason ? String(row.winner_reason) : null,
      lastMorningMessage: row.last_morning_message
        ? String(row.last_morning_message)
        : null,
      lastVoteMessage: row.last_vote_message
        ? String(row.last_vote_message)
        : null,
      phaseStartedAt: row.phase_started_at
        ? new Date(String(row.phase_started_at)).toISOString()
        : null,
      phaseEndsAt: row.phase_ends_at
        ? new Date(String(row.phase_ends_at)).toISOString()
        : null,
      deletedAt: row.deleted_at
        ? new Date(String(row.deleted_at)).toISOString()
        : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString()
    };
  }

  static async getGameByIdOrCode(
    db: Queryable,
    idOrCode: string,
    forUpdate = false
  ): Promise<Game> {
    const clean = idOrCode.trim();
    const isUuid = UUID_REGEX.test(clean);
    const lockClause = forUpdate ? "FOR UPDATE" : "";

    let res;
    if (isUuid) {
      res = await db.query(
        `SELECT *
         FROM games
         WHERE id = $1
           AND deleted_at IS NULL
         ${lockClause}`,
        [clean]
      );
    } else {
      const normalizedInvite = clean.toLowerCase();
      res = await db.query(
        `SELECT *
         FROM games
         WHERE (
           code = $1
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(COALESCE(join_codes, '[]'::jsonb)) elem
             WHERE LOWER(elem->>'code') = $2
           )
         )
         AND deleted_at IS NULL
         ${lockClause}`,
        [clean.toUpperCase(), normalizedInvite]
      );
    }

    if (!res.rowCount || !res.rows[0]) {
      throw new GameError(ERROR_MESSAGES.GAME_NOT_FOUND, 404, "GAME_NOT_FOUND");
    }

    return LobbyController.mapRowToGame(res.rows[0]);
  }

  static async createGame(params: {
    username: string;
    gameName?: string;
    sessionToken?: string | null;
    settings?: Partial<GameSettings>;
  }): Promise<{ game: Game; user: User }> {
    return withTransaction(async (client) => {
      const user = await PlayerController.getOrCreateUser(
        client,
        params.username,
        params.sessionToken
      );

      let code = generateGameCode(6);
      for (let attempts = 0; attempts < 15; attempts++) {
        const check = await client.query(
          `SELECT id FROM games WHERE code = $1`,
          [code]
        );
        if (!check.rowCount) break;
        code = generateGameCode(6);
      }

      const initialJoinCodes: GameJoinCode[] = [];
      for (let i = 0; i < 12; i++) {
        initialJoinCodes.push({
          code: generatePlayerInviteCode(),
          status: "AVAILABLE",
          usedByPlayerId: null,
          usedByUsername: null,
          createdAt: new Date().toISOString()
        });
      }

      const parsedSettings = settingsSchema.safeParse(params.settings ?? {});
      const mergedSettings: GameSettings = {
        ...DEFAULT_GAME_SETTINGS,
        ...(parsedSettings.success ? parsedSettings.data : {})
      };

      const cleanGameName = sanitizeGameName(
        params.gameName,
        `${user.username}'s Match`
      );

      const gameRes = await client.query(
        `INSERT INTO games (
           code,
           name,
           host_id,
           status,
           current_phase,
           current_round,
           settings,
           join_codes
         )
         VALUES ($1, $2, $3, $4, $5, 0, $6::jsonb, $7::jsonb)
         RETURNING *`,
        [
          code,
          cleanGameName,
          user.id,
          GAME_STATUS.LOBBY,
          GAME_PHASES.LOBBY,
          JSON.stringify(mergedSettings),
          JSON.stringify(initialJoinCodes)
        ]
      );

      const game = LobbyController.mapRowToGame(gameRes.rows[0]);

      const playerRes = await client.query(
        `INSERT INTO game_players (
           game_id,
           user_id,
           seat_number,
           is_alive,
           is_ready,
           is_connected
         )
         VALUES ($1, $2, 1, TRUE, TRUE, TRUE)
         RETURNING id`,
        [game.id, user.id]
      );

      const hostPlayerId = String(playerRes.rows[0].id);

      await PlayerController.recordEvent(
        client,
        game.id,
        0,
        GAME_PHASES.LOBBY,
        EVENT_TYPES.GAME_CREATED,
        hostPlayerId,
        null,
        { code: game.code, name: game.name }
      );

      await PlayerController.recordEvent(
        client,
        game.id,
        0,
        GAME_PHASES.LOBBY,
        EVENT_TYPES.PLAYER_JOINED,
        hostPlayerId,
        null,
        { username: user.username }
      );

      return { game, user };
    });
  }

  static async joinGame(params: {
    codeOrId: string;
    username: string;
    sessionToken?: string | null;
  }): Promise<{ game: Game; user: User }> {
    const cleanCodeOrId = params.codeOrId.trim();
    const isInviteCode = cleanCodeOrId.includes("-") || cleanCodeOrId.length >= 20;
    if (
      !UUID_REGEX.test(cleanCodeOrId) &&
      !/^[A-Z2-9]{6}$/i.test(cleanCodeOrId) &&
      !isInviteCode
    ) {
      throw new GameError(ERROR_MESSAGES.INVALID_CODE, 400, "INVALID_CODE");
    }

    return withTransaction(async (client) => {
      const user = await PlayerController.getOrCreateUser(
        client,
        params.username,
        params.sessionToken
      );

      const game = await LobbyController.getGameByIdOrCode(
        client,
        cleanCodeOrId,
        true
      );

      if (isInviteCode && game.joinCodes) {
        const norm = cleanCodeOrId.toLowerCase();
        const matched = game.joinCodes.find(
          (c) => c.code.toLowerCase() === norm
        );
        if (matched) {
          if (matched.status === "EXPIRED") {
            throw new GameError(ERROR_MESSAGES.INVITE_CODE_EXPIRED, 400);
          }
          if (
            matched.status === "USED" && matched.usedByUsername && matched.usedByUsername.toLowerCase() !== user.username.toLowerCase()
          ) {
            throw new GameError(ERROR_MESSAGES.INVITE_CODE_IN_USE, 400);
          }
        }
      }

      const existingMembership = await client.query(
        `SELECT id, left_at
         FROM game_players
         WHERE game_id = $1 AND user_id = $2`,
        [game.id, user.id]
      );

      if (existingMembership.rowCount && existingMembership.rows[0]) {
        const row = existingMembership.rows[0];
        if (!row.left_at) {
          await client.query(
            `UPDATE game_players
             SET is_connected = TRUE
             WHERE id = $1`,
            [row.id]
          );
          return { game, user };
        }

        if (game.status !== GAME_STATUS.LOBBY) {
          throw new GameError(ERROR_MESSAGES.GAME_ALREADY_STARTED, 400);
        }

        await client.query(`DELETE FROM game_players WHERE id = $1`, [row.id]);
      }

      if (game.status === GAME_STATUS.COMPLETED || game.status === GAME_STATUS.CANCELLED) {
        throw new GameError(ERROR_MESSAGES.GAME_ALREADY_ENDED, 400);
      }

      if (game.status !== GAME_STATUS.LOBBY) {
        throw new GameError(ERROR_MESSAGES.GAME_ALREADY_STARTED, 400);
      }

      const activePlayers = await PlayerController.getGamePlayers(
        client,
        game.id,
        game.hostId
      );

      if (activePlayers.length >= game.settings.maxPlayers) {
        throw new GameError(ERROR_MESSAGES.GAME_FULL, 400);
      }

      const nameTaken = activePlayers.some(
        (p) =>
          p.userId !== user.id &&
          p.username.toLowerCase() === user.username.toLowerCase()
      );
      if (nameTaken) {
        throw new GameError(ERROR_MESSAGES.DUPLICATE_NAME, 409);
      }

      const usedSeats = new Set(activePlayers.map((p) => p.seatNumber));
      let seatNumber = 1;
      while (usedSeats.has(seatNumber)) {
        seatNumber += 1;
      }

      const insertRes = await client.query(
        `INSERT INTO game_players (
           game_id,
           user_id,
           seat_number,
           is_alive,
           is_ready,
           is_connected
         )
         VALUES ($1, $2, $3, TRUE, TRUE, TRUE)
         RETURNING id`,
        [game.id, user.id, seatNumber]
      );

      const newPlayerId = String(insertRes.rows[0].id);

      if (isInviteCode && game.joinCodes) {
        const norm = cleanCodeOrId.toLowerCase();
        const updatedCodes = game.joinCodes.map((c) => {
          if (c.code.toLowerCase() === norm) {
            return {
              ...c,
              status: "USED" as const,
              usedByPlayerId: newPlayerId,
              usedByUsername: user.username
            };
          }
          return c;
        });

        await client.query(
          `UPDATE games SET join_codes = $1::jsonb WHERE id = $2`,
          [JSON.stringify(updatedCodes), game.id]
        );
      }

      await PlayerController.recordEvent(
        client,
        game.id,
        0,
        GAME_PHASES.LOBBY,
        EVENT_TYPES.PLAYER_JOINED,
        String(insertRes.rows[0].id),
        null,
        { username: user.username }
      );

      return { game, user };
    });
  }

  static async setPlayerReady(params: {
    gameIdOrCode: string;
    userId: string;
    isReady: boolean;
  }): Promise<Game> {
    return withTransaction(async (client) => {
      const game = await LobbyController.getGameByIdOrCode(
        client,
        params.gameIdOrCode,
        true
      );

      if (game.status !== GAME_STATUS.LOBBY) {
        throw new GameError(ERROR_MESSAGES.ACTION_UNAVAILABLE, 400);
      }

      const updateRes = await client.query(
        `UPDATE game_players
         SET is_ready = $1
         WHERE game_id = $2 AND user_id = $3 AND left_at IS NULL
         RETURNING id`,
        [params.isReady, game.id, params.userId]
      );

      if (!updateRes.rowCount) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      await PlayerController.recordEvent(
        client,
        game.id,
        0,
        GAME_PHASES.LOBBY,
        EVENT_TYPES.PLAYER_READY_CHANGED,
        String(updateRes.rows[0].id),
        null,
        { isReady: params.isReady }
      );

      return game;
    });
  }

  static async updateSettings(params: {
    gameIdOrCode: string;
    hostUserId: string;
    settings: Partial<GameSettings>;
    gameName?: string;
  }): Promise<Game> {
    return withTransaction(async (client) => {
      const game = await LobbyController.getGameByIdOrCode(
        client,
        params.gameIdOrCode,
        true
      );

      if (game.hostId !== params.hostUserId) {
        throw new GameError(ERROR_MESSAGES.UNAUTHORIZED_HOST, 403);
      }

      if (game.status !== GAME_STATUS.LOBBY) {
        throw new GameError(ERROR_MESSAGES.ACTION_UNAVAILABLE, 400);
      }

      const parsed = settingsSchema.safeParse(params.settings);
      if (!parsed.success) {
        throw new GameError(ERROR_MESSAGES.ACTION_UNAVAILABLE, 400);
      }

      const updatedSettings: GameSettings = {
        ...game.settings,
        ...parsed.data
      };

      if (updatedSettings.minPlayers > updatedSettings.maxPlayers) {
        updatedSettings.minPlayers = updatedSettings.maxPlayers;
      }

      const updatedName = params.gameName !== undefined
        ? sanitizeGameName(params.gameName, game.name)
        : game.name;

      const res = await client.query(
        `UPDATE games
         SET settings = $1::jsonb,
             name = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [JSON.stringify(updatedSettings), updatedName, game.id]
      );

      await PlayerController.recordEvent(
        client,
        game.id,
        0,
        GAME_PHASES.LOBBY,
        EVENT_TYPES.SETTINGS_UPDATED,
        null,
        null,
        { settings: updatedSettings }
      );

      return LobbyController.mapRowToGame(res.rows[0]);
    });
  }

  static async removePlayer(params: {
    gameIdOrCode: string;
    hostUserId: string;
    targetPlayerId: string;
  }): Promise<{ game: Game; removedUserId: string }> {
    return withTransaction(async (client) => {
      const game = await LobbyController.getGameByIdOrCode(
        client,
        params.gameIdOrCode,
        true
      );

      if (game.hostId !== params.hostUserId) {
        throw new GameError(ERROR_MESSAGES.UNAUTHORIZED_HOST, 403);
      }

      const players = await PlayerController.getGamePlayers(
        client,
        game.id,
        game.hostId
      );
      const target = players.find((p) => p.id === params.targetPlayerId);

      if (!target) {
        throw new GameError(ERROR_MESSAGES.TARGET_NOT_FOUND, 404);
      }

      if (target.userId === game.hostId) {
        throw new GameError(ERROR_MESSAGES.ACTION_UNAVAILABLE, 400);
      }

      if (game.status === GAME_STATUS.LOBBY) {
        await client.query(`DELETE FROM game_players WHERE id = $1`, [
          target.id
        ]);
      } else {
        await client.query(
          `UPDATE game_players
           SET left_at = NOW(), is_alive = FALSE, is_connected = FALSE, eliminated_at = COALESCE(eliminated_at, NOW())
           WHERE id = $1`,
          [target.id]
        );
      }

      if (game.joinCodes && game.joinCodes.length > 0) {
        const updatedCodes = game.joinCodes.map((c) => {
          if (
            c.usedByPlayerId === target.id ||
            (c.usedByUsername && c.usedByUsername.toLowerCase() === target.username.toLowerCase())
          ) {
            return { ...c, status: "EXPIRED" as const };
          }
          return c;
        });

        await client.query(
          `UPDATE games SET join_codes = $1::jsonb WHERE id = $2`,
          [JSON.stringify(updatedCodes), game.id]
        );
      }

      await PlayerController.recordEvent(
        client,
        game.id,
        game.currentRound,
        game.currentPhase,
        EVENT_TYPES.PLAYER_REMOVED,
        null,
        target.id,
        { username: target.username }
      );

      if (game.status === GAME_STATUS.IN_PROGRESS) {
        const remainingPlayers = await PlayerController.getGamePlayers(
          client,
          game.id,
          game.hostId
        );
        const roles = await RoleController.getGameRoleAssignments(
          client,
          game.id
        );
        const winCheck = WinConditionController.checkWinCondition(
          remainingPlayers,
          roles
        );
        if (winCheck.hasWinner && winCheck.winnerTeam && winCheck.winnerReason) {
          await WinConditionController.declareWinner(
            client,
            game.id,
            game.currentRound,
            winCheck.winnerTeam,
            winCheck.winnerReason
          );
        }
      }

      const updatedGame = await LobbyController.getGameByIdOrCode(
        client,
        game.id
      );
      return { game: updatedGame, removedUserId: target.userId };
    });
  }

  static async leaveGame(params: {
    gameIdOrCode: string;
    userId: string;
  }): Promise<{ game: Game | null }> {
    return withTransaction(async (client) => {
      const game = await LobbyController.getGameByIdOrCode(
        client,
        params.gameIdOrCode,
        true
      );

      const players = await PlayerController.getGamePlayers(
        client,
        game.id,
        game.hostId
      );
      const leavingPlayer = players.find((p) => p.userId === params.userId);

      if (!leavingPlayer) {
        return { game };
      }

      if (game.status === GAME_STATUS.LOBBY) {
        await client.query(`DELETE FROM game_players WHERE id = $1`, [
          leavingPlayer.id
        ]);
      } else {
        await client.query(
          `UPDATE game_players
           SET left_at = NOW(), is_alive = FALSE, is_connected = FALSE, eliminated_at = COALESCE(eliminated_at, NOW())
           WHERE id = $1`,
          [leavingPlayer.id]
        );
      }

      if (game.joinCodes && game.joinCodes.length > 0) {
        const updatedCodes = game.joinCodes.map((c) => {
          if (
            c.usedByPlayerId === leavingPlayer.id ||
            (c.usedByUsername && c.usedByUsername.toLowerCase() === leavingPlayer.username.toLowerCase())
          ) {
            return { ...c, status: "EXPIRED" as const };
          }
          return c;
        });

        await client.query(
          `UPDATE games SET join_codes = $1::jsonb WHERE id = $2`,
          [JSON.stringify(updatedCodes), game.id]
        );
      }

      await PlayerController.recordEvent(
        client,
        game.id,
        game.currentRound,
        game.currentPhase,
        EVENT_TYPES.PLAYER_LEFT,
        leavingPlayer.id,
        null,
        { username: leavingPlayer.username }
      );

      const remainingPlayers = await PlayerController.getGamePlayers(
        client,
        game.id,
        game.hostId
      );

      if (remainingPlayers.length === 0) {
        await client.query(
          `UPDATE games
           SET status = $1,
               current_phase = $2,
               phase_ends_at = NULL,
               deleted_at = NOW(),
               updated_at = NOW()
           WHERE id = $3`,
          [GAME_STATUS.CANCELLED, GAME_PHASES.GAME_OVER, game.id]
        );
        return { game: null };
      }

      let currentHostId = game.hostId;
      if (game.hostId === params.userId) {
        currentHostId = remainingPlayers[0].userId;
        await client.query(
          `UPDATE games SET host_id = $1, updated_at = NOW() WHERE id = $2`,
          [currentHostId, game.id]
        );
      }

      if (game.status === GAME_STATUS.IN_PROGRESS) {
        const roles = await RoleController.getGameRoleAssignments(
          client,
          game.id
        );
        const winCheck = WinConditionController.checkWinCondition(
          remainingPlayers,
          roles
        );
        if (winCheck.hasWinner && winCheck.winnerTeam && winCheck.winnerReason) {
          await WinConditionController.declareWinner(
            client,
            game.id,
            game.currentRound,
            winCheck.winnerTeam,
            winCheck.winnerReason
          );
        }
      }

      const updatedGame = await LobbyController.getGameByIdOrCode(
        client,
        game.id
      );
      return { game: updatedGame };
    });
  }

  static async deleteGame(params: {
    gameIdOrCode: string;
    hostUserId: string;
  }): Promise<{ gameId: string; code: string }> {
    return withTransaction(async (client) => {
      const game = await LobbyController.getGameByIdOrCode(
        client,
        params.gameIdOrCode,
        true
      );

      if (game.hostId !== params.hostUserId) {
        throw new GameError(ERROR_MESSAGES.UNAUTHORIZED_HOST, 403);
      }

      await client.query(
        `UPDATE games
         SET status = $1,
             current_phase = $2,
             phase_ends_at = NULL,
             deleted_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [GAME_STATUS.CANCELLED, GAME_PHASES.GAME_OVER, game.id]
      );

      await PlayerController.recordEvent(
        client,
        game.id,
        game.currentRound,
        game.currentPhase,
        EVENT_TYPES.GAME_DELETED,
        null,
        null,
        { code: game.code }
      );

      return { gameId: game.id, code: game.code };
    });
  }

  static async generateNewJoinCode(params: {
    gameIdOrCode: string;
    hostUserId: string;
  }): Promise<{ game: Game; code: string }> {
    return withTransaction(async (client) => {
      const game = await LobbyController.getGameByIdOrCode(
        client,
        params.gameIdOrCode,
        true
      );

      if (game.hostId !== params.hostUserId) {
        throw new GameError(ERROR_MESSAGES.UNAUTHORIZED_HOST, 403);
      }

      const newCodeStr = generatePlayerInviteCode();
      const updatedCodes: GameJoinCode[] = [
        ...(game.joinCodes ?? []),
        {
          code: newCodeStr,
          status: "AVAILABLE",
          usedByPlayerId: null,
          usedByUsername: null,
          createdAt: new Date().toISOString()
        }
      ];

      const res = await client.query(
        `UPDATE games
         SET join_codes = $1::jsonb,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(updatedCodes), game.id]
      );

      return {
        game: LobbyController.mapRowToGame(res.rows[0]),
        code: newCodeStr
      };
    });
  }

  static async pauseGame(params: {
    gameIdOrCode: string;
    hostUserId: string;
  }): Promise<Game> {
    return withTransaction(async (client) => {
      const game = await LobbyController.getGameByIdOrCode(
        client,
        params.gameIdOrCode,
        true
      );

      if (game.hostId !== params.hostUserId) {
        throw new GameError(ERROR_MESSAGES.UNAUTHORIZED_HOST, 403);
      }

      if (game.status !== GAME_STATUS.IN_PROGRESS) {
        throw new GameError(ERROR_MESSAGES.ACTION_UNAVAILABLE, 400);
      }

      let remainingSeconds = 30;
      if (game.phaseEndsAt) {
        const diffMs = new Date(game.phaseEndsAt).getTime() - Date.now();
        remainingSeconds = Math.max(1, Math.round(diffMs / 1000));
      }

      const res = await client.query(
        `UPDATE games
         SET status = $1,
             paused_remaining_seconds = $2,
             phase_ends_at = NULL,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [GAME_STATUS.PAUSED, remainingSeconds, game.id]
      );

      return LobbyController.mapRowToGame(res.rows[0]);
    });
  }

  static async resumeGame(params: {
    gameIdOrCode: string;
    hostUserId: string;
  }): Promise<Game> {
    return withTransaction(async (client) => {
      const game = await LobbyController.getGameByIdOrCode(
        client,
        params.gameIdOrCode,
        true
      );

      if (game.hostId !== params.hostUserId) {
        throw new GameError(ERROR_MESSAGES.UNAUTHORIZED_HOST, 403);
      }

      if (game.status !== GAME_STATUS.PAUSED) {
        throw new GameError(ERROR_MESSAGES.ACTION_UNAVAILABLE, 400);
      }

      const remainingSeconds = game.pausedRemainingSeconds ?? 30;
      const newEndsAt = new Date(Date.now() + remainingSeconds * 1000).toISOString();

      const res = await client.query(
        `UPDATE games
         SET status = $1,
             paused_remaining_seconds = NULL,
             phase_ends_at = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [GAME_STATUS.IN_PROGRESS, newEndsAt, game.id]
      );

      return LobbyController.mapRowToGame(res.rows[0]);
    });
  }
}
