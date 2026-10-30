import { Router, type Request, type Response } from "express";
import { GameController } from "../controllers/GameController";
import { LobbyController } from "../controllers/LobbyController";
import { PlayerController } from "../controllers/PlayerController";
import { database } from "../database";
import { gameEngine } from "../services/GameEngineService";
import { ERROR_MESSAGES, GameError, toUserErrorMessage } from "../utils/errors";
import { isValidUUID, sanitizeGameName, sanitizeUsername } from "../utils/security";

export const gameRouter = Router();

function extractAuth(req: Request): {
  sessionToken: string | null;
  userId: string | null;
} {
  const headerToken = req.header("x-session-token");
  const headerUserId = req.header("x-user-id");
  const body = (req.body ?? {}) as Record<string, unknown>;
  const query = req.query as Record<string, unknown>;

  const sessionToken =
    typeof headerToken === "string" && headerToken
      ? headerToken
      : typeof body.sessionToken === "string"
        ? body.sessionToken
        : typeof query.sessionToken === "string"
          ? query.sessionToken
          : null;

  const userId =
    typeof headerUserId === "string" && headerUserId
      ? headerUserId
      : typeof body.userId === "string"
        ? body.userId
        : typeof query.userId === "string"
          ? query.userId
          : null;

  return { sessionToken, userId };
}

async function resolveUserId(req: Request): Promise<string> {
  const { sessionToken, userId } = extractAuth(req);
  const user = await PlayerController.getUserBySession(
    database,
    sessionToken,
    userId
  );
  if (!user) {
    throw new Error(ERROR_MESSAGES.UNAUTHORIZED_PLAYER);
  }
  return user.id;
}

gameRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { username, gameName, sessionToken, settings } = req.body ?? {};
    const cleanUsername = sanitizeUsername(username);
    const cleanGameName = gameName !== undefined ? sanitizeGameName(gameName) : undefined;

    const { game, user } = await LobbyController.createGame({
      username: cleanUsername,
      gameName: cleanGameName,
      sessionToken: typeof sessionToken === "string" ? sessionToken : null,
      settings
    });

    const state = await GameController.getFilteredGameState(game.id, user.id);
    res.status(201).json({
      ok: true,
      message: "Game created.",
      data: {
        user,
        state
      }
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/join", async (req: Request, res: Response) => {
  try {
    const { username, sessionToken } = req.body ?? {};
    const cleanUsername = sanitizeUsername(username);

    const { game, user } = await LobbyController.joinGame({
      codeOrId: String(req.params.id),
      username: cleanUsername,
      sessionToken: typeof sessionToken === "string" ? sessionToken : null
    });

    const state = await GameController.getFilteredGameState(game.id, user.id);
    await gameEngine.broadcastGameState(game.id);

    res.json({
      ok: true,
      message: "You joined the game.",
      data: {
        user,
        state
      }
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/ready", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const { isReady } = req.body ?? {};
    const game = await LobbyController.setPlayerReady({
      gameIdOrCode: String(req.params.id),
      userId,
      isReady: Boolean(isReady)
    });

    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/settings", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const { settings, gameName } = req.body ?? {};
    const game = await LobbyController.updateSettings({
      gameIdOrCode: String(req.params.id),
      hostUserId: userId,
      settings: settings ?? {},
      gameName: typeof gameName === "string" ? gameName : undefined
    });

    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "Settings saved.",
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/remove-player", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const { targetPlayerId } = req.body ?? {};
    const { game, removedUserId } = await LobbyController.removePlayer({
      gameIdOrCode: String(req.params.id),
      hostUserId: userId,
      targetPlayerId: String(targetPlayerId ?? "")
    });

    gameEngine.notifyPlayerRemoved(game.id, removedUserId);
    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "Player removed.",
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/start", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const game = await GameController.startGame({
      gameIdOrCode: String(req.params.id),
      hostUserId: userId
    });

    gameEngine.schedulePhaseTimer(game.id, game.phaseEndsAt);
    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "Game started.",
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/leave", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const { game } = await LobbyController.leaveGame({
      gameIdOrCode: String(req.params.id),
      userId
    });

    if (game) {
      await gameEngine.broadcastGameState(game.id);
    }

    res.json({
      ok: true,
      message: "You left the game."
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/actions", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const { targetPlayerId } = req.body ?? {};
    if (!targetPlayerId || !isValidUUID(String(targetPlayerId))) {
      throw new GameError("Invalid target player ID.", 400);
    }
    const { game } = await GameController.submitNightAction({
      gameIdOrCode: String(req.params.id),
      userId,
      targetPlayerId: String(targetPlayerId)
    });

    gameEngine.schedulePhaseTimer(game.id, game.phaseEndsAt);
    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "Action submitted.",
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/votes", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const { targetPlayerId } = req.body ?? {};
    const validTarget =
      typeof targetPlayerId === "string" && isValidUUID(targetPlayerId)
        ? targetPlayerId
        : null;

    const { game } = await GameController.submitVote({
      gameIdOrCode: String(req.params.id),
      userId,
      targetPlayerId: validTarget
    });

    gameEngine.schedulePhaseTimer(game.id, game.phaseEndsAt);
    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "Vote submitted.",
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/end", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const game = await GameController.endGame({
      gameIdOrCode: String(req.params.id),
      hostUserId: userId
    });

    gameEngine.schedulePhaseTimer(game.id, null);
    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "Game ended.",
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/restart", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const game = await GameController.restartGame({
      gameIdOrCode: String(req.params.id),
      hostUserId: userId
    });

    gameEngine.schedulePhaseTimer(game.id, null);
    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "Game restarted.",
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const { gameId } = await LobbyController.deleteGame({
      gameIdOrCode: String(req.params.id),
      hostUserId: userId
    });

    gameEngine.notifyGameDeleted(gameId);

    res.json({
      ok: true,
      message: "Game deleted."
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { sessionToken, userId } = extractAuth(req);
    const user = await PlayerController.getUserBySession(
      database,
      sessionToken,
      userId
    );
    const state = await GameController.getFilteredGameState(
      String(req.params.id),
      user?.id ?? null
    );
    res.json({
      ok: true,
      data: state.game
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.get("/:id/players", async (req: Request, res: Response) => {
  try {
    const { sessionToken, userId } = extractAuth(req);
    const user = await PlayerController.getUserBySession(
      database,
      sessionToken,
      userId
    );
    const state = await GameController.getFilteredGameState(
      String(req.params.id),
      user?.id ?? null
    );
    res.json({
      ok: true,
      data: state.players
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/pause", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const game = await LobbyController.pauseGame({
      gameIdOrCode: String(req.params.id),
      hostUserId: userId
    });

    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "Game paused",
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/resume", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const game = await LobbyController.resumeGame({
      gameIdOrCode: String(req.params.id),
      hostUserId: userId
    });

    gameEngine.schedulePhaseTimer(game.id, game.phaseEndsAt);
    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "Game resumed",
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.post("/:id/codes", async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserId(req);
    const { game, code } = await LobbyController.generateNewJoinCode({
      gameIdOrCode: String(req.params.id),
      hostUserId: userId
    });

    await gameEngine.broadcastGameState(game.id);
    const state = await GameController.getFilteredGameState(game.id, userId);

    res.json({
      ok: true,
      message: "New invite code generated",
      data: {
        code,
        state
      }
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});

gameRouter.get("/:id/state", async (req: Request, res: Response) => {
  try {
    const { sessionToken, userId } = extractAuth(req);
    const user = await PlayerController.getUserBySession(
      database,
      sessionToken,
      userId
    );
    const state = await GameController.getFilteredGameState(
      String(req.params.id),
      user?.id ?? null
    );
    res.json({
      ok: true,
      data: state
    });
  } catch (error) {
    const err = toUserErrorMessage(error);
    res.status(err.statusCode).json({ ok: false, message: err.message });
  }
});
