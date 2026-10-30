import type { Pool, PoolClient } from "pg";

import { EVENT_TYPES, GAME_PHASES, GAME_STATUS, TEAMS, type Team } from "../constants/gameConstants";

import type { GamePlayer, GameRoleAssignment } from "../types/gameTypes";

import { PlayerController } from "./PlayerController";
import { RoleController } from "./RoleController";

type Queryable = Pool | PoolClient;

export interface WinCheckResult {
  hasWinner: boolean;
  winnerTeam: Team | null;
  winnerReason: string | null;
  livingMafiaCount: number;
  livingTownCount: number;
}

export class WinConditionController {
  static checkWinCondition(
    players: GamePlayer[],
    rolesByPlayerId: Map<string, GameRoleAssignment>
  ): WinCheckResult {
    const livingMafia = RoleController.getLivingMafia(players, rolesByPlayerId);
    const livingTown = RoleController.getLivingTown(players, rolesByPlayerId);

    if (livingMafia.length === 0) {
      return {
        hasWinner: true,
        winnerTeam: TEAMS.TOWN,
        winnerReason: "All Mafia members were eliminated.",
        livingMafiaCount: 0,
        livingTownCount: livingTown.length
      };
    }

    if (livingMafia.length >= livingTown.length) {
      return {
        hasWinner: true,
        winnerTeam: TEAMS.MAFIA,
        winnerReason: "The Mafia controlled the town.",
        livingMafiaCount: livingMafia.length,
        livingTownCount: livingTown.length
      };
    }

    return {
      hasWinner: false,
      winnerTeam: null,
      winnerReason: null,
      livingMafiaCount: livingMafia.length,
      livingTownCount: livingTown.length
    };
  }

  static async declareWinner(
    db: Queryable,
    gameId: string,
    round: number,
    winnerTeam: Team,
    winnerReason: string
  ): Promise<void> {
    await db.query(
      `UPDATE games
       SET status = $1,
           current_phase = $2,
           winner_team = $3,
           winner_reason = $4,
           phase_started_at = NOW(),
           phase_ends_at = NULL,
           is_runoff = FALSE,
           runoff_candidates = '[]'::jsonb,
           updated_at = NOW()
       WHERE id = $5`,
      [
        GAME_STATUS.COMPLETED,
        GAME_PHASES.GAME_OVER,
        winnerTeam,
        winnerReason,
        gameId
      ]
    );

    await PlayerController.recordEvent(
      db,
      gameId,
      round,
      GAME_PHASES.GAME_OVER,
      EVENT_TYPES.WINNER_DECLARED,
      null,
      null,
      { winnerTeam, winnerReason }
    );

    await PlayerController.recordEvent(
      db,
      gameId,
      round,
      GAME_PHASES.GAME_OVER,
      EVENT_TYPES.GAME_ENDED,
      null,
      null,
      { winnerTeam, winnerReason }
    );
  }
}
