import type { Server, Socket } from "socket.io";
import { GameController } from "../controllers/GameController";
import { LobbyController } from "../controllers/LobbyController";
import { PlayerController } from "../controllers/PlayerController";
import { database } from "../database";
import { gameEngine } from "../services/GameEngineService";
import type { ServiceResult } from "../types/gameTypes";
import { ERROR_MESSAGES, GameError, toUserErrorMessage } from "../utils/errors";
import { checkSocketRateLimit } from "../utils/security";

function reply<T>(
  callback: ((result: ServiceResult<T>) => void) | undefined,
  result: ServiceResult<T>
): void {
  if (typeof callback === "function") {
    callback(result);
  }
}

export function registerSocketHandlers(_io: Server, socket: Socket): void {
  socket.use(([event, ..._args], next) => {
    if (!checkSocketRateLimit(socket.id)) {
      return next(new Error("Too many requests. Please slow down."));
    }
    next();
  });
  socket.on("game:create", async (payload: unknown, callback) => {
    try {
      const body = (payload ?? {}) as Record<string, unknown>;
      const { game, user } = await LobbyController.createGame({
        username: String(body.username ?? body.playerName ?? ""),
        gameName: typeof body.gameName === "string" ? body.gameName : undefined,
        sessionToken:
          typeof body.sessionToken === "string" ? body.sessionToken : null,
        settings:
          typeof body.settings === "object" && body.settings !== null
            ? (body.settings as Record<string, unknown>)
            : undefined
      });

      gameEngine.registerSocketSession({
        socketId: socket.id,
        userId: user.id,
        sessionToken: user.sessionToken,
        gameId: game.id,
        gameCode: game.code
      });

      const state = await GameController.getFilteredGameState(
        game.id,
        user.id
      );

      reply(callback, {
        ok: true,
        message: "Game created",
        data: { user, state }
      });

      await gameEngine.broadcastGameState(game.id);
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:join", async (payload: unknown, callback) => {
    try {
      const body = (payload ?? {}) as Record<string, unknown>;
      const { game, user } = await LobbyController.joinGame({
        codeOrId: String(body.code ?? body.gameId ?? ""),
        username: String(body.username ?? body.playerName ?? ""),
        sessionToken:
          typeof body.sessionToken === "string" ? body.sessionToken : null
      });

      gameEngine.registerSocketSession({
        socketId: socket.id,
        userId: user.id,
        sessionToken: user.sessionToken,
        gameId: game.id,
        gameCode: game.code
      });

      const state = await GameController.getFilteredGameState(
        game.id,
        user.id
      );

      reply(callback, {
        ok: true,
        message: "You joined the game.",
        data: { user, state }
      });

      await gameEngine.broadcastGameState(game.id);
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:reconnect", async (payload: unknown, callback) => {
    try {
      const body = (payload ?? {}) as Record<string, unknown>;
      const sessionToken =
        typeof body.sessionToken === "string" ? body.sessionToken : null;
      const userId = typeof body.userId === "string" ? body.userId : null;
      const gameCodeOrId = String(body.gameCode ?? body.gameId ?? "").trim();

      if (!gameCodeOrId) {
        throw new GameError(ERROR_MESSAGES.GAME_NOT_FOUND, 404);
      }

      const user = await PlayerController.getUserBySession(
        database,
        sessionToken,
        userId
      );
      if (!user) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const game = await LobbyController.getGameByIdOrCode(
        database,
        gameCodeOrId
      );

      const playerRes = await database.query(
        `UPDATE game_players
         SET is_connected = TRUE
         WHERE game_id = $1 AND user_id = $2 AND left_at IS NULL
         RETURNING id`,
        [game.id, user.id]
      );

      if (!playerRes.rowCount) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      gameEngine.registerSocketSession({
        socketId: socket.id,
        userId: user.id,
        sessionToken: user.sessionToken,
        gameId: game.id,
        gameCode: game.code
      });

      const state = await GameController.getFilteredGameState(
        game.id,
        user.id
      );

      reply(callback, {
        ok: true,
        data: { user, state }
      });

      await gameEngine.broadcastGameState(game.id);
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:ready", async (payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const body = (payload ?? {}) as Record<string, unknown>;
      await LobbyController.setPlayerReady({
        gameIdOrCode: session.gameId,
        userId: session.userId,
        isReady: Boolean(body.isReady)
      });

      await gameEngine.broadcastGameState(session.gameId);
      const state = await GameController.getFilteredGameState(
        session.gameId,
        session.userId
      );
      reply(callback, { ok: true, data: state });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:settings", async (payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const body = (payload ?? {}) as Record<string, unknown>;
      await LobbyController.updateSettings({
        gameIdOrCode: session.gameId,
        hostUserId: session.userId,
        settings:
          typeof body.settings === "object" && body.settings !== null
            ? (body.settings as Record<string, unknown>)
            : {},
        gameName: typeof body.gameName === "string" ? body.gameName : undefined
      });

      await gameEngine.broadcastGameState(session.gameId);
      const state = await GameController.getFilteredGameState(
        session.gameId,
        session.userId
      );
      reply(callback, {
        ok: true,
        message: "Settings saved.",
        data: state
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:remove_player", async (payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const body = (payload ?? {}) as Record<string, unknown>;
      const { game, removedUserId } = await LobbyController.removePlayer({
        gameIdOrCode: session.gameId,
        hostUserId: session.userId,
        targetPlayerId: String(body.targetPlayerId ?? "")
      });

      gameEngine.notifyPlayerRemoved(game.id, removedUserId);
      await gameEngine.broadcastGameState(game.id);
      const state = await GameController.getFilteredGameState(
        game.id,
        session.userId
      );
      reply(callback, {
        ok: true,
        message: "Player removed.",
        data: state
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:start", async (_payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const game = await GameController.startGame({
        gameIdOrCode: session.gameId,
        hostUserId: session.userId
      });

      gameEngine.schedulePhaseTimer(game.id, game.phaseEndsAt);
      await gameEngine.broadcastGameState(game.id);
      const state = await GameController.getFilteredGameState(
        game.id,
        session.userId
      );

      reply(callback, {
        ok: true,
        message: "Game started.",
        data: state
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:action", async (payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const body = (payload ?? {}) as Record<string, unknown>;
      const { game } = await GameController.submitNightAction({
        gameIdOrCode: session.gameId,
        userId: session.userId,
        targetPlayerId: String(body.targetPlayerId ?? "")
      });

      gameEngine.schedulePhaseTimer(game.id, game.phaseEndsAt);
      await gameEngine.broadcastGameState(game.id);
      const state = await GameController.getFilteredGameState(
        game.id,
        session.userId
      );

      reply(callback, {
        ok: true,
        message: "Action submitted.",
        data: state
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:vote", async (payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const body = (payload ?? {}) as Record<string, unknown>;
      const rawTarget = body.targetPlayerId;
      const targetPlayerId =
        typeof rawTarget === "string" && rawTarget.length > 0
          ? rawTarget
          : null;

      const { game } = await GameController.submitVote({
        gameIdOrCode: session.gameId,
        userId: session.userId,
        targetPlayerId
      });

      gameEngine.schedulePhaseTimer(game.id, game.phaseEndsAt);
      await gameEngine.broadcastGameState(game.id);
      const state = await GameController.getFilteredGameState(
        game.id,
        session.userId
      );

      reply(callback, {
        ok: true,
        message: "Vote submitted.",
        data: state
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:end", async (_payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const game = await GameController.endGame({
        gameIdOrCode: session.gameId,
        hostUserId: session.userId
      });

      gameEngine.schedulePhaseTimer(game.id, null);
      await gameEngine.broadcastGameState(game.id);
      const state = await GameController.getFilteredGameState(
        game.id,
        session.userId
      );

      reply(callback, {
        ok: true,
        message: "Game ended.",
        data: state
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:pause", async (_payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const game = await LobbyController.pauseGame({
        gameIdOrCode: session.gameId,
        hostUserId: session.userId
      });

      await gameEngine.broadcastGameState(game.id);
      const state = await GameController.getFilteredGameState(
        game.id,
        session.userId
      );

      reply(callback, {
        ok: true,
        message: "Game paused",
        data: state
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:resume", async (_payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const game = await LobbyController.resumeGame({
        gameIdOrCode: session.gameId,
        hostUserId: session.userId
      });

      gameEngine.schedulePhaseTimer(game.id, game.phaseEndsAt);
      await gameEngine.broadcastGameState(game.id);
      const state = await GameController.getFilteredGameState(
        game.id,
        session.userId
      );

      reply(callback, {
        ok: true,
        message: "Game resumed",
        data: state
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:generate_code", async (_payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const { game, code } = await LobbyController.generateNewJoinCode({
        gameIdOrCode: session.gameId,
        hostUserId: session.userId
      });

      await gameEngine.broadcastGameState(game.id);
      const state = await GameController.getFilteredGameState(
        game.id,
        session.userId
      );

      reply(callback, {
        ok: true,
        message: "New invite code generated",
        data: { code, state }
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:restart", async (_payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const game = await GameController.restartGame({
        gameIdOrCode: session.gameId,
        hostUserId: session.userId
      });

      gameEngine.schedulePhaseTimer(game.id, null);
      await gameEngine.broadcastGameState(game.id);
      const state = await GameController.getFilteredGameState(
        game.id,
        session.userId
      );

      reply(callback, {
        ok: true,
        message: "Game restarted.",
        data: state
      });
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:leave", async (_payload: unknown, callback) => {
    try {
      const session = gameEngine.removeSocketSession(socket.id);
      if (!session) {
        reply(callback, { ok: true, message: "You left the game." });
        return;
      }

      const { game } = await LobbyController.leaveGame({
        gameIdOrCode: session.gameId,
        userId: session.userId
      });

      reply(callback, { ok: true, message: "You left the game." });

      if (game) {
        await gameEngine.broadcastGameState(game.id);
      }
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("game:delete", async (_payload: unknown, callback) => {
    try {
      const session = gameEngine.getSocketSession(socket.id);
      if (!session) {
        throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
      }

      const { gameId } = await LobbyController.deleteGame({
        gameIdOrCode: session.gameId,
        hostUserId: session.userId
      });

      reply(callback, { ok: true, message: "Game deleted." });
      gameEngine.notifyGameDeleted(gameId);
    } catch (error) {
      const err = toUserErrorMessage(error);
      reply(callback, { ok: false, message: err.message });
    }
  });

  socket.on("disconnect", async () => {
    const session = gameEngine.removeSocketSession(socket.id);
    if (!session) return;

    try {
      await database.query(
        `UPDATE game_players
         SET is_connected = FALSE
         WHERE game_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [session.gameId, session.userId]
      );
      await gameEngine.broadcastGameState(session.gameId);
    } catch {
      return;
    }
  });
}

