import type { Pool, PoolClient } from "pg";

import { MIN_PLAYERS, ROLE_CONFIGS } from "../config/gameConfig";
import { ACTION_TYPES, EVENT_TYPES, GAME_PHASES, GAME_STATUS, ROLES, TEAMS, type EventType, type GamePhase } from "../constants/gameConstants";
import { database, withTransaction } from "../database";

import type { ClientGameState, Game, GamePlayer, GameResult, MafiaTeammateView, PublicPlayerView, VoteResultSummary } from "../types/gameTypes";

import { ERROR_MESSAGES, GameError } from "../utils/errors";
import { LobbyController } from "./LobbyController";
import { NightController } from "./NightController";
import { PhaseController } from "./PhaseController";
import { PlayerController } from "./PlayerController";
import { RoleController } from "./RoleController";
import { VotingController } from "./VotingController";

type Queryable = Pool | PoolClient;

export class GameController {
  static async startGame(params: {
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

      if (game.status !== GAME_STATUS.LOBBY) {
        throw new GameError(ERROR_MESSAGES.GAME_ALREADY_STARTED, 400);
      }

      const players = await PlayerController.getGamePlayers(
        client,
        game.id,
        game.hostId
      );

      const requiredMin = Math.max(MIN_PLAYERS, game.settings.minPlayers);
      if (players.length < requiredMin) {
        throw new GameError(ERROR_MESSAGES.NOT_ENOUGH_PLAYERS, 400);
      }

      await client.query(
        `UPDATE game_players
         SET is_alive = TRUE,
             eliminated_at = NULL,
             last_protected_player_id = NULL
         WHERE game_id = $1 AND left_at IS NULL`,
        [game.id]
      );

      const refreshedPlayers = await PlayerController.getGamePlayers(
        client,
        game.id,
        game.hostId
      );

      await RoleController.assignRolesForGame(
        client,
        game.id,
        refreshedPlayers
      );

      const now = new Date();
      const endsAt = new Date(
        now.getTime() + game.settings.roleRevealTime * 1000
      );

      const updateRes = await client.query(
        `UPDATE games
         SET status = $1,
             current_phase = $2,
             current_round = 1,
             is_runoff = FALSE,
             runoff_candidates = '[]'::jsonb,
             winner_team = NULL,
             winner_reason = NULL,
             last_morning_message = NULL,
             last_vote_message = NULL,
             phase_started_at = $3,
             phase_ends_at = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          GAME_STATUS.IN_PROGRESS,
          GAME_PHASES.ROLE_REVEAL,
          now.toISOString(),
          endsAt.toISOString(),
          game.id
        ]
      );

      await PlayerController.recordEvent(
        client,
        game.id,
        1,
        GAME_PHASES.ROLE_REVEAL,
        EVENT_TYPES.GAME_STARTED,
        null,
        null,
        { playerCount: refreshedPlayers.length }
      );

      await PlayerController.recordEvent(
        client,
        game.id,
        1,
        GAME_PHASES.ROLE_REVEAL,
        EVENT_TYPES.PHASE_STARTED,
        null,
        null,
        {
          phase: GAME_PHASES.ROLE_REVEAL,
          round: 1,
          durationSeconds: game.settings.roleRevealTime
        }
      );

      return LobbyController.mapRowToGame(updateRes.rows[0]);
    });
  }

  static async submitNightAction(params: {
    gameIdOrCode: string;
    userId: string;
    targetPlayerId: string;
  }): Promise<{ game: Game; allSubmitted: boolean }> {
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
      const actorPlayer = players.find((p) => p.userId === params.userId);
      const rolesByPlayerId = await RoleController.getGameRoleAssignments(
        client,
        game.id
      );
      const actorRole = actorPlayer
        ? rolesByPlayerId.get(actorPlayer.id)
        : undefined;

      await NightController.submitNightAction(
        client,
        game,
        actorPlayer,
        actorRole,
        params.targetPlayerId,
        players,
        rolesByPlayerId
      );

      const allSubmitted = await NightController.haveAllNightActorsSubmitted(
        client,
        game,
        players,
        rolesByPlayerId
      );

      if (allSubmitted && game.settings.autoAdvanceWhenAllActed) {
        await PhaseController.advancePhaseInTransaction(client, game);
      }

      const updatedGame = await LobbyController.getGameByIdOrCode(
        client,
        game.id
      );
      return { game: updatedGame, allSubmitted };
    });
  }

  static async submitVote(params: {
    gameIdOrCode: string;
    userId: string;
    targetPlayerId: string | null;
  }): Promise<{ game: Game; allSubmitted: boolean }> {
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
      const voterPlayer = players.find((p) => p.userId === params.userId);

      await VotingController.submitVote(
        client,
        game,
        voterPlayer,
        params.targetPlayerId,
        players
      );

      const allSubmitted = await VotingController.haveAllVotersSubmitted(
        client,
        game,
        players
      );

      if (allSubmitted && game.settings.autoAdvanceWhenAllActed) {
        await PhaseController.advancePhaseInTransaction(client, game);
      }

      const updatedGame = await LobbyController.getGameByIdOrCode(
        client,
        game.id
      );
      return { game: updatedGame, allSubmitted };
    });
  }

  static async endGame(params: {
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

      if (
        game.status === GAME_STATUS.COMPLETED ||
        game.currentPhase === GAME_PHASES.GAME_OVER
      ) {
        throw new GameError(ERROR_MESSAGES.GAME_ALREADY_ENDED, 400);
      }

      const res = await client.query(
        `UPDATE games
         SET status = $1,
             current_phase = $2,
             winner_team = NULL,
             winner_reason = 'The host ended the game.',
             phase_started_at = NOW(),
             phase_ends_at = NULL,
             is_runoff = FALSE,
             runoff_candidates = '[]'::jsonb,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [GAME_STATUS.COMPLETED, GAME_PHASES.GAME_OVER, game.id]
      );

      await PlayerController.recordEvent(
        client,
        game.id,
        game.currentRound,
        GAME_PHASES.GAME_OVER,
        EVENT_TYPES.GAME_ENDED,
        null,
        null,
        { reason: "The host ended the game." }
      );

      return LobbyController.mapRowToGame(res.rows[0]);
    });
  }

  static async restartGame(params: {
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

      await client.query(`DELETE FROM game_roles WHERE game_id = $1`, [
        game.id
      ]);
      await client.query(`DELETE FROM night_actions WHERE game_id = $1`, [
        game.id
      ]);
      await client.query(`DELETE FROM votes WHERE game_id = $1`, [game.id]);

      await client.query(
        `UPDATE game_players
         SET is_alive = TRUE,
             is_ready = TRUE,
             eliminated_at = NULL,
             last_protected_player_id = NULL
         WHERE game_id = $1 AND left_at IS NULL`,
        [game.id]
      );

      const res = await client.query(
        `UPDATE games
         SET status = $1,
             current_phase = $2,
             current_round = 0,
             is_runoff = FALSE,
             runoff_candidates = '[]'::jsonb,
             winner_team = NULL,
             winner_reason = NULL,
             last_morning_message = NULL,
             last_vote_message = NULL,
             phase_started_at = NULL,
             phase_ends_at = NULL,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [GAME_STATUS.LOBBY, GAME_PHASES.LOBBY, game.id]
      );

      await PlayerController.recordEvent(
        client,
        game.id,
        0,
        GAME_PHASES.LOBBY,
        EVENT_TYPES.GAME_RESTARTED,
        null,
        null,
        { restartedBy: params.hostUserId }
      );

      return LobbyController.mapRowToGame(res.rows[0]);
    });
  }

  static async advancePhase(gameId: string): Promise<Game | null> {
    return withTransaction(async (client) => {
      try {
        const game = await LobbyController.getGameByIdOrCode(
          client,
          gameId,
          true
        );
        await PhaseController.advancePhaseInTransaction(client, game);
        return await LobbyController.getGameByIdOrCode(client, gameId);
      } catch {
        return null;
      }
    });
  }

  static formatPublicEventMessage(
    eventType: EventType,
    round: number,
    metadata: Record<string, unknown>,
    playerName: string | null,
    targetName: string | null
  ): string | null {
    switch (eventType) {
      case EVENT_TYPES.GAME_CREATED:
        return "Game room created.";
      case EVENT_TYPES.PLAYER_JOINED:
        return `${playerName ?? String(metadata.username ?? "A player")} joined the game.`;
      case EVENT_TYPES.PLAYER_LEFT:
        return `${playerName ?? String(metadata.username ?? "A player")} left the game.`;
      case EVENT_TYPES.PLAYER_REMOVED:
        return `${targetName ?? String(metadata.username ?? "A player")} was removed by the host.`;
      case EVENT_TYPES.GAME_STARTED:
        return "The game has started. Roles were assigned.";
      case EVENT_TYPES.PHASE_STARTED: {
        const phase = String(metadata.phase ?? "");
        if (phase === GAME_PHASES.NIGHT) return `Night ${round} began.`;
        if (phase === GAME_PHASES.DAY_VOTING) {
          return metadata.isRunoff ? `Day ${round} runoff voting began.` : `Day ${round} voting began.`;
        }
        return null;
      }
      case EVENT_TYPES.DAY_STARTED:
        return `Day ${round} discussion began.`;
      case EVENT_TYPES.NIGHT_RESOLVED:
        return String(
          metadata.morningMessage ?? "Night ended."
        );
      case EVENT_TYPES.VOTE_RESOLVED:
        return String(metadata.message ?? "Voting ended.");
      case EVENT_TYPES.RUNOFF_STARTED:
        return `Tie vote! Runoff started between ${String(metadata.candidateNames ?? "tied players")}.`;
      case EVENT_TYPES.WINNER_DECLARED:
        return `${String(metadata.winnerTeam ?? "")} wins! ${String(metadata.winnerReason ?? "")}`;
      case EVENT_TYPES.GAME_RESTARTED:
        return "The host restarted the game.";
      case EVENT_TYPES.GAME_ENDED:
        return String(metadata.reason ?? "The game ended.");
      default:

        return null;
    }
  }

  static async getFilteredGameState(
    idOrCode: string,
    userId?: string | null,
    db: Queryable = database
  ): Promise<ClientGameState> {
    const game = await LobbyController.getGameByIdOrCode(db, idOrCode);
    const players = await PlayerController.getGamePlayers(
      db,
      game.id,
      game.hostId
    );
    const playersById = new Map<string, GamePlayer>();
    for (const p of players) {
      playersById.set(p.id, p);
    }

    const currentPlayer = userId ? (players.find((p) => p.userId === userId) ?? null) : null;

    const rolesByPlayerId = await RoleController.getGameRoleAssignments(
      db,
      game.id
    );

    const currentRoleAssignment = currentPlayer ? (rolesByPlayerId.get(currentPlayer.id) ?? null) : null;

    const isGameOver = game.status === GAME_STATUS.COMPLETED || game.currentPhase === GAME_PHASES.GAME_OVER;

    const currentVotes = game.currentPhase === GAME_PHASES.DAY_VOTING || game.currentPhase === GAME_PHASES.VOTE_RESULT ? await VotingController.getRoundVotes(
            db,
            game.id,
            game.currentRound,
            game.isRunoff
          )
        : [];
    const votedPlayerIds = new Set(currentVotes.map((v) => v.voterPlayerId));

    const publicPlayers: PublicPlayerView[] = players.map((p) => {
      const roleAssign = rolesByPlayerId.get(p.id);
      return {
        id: p.id,
        userId: p.userId,
        username: p.username,
        seatNumber: p.seatNumber,
        isAlive: p.isAlive,
        isReady: p.isReady,
        isConnected: p.isConnected,
        isHost: p.isHost,
        hasVoted:
          game.currentPhase === GAME_PHASES.DAY_VOTING
            ? votedPlayerIds.has(p.id)
            : undefined,
        // Reveal all roles only when the game is over
        revealedRole:
          isGameOver && roleAssign
            ? {
                key: roleAssign.roleKey,
                name: roleAssign.roleName,
                team: roleAssign.team
              }
            : undefined
      };
    });

    let submittedActionTargetId: string | null = null;
    let submittedActionType = null;
    const mafiaTeammates: MafiaTeammateView[] = [];
    const restrictedTargetIds: string[] = [];
    let canActTonight = false;

    if (currentPlayer && currentRoleAssignment) {
      const roundActions =
        game.currentRound > 0
          ? await NightController.getRoundActions(
              db,
              game.id,
              game.currentRound
            )
          : [];

      const myAction = roundActions.find(
        (a) => a.actorPlayerId === currentPlayer.id
      );
      if (myAction) {
        submittedActionTargetId = myAction.targetPlayerId;
        submittedActionType = myAction.actionType;
      }

      // Let Mafia players see their teammates and targets
      if (currentRoleAssignment.team === TEAMS.MAFIA) {
        const mafiaActionByActor = new Map<string, string>();
        for (const action of roundActions) {
          if (action.actionType === ACTION_TYPES.ELIMINATE) {
            mafiaActionByActor.set(action.actorPlayerId, action.targetPlayerId);
          }
        }

        for (const p of players) {
          const r = rolesByPlayerId.get(p.id);
          if (r?.team === TEAMS.MAFIA) {
            mafiaTeammates.push({
              playerId: p.id,
              username: p.username,
              isAlive: p.isAlive,
              selectedTargetId: mafiaActionByActor.get(p.id) ?? null
            });
          }
        }
      }

      const roleCfg = ROLE_CONFIGS[currentRoleAssignment.roleKey];
      if (
        game.currentPhase === GAME_PHASES.NIGHT &&
        currentPlayer.isAlive &&
        roleCfg?.actionType &&
        !myAction
      ) {
        canActTonight = true;
      }

      if (currentRoleAssignment.roleKey === ROLES.MAFIA || currentRoleAssignment.roleKey === ROLES.DETECTIVE) {
        restrictedTargetIds.push(currentPlayer.id);
      } else if (currentRoleAssignment.roleKey === ROLES.DOCTOR) {
        if (!game.settings.allowDoctorSelfSave) {
          restrictedTargetIds.push(currentPlayer.id);
        }
        if (
          !game.settings.allowRepeatedDoctorSave &&
          currentPlayer.lastProtectedPlayerId
        ) {
          restrictedTargetIds.push(currentPlayer.lastProtectedPlayerId);
        }
      }
    }

    const investigations =
      currentPlayer && currentRoleAssignment?.roleKey === ROLES.DETECTIVE
        ? await NightController.getDetectiveInvestigations(
            db,
            game.id,
            currentPlayer.id,
            playersById
          )
        : [];

    const myVote = currentPlayer
      ? currentVotes.find((v) => v.voterPlayerId === currentPlayer.id)
      : undefined;

    const canVoteToday = Boolean(
      game.currentPhase === GAME_PHASES.DAY_VOTING &&
        currentPlayer &&
        currentPlayer.isAlive &&
        !myVote
    );

    let voteSummary: VoteResultSummary | null = null;
    if (
      game.currentPhase === GAME_PHASES.VOTE_RESULT ||
      (game.currentPhase === GAME_PHASES.DAY_VOTING && game.isRunoff)
    ) {
      const voteEventRes = await db.query(
        `SELECT metadata
         FROM game_events
         WHERE game_id = $1
           AND round = $2
           AND event_type = $3
         ORDER BY created_at DESC
         LIMIT 1`,
        [game.id, game.currentRound, EVENT_TYPES.VOTE_RESOLVED]
      );
      if (voteEventRes.rowCount && voteEventRes.rows[0]?.metadata) {
        voteSummary = voteEventRes.rows[0].metadata as VoteResultSummary;
      }
    }

    let gameResult: GameResult | null = null;
    if (isGameOver) {
      gameResult = {
        winnerTeam: game.winnerTeam ?? TEAMS.TOWN,
        winnerReason: game.winnerReason ?? "Game ended.",
        finalRoles: players.map((p) => {
          const r = rolesByPlayerId.get(p.id);
          return {
            playerId: p.id,
            username: p.username,
            isAlive: p.isAlive,
            roleKey: r?.roleKey ?? ROLES.VILLAGER,
            roleName: r?.roleName ?? "Villager",
            team: r?.team ?? TEAMS.TOWN
          };
        })
      };
    }

    const eventsRes = await db.query(
      `SELECT id, round, phase, event_type, player_id, target_player_id, metadata, created_at
       FROM game_events
       WHERE game_id = $1
       ORDER BY created_at DESC
       LIMIT 40`,
      [game.id]
    );

    const publicEvents: ClientGameState["events"] = [];
    for (const row of eventsRes.rows) {
      const eventType = row.event_type as EventType;
      const metadata = (row.metadata as Record<string, unknown>) ?? {};
      const actorName = row.player_id
        ? (playersById.get(row.player_id)?.username ?? null)
        : null;
      const targetName = row.target_player_id
        ? (playersById.get(row.target_player_id)?.username ?? null)
        : null;
      const message = GameController.formatPublicEventMessage(
        eventType,
        Number(row.round),
        metadata,
        actorName,
        targetName
      );
      if (message) {
        publicEvents.push({
          id: String(row.id),
          round: Number(row.round),
          phase: row.phase as GamePhase,
          eventType,
          message,
          createdAt: new Date(String(row.created_at)).toISOString()
        });
      }
    }

    return {
      game: {
        id: game.id,
        code: game.code,
        name: game.name,
        hostId: game.hostId,
        status: game.status,
        phase: game.currentPhase,
        round: game.currentRound,
        isRunoff: game.isRunoff,
        runoffCandidates: game.runoffCandidates,
        settings: game.settings,
        joinCodes: game.joinCodes ?? [],
        pausedRemainingSeconds: game.pausedRemainingSeconds ?? null,
        winnerTeam: game.winnerTeam,
        winnerReason: game.winnerReason,
        lastMorningMessage: game.lastMorningMessage,
        lastVoteMessage: game.lastVoteMessage,
        phaseStartedAt: game.phaseStartedAt,
        phaseEndsAt: game.phaseEndsAt,
        serverTime: new Date().toISOString()
      },
      currentPlayer: currentPlayer
        ? {
            id: currentPlayer.id,
            userId: currentPlayer.userId,
            username: currentPlayer.username,
            seatNumber: currentPlayer.seatNumber,
            isAlive: currentPlayer.isAlive,
            isReady: currentPlayer.isReady,
            isHost: currentPlayer.isHost
          }
        : null,
      players: publicPlayers,
      role: currentRoleAssignment
        ? {
            key: currentRoleAssignment.roleKey,
            name: currentRoleAssignment.roleName,
            team: currentRoleAssignment.team,
            description: currentRoleAssignment.description,
            ability: currentRoleAssignment.ability,
            objective: currentRoleAssignment.objective
          }
        : null,
      privateState: {
        mafiaTeammates,
        submittedActionTargetId,
        submittedActionType,
        canActTonight,
        restrictedTargetIds,
        investigations,
        submittedVoteTargetId: myVote
          ? (myVote.targetPlayerId ?? "NOBODY")
          : null,
        hasSubmittedVote: Boolean(myVote),
        canVoteToday
      },
      voteSummary,
      gameResult,
      events: publicEvents
    };
  }
}
