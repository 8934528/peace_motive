import type { Pool, PoolClient } from "pg";

import { MAX_PLAYERS, MIN_PLAYERS, ROLE_DISTRIBUTION } from "../config/gameConfig";
import { EVENT_TYPES, GAME_PHASES, ROLES, TEAMS, type RoleKey, type Team } from "../constants/gameConstants";

import type { GamePlayer, GameRoleAssignment } from "../types/gameTypes";

import { shuffleArray } from "../utils/codeGenerator";
import { ERROR_MESSAGES, GameError } from "../utils/errors";
import { PlayerController } from "./PlayerController";

type Queryable = Pool | PoolClient;

export class RoleController {
  static getRoleKeysForPlayerCount(playerCount: number): RoleKey[] {
    if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
      throw new GameError(ERROR_MESSAGES.NOT_ENOUGH_PLAYERS, 400);
    }

    const distribution = ROLE_DISTRIBUTION[playerCount];
    if (!distribution) {
      const mafiaCount = Math.max(1, Math.floor(playerCount / 3));
      const roles: RoleKey[] = [];
      for (let i = 0; i < mafiaCount; i++) roles.push(ROLES.MAFIA);
      roles.push(ROLES.DETECTIVE);
      roles.push(ROLES.DOCTOR);
      while (roles.length < playerCount) {
        roles.push(ROLES.VILLAGER);
      }
      return roles.slice(0, playerCount);
    }

    const roleKeys: RoleKey[] = [];
    for (let i = 0; i < distribution[ROLES.MAFIA]; i++) {
      roleKeys.push(ROLES.MAFIA);
    }
    for (let i = 0; i < distribution[ROLES.DETECTIVE]; i++) {
      roleKeys.push(ROLES.DETECTIVE);
    }
    for (let i = 0; i < distribution[ROLES.DOCTOR]; i++) {
      roleKeys.push(ROLES.DOCTOR);
    }
    for (let i = 0; i < distribution[ROLES.VILLAGER]; i++) {
      roleKeys.push(ROLES.VILLAGER);
    }

    return roleKeys;
  }

  static async assignRolesForGame(
    db: Queryable,
    gameId: string,
    players: GamePlayer[]
  ): Promise<Map<string, GameRoleAssignment>> {
    const livingPlayers = PlayerController.getLivingPlayers(players);
    if (livingPlayers.length < MIN_PLAYERS) {
      throw new GameError(ERROR_MESSAGES.NOT_ENOUGH_PLAYERS, 400);
    }

    await db.query(`DELETE FROM game_roles WHERE game_id = $1`, [gameId]);

    const rolesRes = await db.query(
      `SELECT id, key, name, team, description, ability, objective
       FROM roles
       WHERE enabled = TRUE`
    );

    const roleByKey = new Map<
      RoleKey,
      {
        id: number;
        key: RoleKey;
        name: string;
        team: Team;
        description: string;
        ability: string;
        objective: string;
      }
    >();

    for (const row of rolesRes.rows) {
      roleByKey.set(row.key as RoleKey, {
        id: Number(row.id),
        key: row.key as RoleKey,
        name: row.name,
        team: row.team as Team,
        description: row.description,
        ability: row.ability,
        objective: row.objective
      });
    }

    const rolePool = shuffleArray(
      RoleController.getRoleKeysForPlayerCount(livingPlayers.length)
    );
    const shuffledPlayers = shuffleArray(livingPlayers);

    const assignments = new Map<string, GameRoleAssignment>();

    for (let i = 0; i < shuffledPlayers.length; i++) {
      const player = shuffledPlayers[i];
      const roleKey = rolePool[i];
      const roleRow = roleByKey.get(roleKey);
      if (!roleRow) {
        throw new GameError(ERROR_MESSAGES.SERVER_ERROR, 500);
      }

      const insertRes = await db.query(
        `INSERT INTO game_roles (game_id, player_id, role_id)
         VALUES ($1, $2, $3)
         RETURNING id, assigned_at`,
        [gameId, player.id, roleRow.id]
      );

      const assignment: GameRoleAssignment = {
        id: insertRes.rows[0].id,
        gameId,
        playerId: player.id,
        roleId: roleRow.id,
        roleKey: roleRow.key,
        roleName: roleRow.name,
        team: roleRow.team,
        description: roleRow.description,
        ability: roleRow.ability,
        objective: roleRow.objective,
        assignedAt: new Date(insertRes.rows[0].assigned_at).toISOString()
      };

      assignments.set(player.id, assignment);

      await PlayerController.recordEvent(
        db,
        gameId,
        1,
        GAME_PHASES.ROLE_REVEAL,
        EVENT_TYPES.ROLE_ASSIGNED,
        player.id,
        null,
        { roleKey: roleRow.key, team: roleRow.team }
      );
    }

    return assignments;
  }

  static async getGameRoleAssignments(
    db: Queryable,
    gameId: string
  ): Promise<Map<string, GameRoleAssignment>> {
    const res = await db.query(
      `SELECT
         gr.id,
         gr.game_id,
         gr.player_id,
         gr.role_id,
         gr.assigned_at,
         r.key AS role_key,
         r.name AS role_name,
         r.team,
         r.description,
         r.ability,
         r.objective
       FROM game_roles gr
       INNER JOIN roles r ON r.id = gr.role_id
       WHERE gr.game_id = $1`,
      [gameId]
    );

    const map = new Map<string, GameRoleAssignment>();
    for (const row of res.rows) {
      map.set(row.player_id, {
        id: row.id,
        gameId: row.game_id,
        playerId: row.player_id,
        roleId: Number(row.role_id),
        roleKey: row.role_key as RoleKey,
        roleName: row.role_name,
        team: row.team as Team,
        description: row.description,
        ability: row.ability,
        objective: row.objective,
        assignedAt: new Date(row.assigned_at).toISOString()
      });
    }
    return map;
  }

  static getLivingMafia(
    players: GamePlayer[],
    rolesByPlayerId: Map<string, GameRoleAssignment>
  ): GamePlayer[] {
    return PlayerController.getLivingPlayers(players).filter(
      (player) => rolesByPlayerId.get(player.id)?.team === TEAMS.MAFIA
    );
  }

  static getLivingTown(
    players: GamePlayer[],
    rolesByPlayerId: Map<string, GameRoleAssignment>
  ): GamePlayer[] {
    return PlayerController.getLivingPlayers(players).filter(
      (player) => rolesByPlayerId.get(player.id)?.team === TEAMS.TOWN
    );
  }
}
