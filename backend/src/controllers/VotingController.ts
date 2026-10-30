import type { Pool, PoolClient } from "pg";

import { EVENT_TYPES, GAME_PHASES, GAME_STATUS, TIE_RULES, VOTE_TYPES, type VoteType } from "../constants/gameConstants";

import type { Game, GamePlayer, Vote, VoteResultSummary } from "../types/gameTypes";

import { ERROR_MESSAGES, GameError } from "../utils/errors";
import { PlayerController } from "./PlayerController";

type Queryable = Pool | PoolClient;

export class VotingController {
  static async getRoundVotes(
    db: Queryable,
    gameId: string,
    round: number,
    isRunoff: boolean
  ): Promise<Vote[]> {
    const res = await db.query(
      `SELECT
         id,
         game_id,
         round,
         is_runoff,
         voter_player_id,
         target_player_id,
         vote_type,
         created_at
       FROM votes
       WHERE game_id = $1 AND round = $2 AND is_runoff = $3
       ORDER BY created_at ASC`,
      [gameId, round, isRunoff]
    );

    return res.rows.map((row) => ({
      id: row.id,
      gameId: row.game_id,
      round: Number(row.round),
      isRunoff: Boolean(row.is_runoff),
      voterPlayerId: row.voter_player_id,
      targetPlayerId: row.target_player_id ?? null,
      voteType: row.vote_type as VoteType,
      createdAt: new Date(row.created_at).toISOString()
    }));
  }

