import { randomInt } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { ROLE_CONFIGS } from "../config/gameConfig";
import { ACTION_STATUS, ACTION_TYPES, EVENT_TYPES, GAME_PHASES, GAME_STATUS, INVESTIGATION_RESULTS, MAFIA_TIE_RULES, ROLES, TEAMS, type ActionType } from "../constants/gameConstants";

import type { Game, GamePlayer, GameRoleAssignment, NightAction } from "../types/gameTypes";

import { ERROR_MESSAGES, GameError } from "../utils/errors";
import { PlayerController } from "./PlayerController";

type Queryable = Pool | PoolClient;

export interface NightResolutionOutcome {
  eliminatedPlayer: GamePlayer | null;
  savedByDoctor: boolean;
  morningMessage: string;
}

export class NightController {
  static async getRoundActions(
    db: Queryable,
    gameId: string,
    round: number
  ): Promise<NightAction[]> {
    const res = await db.query(
      `SELECT
         id,
         game_id,
         round,
         actor_player_id,
         target_player_id,
         action_type,
         status,
         result,
         created_at,
         resolved_at
       FROM night_actions
       WHERE game_id = $1 AND round = $2
       ORDER BY created_at ASC`,
      [gameId, round]
    );

    return res.rows.map((row) => ({
      id: row.id,
      gameId: row.game_id,
      round: Number(row.round),
      actorPlayerId: row.actor_player_id,
      targetPlayerId: row.target_player_id,
      actionType: row.action_type as ActionType,
      status: row.status,
      result: row.result ?? null,
      createdAt: new Date(row.created_at).toISOString(),
      resolvedAt: row.resolved_at
        ? new Date(row.resolved_at).toISOString()
        : null
    }));
  }

  static async getDetectiveInvestigations(
    db: Queryable,
    gameId: string,
    detectivePlayerId: string,
    playersById: Map<string, GamePlayer>
  ) {
    const res = await db.query(
      `SELECT round, target_player_id, result
       FROM night_actions
       WHERE game_id = $1
         AND actor_player_id = $2
         AND action_type = $3
         AND result IS NOT NULL
       ORDER BY round DESC`,
      [gameId, detectivePlayerId, ACTION_TYPES.INVESTIGATE]
    );

    return res.rows.map((row) => {
      const target = playersById.get(row.target_player_id);
      return {
        round: Number(row.round),
        targetPlayerId: row.target_player_id,
        targetUsername: target?.username ?? "Unknown",
        result:
          row.result === INVESTIGATION_RESULTS.MAFIA
            ? INVESTIGATION_RESULTS.MAFIA
            : INVESTIGATION_RESULTS.NOT_MAFIA
      };
    });
  }

  static async submitNightAction(
    db: Queryable,
    game: Game,
    actorPlayer: GamePlayer | undefined,
    actorRole: GameRoleAssignment | undefined,
    targetPlayerId: string,
    players: GamePlayer[],
    rolesByPlayerId: Map<string, GameRoleAssignment>
  ): Promise<NightAction> {
    if (
      game.status === GAME_STATUS.COMPLETED ||
      game.currentPhase === GAME_PHASES.GAME_OVER
    ) {
      throw new GameError(ERROR_MESSAGES.GAME_ALREADY_ENDED, 400);
    }

    if (game.currentPhase !== GAME_PHASES.NIGHT) {
      throw new GameError(ERROR_MESSAGES.NIGHT_ENDED, 400);
    }

    if (!actorPlayer || actorPlayer.gameId !== game.id) {
      throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
    }

    if (!PlayerController.isPlayerAlive(actorPlayer)) {
      throw new GameError(ERROR_MESSAGES.PLAYER_DEAD, 403);
    }

    if (!actorRole) {
      throw new GameError(ERROR_MESSAGES.ACTION_UNAVAILABLE, 403);
    }

    const roleConfig = ROLE_CONFIGS[actorRole.roleKey];
    if (!roleConfig || !roleConfig.actionType) {
      throw new GameError(ERROR_MESSAGES.ACTION_UNAVAILABLE, 403);
    }

    const targetPlayer = players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer || targetPlayer.gameId !== game.id) {
      throw new GameError(ERROR_MESSAGES.TARGET_NOT_FOUND, 400);
    }

    if (!PlayerController.isPlayerAlive(targetPlayer)) {
      throw new GameError(ERROR_MESSAGES.TARGET_DEAD, 400);
    }

    const existing = await db.query(
      `SELECT id FROM night_actions
       WHERE game_id = $1 AND round = $2 AND actor_player_id = $3`,
      [game.id, game.currentRound, actorPlayer.id]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      throw new GameError(ERROR_MESSAGES.DUPLICATE_ACTION, 409);
    }

