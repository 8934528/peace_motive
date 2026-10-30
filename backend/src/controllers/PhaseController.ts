import type { Pool, PoolClient } from "pg";

import { EVENT_TYPES, GAME_PHASES, GAME_STATUS, type GamePhase } from "../constants/gameConstants";

import type { Game } from "../types/gameTypes";

import { NightController } from "./NightController";
import { PlayerController } from "./PlayerController";
import { RoleController } from "./RoleController";
import { VotingController } from "./VotingController";
import { WinConditionController } from "./WinConditionController";

type Queryable = Pool | PoolClient;

export class PhaseController {
  static async setPhase(
    db: Queryable,
    gameId: string,
    phase: GamePhase,
    round: number,
    durationSeconds: number | null,
    extra: {
      isRunoff?: boolean;
      runoffCandidates?: string[];
      lastMorningMessage?: string | null;
      lastVoteMessage?: string | null;
    } = {}
  ): Promise<void> {
    const now = new Date();
    const endsAt =
      durationSeconds && durationSeconds > 0
        ? new Date(now.getTime() + durationSeconds * 1000).toISOString()
        : null;

    await db.query(
      `UPDATE games
       SET current_phase = $1,
           current_round = $2,
           phase_started_at = $3,
           phase_ends_at = $4,
           is_runoff = COALESCE($5, is_runoff),
           runoff_candidates = COALESCE($6::jsonb, runoff_candidates),
           last_morning_message = CASE WHEN $7::boolean THEN $8 ELSE last_morning_message END,
           last_vote_message = CASE WHEN $9::boolean THEN $10 ELSE last_vote_message END,
           updated_at = NOW()
       WHERE id = $11`,
      [
        phase,
        round,
        now.toISOString(),
        endsAt,
        extra.isRunoff ?? null,
        extra.runoffCandidates
          ? JSON.stringify(extra.runoffCandidates)
          : null,
        extra.lastMorningMessage !== undefined,
        extra.lastMorningMessage ?? null,
        extra.lastVoteMessage !== undefined,
        extra.lastVoteMessage ?? null,
        gameId
      ]
    );

    await PlayerController.recordEvent(
      db,
      gameId,
      round,
      phase,
      phase === GAME_PHASES.DAY_DISCUSSION
        ? EVENT_TYPES.DAY_STARTED
        : EVENT_TYPES.PHASE_STARTED,
      null,
      null,
      {
        phase,
        round,
        durationSeconds,
        isRunoff: extra.isRunoff ?? false
      }
    );
  }

  static async advancePhaseInTransaction(
    db: PoolClient,
    game: Game
  ): Promise<void> {
    if (
      game.status !== GAME_STATUS.IN_PROGRESS ||
      game.currentPhase === GAME_PHASES.GAME_OVER ||
      game.currentPhase === GAME_PHASES.LOBBY
    ) {
      return;
    }

    const players = await PlayerController.getGamePlayers(
      db,
      game.id,
      game.hostId
    );
    const rolesByPlayerId = await RoleController.getGameRoleAssignments(
      db,
      game.id
    );

    switch (game.currentPhase) {
      case GAME_PHASES.ROLE_REVEAL: {
        await PhaseController.setPhase(
          db,
          game.id,
          GAME_PHASES.NIGHT,
          1,
          game.settings.nightTime,
          {
            isRunoff: false,
            runoffCandidates: []
          }
        );
        break;
      }

      case GAME_PHASES.NIGHT: {
        const outcome = await NightController.resolveNight(
          db,
          game,
          players,
          rolesByPlayerId
        );

        const updatedPlayers = await PlayerController.getGamePlayers(
          db,
          game.id,
          game.hostId
        );
        const winCheck = WinConditionController.checkWinCondition(
          updatedPlayers,
          rolesByPlayerId
        );

        if (winCheck.hasWinner && winCheck.winnerTeam && winCheck.winnerReason) {
          await db.query(
            `UPDATE games SET last_morning_message = $1 WHERE id = $2`,
            [outcome.morningMessage, game.id]
          );
          await WinConditionController.declareWinner(
            db,
            game.id,
            game.currentRound,
            winCheck.winnerTeam,
            winCheck.winnerReason
          );
          return;
        }

        await PhaseController.setPhase(
          db,
          game.id,
          GAME_PHASES.MORNING,
          game.currentRound,
          game.settings.morningTime,
          {
            lastMorningMessage: outcome.morningMessage
          }
        );
        break;
      }

      case GAME_PHASES.MORNING: {
        await PhaseController.setPhase(
          db,
          game.id,
          GAME_PHASES.DAY_DISCUSSION,
          game.currentRound,
          game.settings.discussionTime,
          {
            isRunoff: false,
            runoffCandidates: []
          }
        );
        break;
      }

      case GAME_PHASES.DAY_DISCUSSION: {
        await PhaseController.setPhase(
          db,
          game.id,
          GAME_PHASES.DAY_VOTING,
          game.currentRound,
          game.settings.votingTime,
          {
            isRunoff: false,
            runoffCandidates: []
          }
        );
        break;
      }

      case GAME_PHASES.DAY_VOTING: {
        const voteSummary = await VotingController.resolveVotes(
          db,
          game,
          players
        );

        if (voteSummary.runoffStarted) {
          await PhaseController.setPhase(
            db,
            game.id,
            GAME_PHASES.DAY_VOTING,
            game.currentRound,
            game.settings.votingTime,
            {
              isRunoff: true,
              runoffCandidates: voteSummary.runoffCandidates,
              lastVoteMessage: voteSummary.message
            }
          );
          return;
        }

        const updatedPlayers = await PlayerController.getGamePlayers(
          db,
          game.id,
          game.hostId
        );
        const winCheck = WinConditionController.checkWinCondition(
          updatedPlayers,
          rolesByPlayerId
        );

        if (winCheck.hasWinner && winCheck.winnerTeam && winCheck.winnerReason) {
          await db.query(
            `UPDATE games SET last_vote_message = $1 WHERE id = $2`,
            [voteSummary.message, game.id]
          );
          await WinConditionController.declareWinner(
            db,
            game.id,
            game.currentRound,
            winCheck.winnerTeam,
            winCheck.winnerReason
          );
          return;
        }

        await PhaseController.setPhase(
          db,
          game.id,
          GAME_PHASES.VOTE_RESULT,
          game.currentRound,
          game.settings.voteResultTime,
          {
            isRunoff: false,
            runoffCandidates: [],
            lastVoteMessage: voteSummary.message
          }
        );
        break;
      }

      case GAME_PHASES.VOTE_RESULT: {
        const nextRound = game.currentRound + 1;
        await PhaseController.setPhase(
          db,
          game.id,
          GAME_PHASES.NIGHT,
          nextRound,
          game.settings.nightTime,
          {
            isRunoff: false,
            runoffCandidates: []
          }
        );
        break;
      }

      default:
        break;
    }
  }
}