  static async submitVote(
    db: Queryable,
    game: Game,
    voterPlayer: GamePlayer | undefined,
    targetPlayerId: string | null,
    players: GamePlayer[]
  ): Promise<Vote> {
    if (
      game.status === GAME_STATUS.COMPLETED ||
      game.currentPhase === GAME_PHASES.GAME_OVER
    ) {
      throw new GameError(ERROR_MESSAGES.GAME_ALREADY_ENDED, 400);
    }

    if (game.currentPhase !== GAME_PHASES.DAY_VOTING) {
      throw new GameError(ERROR_MESSAGES.VOTING_ENDED, 400);
    }

    if (!voterPlayer || voterPlayer.gameId !== game.id) {
      throw new GameError(ERROR_MESSAGES.PLAYER_NOT_IN_GAME, 403);
    }

    if (!PlayerController.isPlayerAlive(voterPlayer)) {
      throw new GameError(ERROR_MESSAGES.PLAYER_DEAD, 403);
    }

    const existing = await db.query(
      `SELECT id FROM votes
       WHERE game_id = $1 AND round = $2 AND is_runoff = $3 AND voter_player_id = $4`,
      [game.id, game.currentRound, game.isRunoff, voterPlayer.id]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      throw new GameError(ERROR_MESSAGES.DUPLICATE_VOTE, 409);
    }

    let resolvedTargetId: string | null = null;
    let voteType: VoteType = VOTE_TYPES.SKIP;

    if (targetPlayerId && targetPlayerId !== "NOBODY") {
      if (targetPlayerId === voterPlayer.id) {
        throw new GameError(ERROR_MESSAGES.SELF_VOTE, 400);
      }

      const targetPlayer = players.find((p) => p.id === targetPlayerId);
      if (!targetPlayer || targetPlayer.gameId !== game.id) {
        throw new GameError(ERROR_MESSAGES.TARGET_NOT_FOUND, 400);
      }

      if (!PlayerController.isPlayerAlive(targetPlayer)) {
        throw new GameError(ERROR_MESSAGES.TARGET_DEAD, 400);
      }

      if (
        game.isRunoff &&
        game.runoffCandidates.length > 0 &&
        !game.runoffCandidates.includes(targetPlayer.id)
      ) {
        throw new GameError(ERROR_MESSAGES.INVALID_RUNOFF_TARGET, 400);
      }

      resolvedTargetId = targetPlayer.id;
      voteType = VOTE_TYPES.ELIMINATE;
    }

    const insertRes = await db.query(
      `INSERT INTO votes (
         game_id,
         round,
         is_runoff,
         voter_player_id,
         target_player_id,
         vote_type
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        game.id,
        game.currentRound,
        game.isRunoff,
        voterPlayer.id,
        resolvedTargetId,
        voteType
      ]
    );

    await PlayerController.recordEvent(
      db,
      game.id,
      game.currentRound,
      GAME_PHASES.DAY_VOTING,
      EVENT_TYPES.VOTE_SUBMITTED,
      voterPlayer.id,
      resolvedTargetId,
      { isRunoff: game.isRunoff, voteType }
    );

    return {
      id: insertRes.rows[0].id,
      gameId: game.id,
      round: game.currentRound,
      isRunoff: game.isRunoff,
      voterPlayerId: voterPlayer.id,
      targetPlayerId: resolvedTargetId,
      voteType,
      createdAt: new Date(insertRes.rows[0].created_at).toISOString()
    };
  }

  static async haveAllVotersSubmitted(
    db: Queryable,
    game: Game,
    players: GamePlayer[]
  ): Promise<boolean> {
    const livingPlayers = PlayerController.getLivingPlayers(players);
    if (livingPlayers.length === 0) {
      return true;
    }

    const votes = await VotingController.getRoundVotes(
      db,
      game.id,
      game.currentRound,
      game.isRunoff
    );
    const votedIds = new Set(votes.map((v) => v.voterPlayerId));

    return livingPlayers.every((player) => votedIds.has(player.id));
  }

  static async resolveVotes(
    db: Queryable,
    game: Game,
    players: GamePlayer[]
  ): Promise<VoteResultSummary> {
    const playersById = new Map<string, GamePlayer>();
    for (const player of players) {
      playersById.set(player.id, player);
    }

    const livingPlayerIds = new Set(
      PlayerController.getLivingPlayers(players).map((p) => p.id)
    );

    const votes = await VotingController.getRoundVotes(
      db,
      game.id,
      game.currentRound,
      game.isRunoff
    );

    const validVotes = votes.filter((vote) =>
      livingPlayerIds.has(vote.voterPlayerId)
    );

    const targetMap = new Map<
      string | null,
      { count: number; voters: string[] }
    >();

    for (const vote of validVotes) {
      const targetId =
        vote.targetPlayerId && livingPlayerIds.has(vote.targetPlayerId)
          ? vote.targetPlayerId
          : null;
      const voterName = playersById.get(vote.voterPlayerId)?.username ?? "Player";
      const existing = targetMap.get(targetId);
      if (existing) {
        existing.count += 1;
        existing.voters.push(voterName);
      } else {
        targetMap.set(targetId, { count: 1, voters: [voterName] });
      }
    }

    const tallies: VoteResultSummary["tallies"] = [];
    let maxPlayerVotes = 0;
    const skipEntry = targetMap.get(null);
    const skipVotes = skipEntry ? skipEntry.count : 0;

    for (const [targetId, data] of targetMap.entries()) {
      if (targetId !== null && data.count > maxPlayerVotes) {
        maxPlayerVotes = data.count;
      }
      tallies.push({
        targetPlayerId: targetId,
        targetUsername:
          targetId === null
            ? "Nobody"
            : (playersById.get(targetId)?.username ?? "Unknown"),
        count: data.count,
        voters: game.settings.revealVotesAfterPhase ? data.voters : undefined
      });
    }

    tallies.sort((a, b) => b.count - a.count);

    const topTargetIds: string[] = [];
    if (maxPlayerVotes > 0) {
      for (const [targetId, data] of targetMap.entries()) {
        if (targetId !== null && data.count === maxPlayerVotes) {
          topTargetIds.push(targetId);
        }
      }
    }

    let eliminatedPlayer: GamePlayer | null = null;
    let isTie = false;
    let runoffStarted = false;
    let runoffCandidates: string[] = [];
    let message = "Nobody was eliminated.";

    if (maxPlayerVotes === 0 || skipVotes > maxPlayerVotes) {
      message = "Nobody was eliminated.";
    } else if (skipVotes === maxPlayerVotes && topTargetIds.length >= 1) {
      isTie = true;
      message = "Vote tied. Nobody was eliminated.";
    } else if (topTargetIds.length === 1) {
      const target = playersById.get(topTargetIds[0]) ?? null;
      if (target) {
        eliminatedPlayer = target;
        await PlayerController.eliminatePlayer(
          db,
          game.id,
          target.id,
          game.currentRound,
          GAME_PHASES.VOTE_RESULT,
          "Eliminated by town vote"
        );
        message = `${target.username} was eliminated by vote.`;
      }
    } else if (topTargetIds.length > 1) {
      isTie = true;
      if (
        !game.isRunoff &&
        game.settings.tieRule === TIE_RULES.RUNOFF
      ) {
        runoffStarted = true;
        runoffCandidates = topTargetIds;
        const candidateNames = topTargetIds
          .map((id) => playersById.get(id)?.username ?? "Player")
          .join(", ");
        message = `Vote tied between ${candidateNames}. Starting runoff vote.`;

        await PlayerController.recordEvent(
          db,
          game.id,
          game.currentRound,
          GAME_PHASES.DAY_VOTING,
          EVENT_TYPES.RUNOFF_STARTED,
          null,
          null,
          { runoffCandidates, candidateNames }
        );
      } else {
        message = "Vote tied. Nobody was eliminated.";
      }
    }

    const summary: VoteResultSummary = {
      round: game.currentRound,
      isRunoff: game.isRunoff,
      tallies,
      eliminatedPlayerId: eliminatedPlayer?.id ?? null,
      eliminatedUsername: eliminatedPlayer?.username ?? null,
      isTie,
      runoffStarted,
      runoffCandidates,
      message
    };

    await PlayerController.recordEvent(
      db,
      game.id,
      game.currentRound,
      GAME_PHASES.VOTE_RESULT,
      EVENT_TYPES.VOTE_RESOLVED,
      null,
      eliminatedPlayer?.id ?? null,
      summary as unknown as Record<string, unknown>
    );

    return summary;
  }
}