    if (actorRole.roleKey === ROLES.MAFIA) {
      if (targetPlayer.id === actorPlayer.id) {
        throw new GameError(ERROR_MESSAGES.TARGET_NOT_FOUND, 400);
      }
    }

    if (actorRole.roleKey === ROLES.DOCTOR) {
      if (
        !game.settings.allowDoctorSelfSave && targetPlayer.id === actorPlayer.id
      ) {
        throw new GameError(ERROR_MESSAGES.DOCTOR_NO_SELF_SAVE, 400);
      }

      if (
        !game.settings.allowRepeatedDoctorSave && actorPlayer.lastProtectedPlayerId && actorPlayer.lastProtectedPlayerId === targetPlayer.id
      ) {
        throw new GameError(ERROR_MESSAGES.DOCTOR_NO_REPEAT_SAVE, 400);
      }
    }

    let actionResult: string | null = null;
    if (actorRole.roleKey === ROLES.DETECTIVE) {
      if (targetPlayer.id === actorPlayer.id) {
        throw new GameError(ERROR_MESSAGES.TARGET_NOT_FOUND, 400);
      }
      const targetRole = rolesByPlayerId.get(targetPlayer.id);
      actionResult =
        targetRole?.team === TEAMS.MAFIA
          ? INVESTIGATION_RESULTS.MAFIA
          : INVESTIGATION_RESULTS.NOT_MAFIA;
    }

    const insertRes = await db.query(
      `INSERT INTO night_actions (
         game_id,
         round,
         actor_player_id,
         target_player_id,
         action_type,
         status,
         result
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        game.id,
        game.currentRound,
        actorPlayer.id,
        targetPlayer.id,
        roleConfig.actionType,
        ACTION_STATUS.SUBMITTED,
        actionResult
      ]
    );

    await PlayerController.recordEvent(
      db,
      game.id,
      game.currentRound,
      GAME_PHASES.NIGHT,
      EVENT_TYPES.NIGHT_ACTION_SUBMITTED,
      actorPlayer.id,
      targetPlayer.id,
      { actionType: roleConfig.actionType }
    );

    if (actorRole.roleKey === ROLES.DETECTIVE && actionResult) {
      await PlayerController.recordEvent(
        db,
        game.id,
        game.currentRound,
        GAME_PHASES.NIGHT,
        EVENT_TYPES.INVESTIGATION_COMPLETED,
        actorPlayer.id,
        targetPlayer.id,
        { result: actionResult }
      );
    }

    return {
      id: insertRes.rows[0].id,
      gameId: game.id,
      round: game.currentRound,
      actorPlayerId: actorPlayer.id,
      targetPlayerId: targetPlayer.id,
      actionType: roleConfig.actionType,
      status: ACTION_STATUS.SUBMITTED,
      result: actionResult,
      createdAt: new Date(insertRes.rows[0].created_at).toISOString(),
      resolvedAt: null
    };
  }

  static async haveAllNightActorsSubmitted(
    db: Queryable,
    game: Game,
    players: GamePlayer[],
    rolesByPlayerId: Map<string, GameRoleAssignment>
  ): Promise<boolean> {
    const livingActors = PlayerController.getLivingPlayers(players).filter(
      (player) => {
        const assignment = rolesByPlayerId.get(player.id);
        if (!assignment) return false;
        return Boolean(ROLE_CONFIGS[assignment.roleKey]?.actionType);
      }
    );

    if (livingActors.length === 0) {
      return true;
    }

    const actions = await NightController.getRoundActions(
      db,
      game.id,
      game.currentRound
    );
    const actedIds = new Set(actions.map((a) => a.actorPlayerId));

    return livingActors.every((actor) => actedIds.has(actor.id));
  }

  static async resolveNight(
    db: Queryable,
    game: Game,
    players: GamePlayer[],
    rolesByPlayerId: Map<string, GameRoleAssignment>
  ): Promise<NightResolutionOutcome> {
    const livingPlayersById = new Map<string, GamePlayer>();
    for (const player of PlayerController.getLivingPlayers(players)) {
      livingPlayersById.set(player.id, player);
    }

    const actions = await NightController.getRoundActions(
      db,
      game.id,
      game.currentRound
    );

    // Keep actions from living players only
    const validActions = actions.filter((action) => {
      const actor = livingPlayersById.get(action.actorPlayerId);
      const target = livingPlayersById.get(action.targetPlayerId);
      return Boolean(actor && target);
    });

    const protectedPlayerIds = new Set<string>();
    for (const action of validActions) {
      const actorRole = rolesByPlayerId.get(action.actorPlayerId);
      if (
        actorRole?.roleKey === ROLES.DOCTOR && action.actionType === ACTION_TYPES.PROTECT
      ) {
        protectedPlayerIds.add(action.targetPlayerId);
        await db.query(
          `UPDATE game_players
           SET last_protected_player_id = $1
           WHERE id = $2 AND game_id = $3`,
          [action.targetPlayerId, action.actorPlayerId, game.id]
        );
      }
    }

    const mafiaActions = validActions.filter((action) => {
      const actorRole = rolesByPlayerId.get(action.actorPlayerId);
      return (
        actorRole?.roleKey === ROLES.MAFIA &&
        action.actionType === ACTION_TYPES.ELIMINATE
      );
    });

    let chosenMafiaTargetId: string | null = null;
    if (mafiaActions.length > 0) {
      const counts = new Map<string, { count: number; firstIndex: number }>();
      mafiaActions.forEach((action, index) => {
        const current = counts.get(action.targetPlayerId);
        if (current) {
          current.count += 1;
        } else {
          counts.set(action.targetPlayerId, { count: 1, firstIndex: index });
        }
      });

      let maxVotes = 0;
      for (const entry of counts.values()) {
        if (entry.count > maxVotes) {
          maxVotes = entry.count;
        }
      }

      const tiedTargets: Array<{ targetId: string; firstIndex: number }> = [];
      for (const [targetId, entry] of counts.entries()) {
        if (entry.count === maxVotes) {
          tiedTargets.push({ targetId, firstIndex: entry.firstIndex });
        }
      }

      if (tiedTargets.length === 1) {
        chosenMafiaTargetId = tiedTargets[0].targetId;
      } else if (tiedTargets.length > 1) {
        if (game.settings.mafiaTieRule === MAFIA_TIE_RULES.FIRST_SUBMITTED) {
          tiedTargets.sort((a, b) => a.firstIndex - b.firstIndex);
          chosenMafiaTargetId = tiedTargets[0].targetId;
        } else if (game.settings.mafiaTieRule === MAFIA_TIE_RULES.NO_KILL) {
          chosenMafiaTargetId = null;
        } else {
          const randomChoice = tiedTargets[randomInt(tiedTargets.length)];
          chosenMafiaTargetId = randomChoice.targetId;
        }
      }
    }

    for (const action of validActions) {
      const actorRole = rolesByPlayerId.get(action.actorPlayerId);
      if (
        actorRole?.roleKey === ROLES.DETECTIVE &&
        action.actionType === ACTION_TYPES.INVESTIGATE &&
        !action.result
      ) {
        const targetRole = rolesByPlayerId.get(action.targetPlayerId);
        const result =
          targetRole?.team === TEAMS.MAFIA
            ? INVESTIGATION_RESULTS.MAFIA
            : INVESTIGATION_RESULTS.NOT_MAFIA;
        await db.query(
          `UPDATE night_actions SET result = $1 WHERE id = $2`,
          [result, action.id]
        );
      }
    }

    let eliminatedPlayer: GamePlayer | null = null;
    let savedByDoctor = false;

    if (chosenMafiaTargetId) {
      if (protectedPlayerIds.has(chosenMafiaTargetId)) {
        savedByDoctor = true;
        await PlayerController.recordEvent(
          db,
          game.id,
          game.currentRound,
          GAME_PHASES.NIGHT,
          EVENT_TYPES.PLAYER_SAVED,
          null,
          chosenMafiaTargetId,
          { round: game.currentRound }
        );
      } else {
        const victim = livingPlayersById.get(chosenMafiaTargetId) ?? null;
        if (victim) {
          eliminatedPlayer = victim;
          await PlayerController.eliminatePlayer(
            db,
            game.id,
            victim.id,
            game.currentRound,
            GAME_PHASES.MORNING,
            "Eliminated during the night"
          );
        }
      }
    }

    await db.query(
      `UPDATE night_actions
       SET status = $1, resolved_at = NOW()
       WHERE game_id = $2 AND round = $3`,
      [ACTION_STATUS.RESOLVED, game.id, game.currentRound]
    );

    const morningMessage = eliminatedPlayer
      ? `${eliminatedPlayer.username} was eliminated during the night.`
      : "Nobody was eliminated during the night.";

    await PlayerController.recordEvent(
      db,
      game.id,
      game.currentRound,
      GAME_PHASES.MORNING,
      EVENT_TYPES.NIGHT_RESOLVED,
      null,
      eliminatedPlayer?.id ?? null,
      {
        eliminatedUsername: eliminatedPlayer?.username ?? null,
        morningMessage
      }
    );

    return {
      eliminatedPlayer,
      savedByDoctor,
      morningMessage
    };
  }
}
