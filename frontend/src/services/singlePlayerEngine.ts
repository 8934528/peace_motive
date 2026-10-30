import { ROLE_DISTRIBUTION } from "../config/gameConfig";
import {
  ACTION_TYPES,
  EVENT_TYPES,
  GAME_PHASES,
  GAME_STATUS,
  ROLES,
  TEAMS,
  type GamePhase,
  type RoleKey
} from "../constants/gameConstants";
import type {
  ClientGameState,
  DetectiveInvestigation,
  GamePlayer,
  GameResult,
  MafiaTeammate,
  Role,
  VoteResultSummary
} from "../types/gameTypes";
import { getRandomSouthAfricanNames } from "../utils/southAfricanNames";

const ROLE_CONFIGS: Record<RoleKey, Role> = {
  [ROLES.MAFIA]: {
    key: ROLES.MAFIA,
    name: "Mafia",
    team: TEAMS.MAFIA,
    description: "You work in secret with other Mafia members to take control of the town",
    ability: "Choose one player to eliminate each night",
    objective: "Equal or outnumber the living Town players"
  },
  [ROLES.DOCTOR]: {
    key: ROLES.DOCTOR,
    name: "Doctor",
    team: TEAMS.TOWN,
    description: "You are the town medic who can save lives during the night",
    ability: "Protect one player each night from elimination",
    objective: "Keep the Town alive and help eliminate all Mafia"
  },
  [ROLES.DETECTIVE]: {
    key: ROLES.DETECTIVE,
    name: "Detective",
    team: TEAMS.TOWN,
    description: "You investigate suspects in the dark to uncover the truth",
    ability: "Investigate one player each night to learn if they are Mafia",
    objective: "Find the Mafia and help the Town survive"
  },
  [ROLES.VILLAGER]: {
    key: ROLES.VILLAGER,
    name: "Villager",
    team: TEAMS.TOWN,
    description: "You are an ordinary citizen trying to figure out who to trust",
    ability: "No night action. Use discussion and voting during the day",
    objective: "Identify and vote out all Mafia members"
  }
};

interface InternalPlayer {
  id: string;
  userId: string;
  username: string;
  seatNumber: number;
  isAlive: boolean;
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
  isAi: boolean;
  roleKey: RoleKey;
  language?: string;
}

export class SinglePlayerEngine {
  private humanName: string;
  private totalPlayers: number;
  private players: InternalPlayer[] = [];
  private currentPhase: GamePhase = GAME_PHASES.LOBBY;
  private currentRound = 0;
  private isRunoff = false;
  private runoffCandidates: string[] = [];
  private isPaused = false;
  private pausedRemainingSeconds = 0;
  private phaseEndsAt: string | null = null;
  private lastMorningMessage: string | null = null;
  private lastVoteMessage: string | null = null;
  private winnerTeam: "MAFIA" | "TOWN" | null = null;
  private winnerReason: string | null = null;

  // Actions & Investigations
  private nightActions: Map<string, { targetId: string; type: string }> = new Map();
  private investigations: DetectiveInvestigation[] = [];
  private votes: Map<string, string | null> = new Map();
  private voteSummary: VoteResultSummary | null = null;
  private events: ClientGameState["events"] = [];

  private timerId: ReturnType<typeof setTimeout> | null = null;
  private onStateChange: ((state: ClientGameState) => void) | null = null;

  constructor(humanName: string, totalPlayers: number) {
    this.humanName = humanName.trim() || "Player";
    this.totalPlayers = Math.max(4, Math.min(12, totalPlayers));
  }

  public subscribe(listener: (state: ClientGameState) => void): void {
    this.onStateChange = listener;
    this.emit();
  }

  public destroy(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.onStateChange = null;
  }

  public start(): void {
    // Generate AI players with South African names
    const botCount = this.totalPlayers - 1;
    const botNames = getRandomSouthAfricanNames(botCount, [this.humanName]);

    const distribution = ROLE_DISTRIBUTION[this.totalPlayers] ?? ROLE_DISTRIBUTION[6];
    const roleDeck: RoleKey[] = [];
    for (const [role, count] of Object.entries(distribution)) {
      for (let i = 0; i < count; i++) {
        roleDeck.push(role as RoleKey);
      }
    }
    // Shuffle role deck
    roleDeck.sort(() => Math.random() - 0.5);

    this.players = [
      {
        id: "p-human",
        userId: "u-human",
        username: this.humanName,
        seatNumber: 1,
        isAlive: true,
        isReady: true,
        isConnected: true,
        isHost: true,
        isAi: false,
        roleKey: roleDeck[0]
      }
    ];

    for (let i = 0; i < botNames.length; i++) {
      this.players.push({
        id: `p-bot-${i + 1}`,
        userId: `u-bot-${i + 1}`,
        username: botNames[i].name,
        seatNumber: i + 2,
        isAlive: true,
        isReady: true,
        isConnected: true,
        isHost: false,
        isAi: true,
        roleKey: roleDeck[i + 1] ?? ROLES.VILLAGER,
        language: botNames[i].language
      });
    }

    this.currentPhase = GAME_PHASES.ROLE_REVEAL;
    this.currentRound = 0;
    this.setPhaseTimer(7, () => {
      this.startNightPhase();
    });

    this.recordEvent(
      EVENT_TYPES.GAME_STARTED,
      "Single player game started with South African players"
    );
    this.emit();
  }

  public pause(): void {
    if (this.isPaused || this.currentPhase === GAME_PHASES.GAME_OVER) return;
    this.isPaused = true;
    if (this.phaseEndsAt) {
      const remaining = Math.max(
        1,
        Math.round((new Date(this.phaseEndsAt).getTime() - Date.now()) / 1000)
      );
      this.pausedRemainingSeconds = remaining;
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.phaseEndsAt = null;
    this.emit();
  }

  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    const seconds = this.pausedRemainingSeconds || 15;
    this.setPhaseTimer(seconds, () => {
      this.advanceCurrentPhase();
    });
    this.emit();
  }

  private advanceCurrentPhase(): void {
    switch (this.currentPhase) {
      case GAME_PHASES.ROLE_REVEAL:
        this.startNightPhase();
        break;
      case GAME_PHASES.NIGHT:
        this.resolveNightPhase();
        break;
      case GAME_PHASES.MORNING:
        this.startDayDiscussion();
        break;
      case GAME_PHASES.DAY_DISCUSSION:
        this.startDayVoting();
        break;
      case GAME_PHASES.DAY_VOTING:
        this.resolveVotingPhase();
        break;
      case GAME_PHASES.VOTE_RESULT:
        if (this.checkWinCondition()) return;
        this.startNightPhase();
        break;
    }
  }

  public skipToVote(): void {
    if (this.currentPhase === GAME_PHASES.DAY_DISCUSSION) {
      if (this.timerId) clearTimeout(this.timerId);
      this.startDayVoting();
    }
  }

  private startNightPhase(): void {
    this.currentRound += 1;
    this.currentPhase = GAME_PHASES.NIGHT;
    this.nightActions.clear();

    // AI decisions
    this.simulateAiNightActions();

    const human = this.getHuman();
    const humanRole = human ? ROLE_CONFIGS[human.roleKey] : null;
    const canHumanAct =
      human?.isAlive &&
      (humanRole?.key === ROLES.MAFIA ||
        humanRole?.key === ROLES.DOCTOR ||
        humanRole?.key === ROLES.DETECTIVE);

    const duration = canHumanAct ? 30 : 6;
    this.setPhaseTimer(duration, () => {
      this.resolveNightPhase();
    });

    this.recordEvent(
      EVENT_TYPES.PHASE_STARTED,
      `Night ${this.currentRound} has begun. The town sleeps`
    );
    this.emit();
  }

  private simulateAiNightActions(): void {
    const alivePlayers = this.players.filter((p) => p.isAlive);
    const aliveTown = alivePlayers.filter(
      (p) => ROLE_CONFIGS[p.roleKey].team === TEAMS.TOWN
    );

    // AI Mafia target
    const aiMafia = alivePlayers.filter(
      (p) => p.isAi && ROLE_CONFIGS[p.roleKey].team === TEAMS.MAFIA
    );
    if (aiMafia.length > 0 && aliveTown.length > 0) {
      const target = aliveTown[Math.floor(Math.random() * aliveTown.length)];
      for (const m of aiMafia) {
        this.nightActions.set(m.id, {
          targetId: target.id,
          type: ACTION_TYPES.ELIMINATE
        });
      }
    }

    // AI Doctor save
    const aiDoctor = alivePlayers.find(
      (p) => p.isAi && p.roleKey === ROLES.DOCTOR
    );
    if (aiDoctor && alivePlayers.length > 0) {
      const target =
        alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      this.nightActions.set(aiDoctor.id, {
        targetId: target.id,
        type: ACTION_TYPES.PROTECT
      });
    }

    // AI Detective investigate
    const aiDetective = alivePlayers.find(
      (p) => p.isAi && p.roleKey === ROLES.DETECTIVE
    );
    if (aiDetective) {
      const candidates = alivePlayers.filter((p) => p.id !== aiDetective.id);
      if (candidates.length > 0) {
        const target =
          candidates[Math.floor(Math.random() * candidates.length)];
        this.nightActions.set(aiDetective.id, {
          targetId: target.id,
          type: ACTION_TYPES.INVESTIGATE
        });
      }
    }
  }

  public submitNightAction(targetPlayerId: string): boolean {
    const human = this.getHuman();
    if (!human || !human.isAlive) return false;

    if (human.roleKey === ROLES.MAFIA) {
      this.nightActions.set(human.id, {
        targetId: targetPlayerId,
        type: ACTION_TYPES.ELIMINATE
      });
    } else if (human.roleKey === ROLES.DOCTOR) {
      this.nightActions.set(human.id, {
        targetId: targetPlayerId,
        type: ACTION_TYPES.PROTECT
      });
    } else if (human.roleKey === ROLES.DETECTIVE) {
      this.nightActions.set(human.id, {
        targetId: targetPlayerId,
        type: ACTION_TYPES.INVESTIGATE
      });
      const target = this.players.find((p) => p.id === targetPlayerId);
      if (target) {
        const isMafia = ROLE_CONFIGS[target.roleKey].team === TEAMS.MAFIA;
        this.investigations.push({
          round: this.currentRound,
          targetPlayerId: target.id,
          targetUsername: target.username,
          result: isMafia ? "MAFIA" : "NOT MAFIA"
        });
      }
    }

    this.emit();

    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.resolveNightPhase();
    }, 1200);

    return true;
  }

  private resolveNightPhase(): void {
    let targetToKill: string | null = null;
    let protectedTargetId: string | null = null;

    for (const action of this.nightActions.values()) {
      if (action.type === ACTION_TYPES.ELIMINATE) {
        targetToKill = action.targetId;
      } else if (action.type === ACTION_TYPES.PROTECT) {
        protectedTargetId = action.targetId;
      }
    }

    if (targetToKill) {
      if (targetToKill === protectedTargetId) {
        this.lastMorningMessage =
          "The Doctor successfully protected someone last night! No one died";
      } else {
        const victim = this.players.find((p) => p.id === targetToKill);
        if (victim && victim.isAlive) {
          victim.isAlive = false;
          this.lastMorningMessage = `${victim.username} was eliminated during the night`;
          this.recordEvent(
            EVENT_TYPES.PLAYER_ELIMINATED,
            `${victim.username} was found eliminated at sunrise`
          );
        }
      }
    } else {
      this.lastMorningMessage = "The night was quiet. Everyone survived";
    }

    this.currentPhase = GAME_PHASES.MORNING;

    if (this.checkWinCondition()) return;

    this.setPhaseTimer(6, () => {
      this.startDayDiscussion();
    });
    this.emit();
  }

  private startDayDiscussion(): void {
    this.currentPhase = GAME_PHASES.DAY_DISCUSSION;
    this.setPhaseTimer(25, () => {
      this.startDayVoting();
    });
    this.recordEvent(
      EVENT_TYPES.DAY_STARTED,
      `Day ${this.currentRound} discussion began`
    );
    this.emit();
  }

  private startDayVoting(): void {
    this.currentPhase = GAME_PHASES.DAY_VOTING;
    this.votes.clear();

    this.simulateAiVotes();

    this.setPhaseTimer(30, () => {
      this.resolveVotingPhase();
    });
    this.recordEvent(
      EVENT_TYPES.PHASE_STARTED,
      `Town voting started. Cast your vote`
    );
    this.emit();
  }

  private simulateAiVotes(): void {
    const alive = this.players.filter((p) => p.isAlive);
    const aliveAi = alive.filter((p) => p.isAi);

    for (const bot of aliveAi) {
      const candidates = alive.filter((p) => p.id !== bot.id);
      if (candidates.length === 0) continue;

      if (Math.random() < 0.1) {
        this.votes.set(bot.id, null);
      } else {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        this.votes.set(bot.id, picked.id);
      }
    }
  }

  public submitVote(targetPlayerId: string | null): boolean {
    const human = this.getHuman();
    if (!human || !human.isAlive) return false;

    this.votes.set(human.id, targetPlayerId);
    this.emit();

    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.resolveVotingPhase();
    }, 1500);

    return true;
  }

  private resolveVotingPhase(): void {
    const counts = new Map<string | null, number>();
    for (const targetId of this.votes.values()) {
      counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
    }

    const tallies: VoteResultSummary["tallies"] = [];
    for (const [targetId, count] of counts.entries()) {
      const targetUser = this.players.find((p) => p.id === targetId);
      tallies.push({
        targetPlayerId: targetId,
        targetUsername: targetUser ? targetUser.username : "Skip Vote",
        count
      });
    }

    tallies.sort((a, b) => b.count - a.count);

    let eliminatedPlayer: InternalPlayer | null = null;
    let message = "No one was eliminated by vote";

    if (tallies.length > 0 && tallies[0].targetPlayerId) {
      const topTally = tallies[0];
      const isTie = tallies.length > 1 && tallies[1].count === topTally.count;

      if (!isTie) {
        const victim = this.players.find((p) => p.id === topTally.targetPlayerId);
        if (victim && victim.isAlive) {
          victim.isAlive = false;
          eliminatedPlayer = victim;
          message = `${victim.username} was voted out and eliminated`;
          this.recordEvent(
            EVENT_TYPES.PLAYER_ELIMINATED,
            `${victim.username} was eliminated by vote`
          );
        }
      } else {
        message = "The vote resulted in a tie. No one was eliminated";
      }
    }

    this.lastVoteMessage = message;
    this.voteSummary = {
      round: this.currentRound,
      isRunoff: false,
      tallies,
      eliminatedPlayerId: eliminatedPlayer ? eliminatedPlayer.id : null,
      eliminatedUsername: eliminatedPlayer ? eliminatedPlayer.username : null,
      isTie: false,
      runoffStarted: false,
      runoffCandidates: [],
      message
    };

    this.currentPhase = GAME_PHASES.VOTE_RESULT;

    if (this.checkWinCondition()) return;

    this.setPhaseTimer(7, () => {
      this.startNightPhase();
    });
    this.emit();
  }

  private checkWinCondition(): boolean {
    const alive = this.players.filter((p) => p.isAlive);
    const aliveMafia = alive.filter(
      (p) => ROLE_CONFIGS[p.roleKey].team === TEAMS.MAFIA
    );
    const aliveTown = alive.filter(
      (p) => ROLE_CONFIGS[p.roleKey].team === TEAMS.TOWN
    );

    if (aliveMafia.length === 0) {
      this.winnerTeam = "TOWN";
      this.winnerReason = "All Mafia members have been eliminated! Town wins";
      this.currentPhase = GAME_PHASES.GAME_OVER;
      this.recordEvent(EVENT_TYPES.WINNER_DECLARED, this.winnerReason);
      this.emit();
      return true;
    }

    if (aliveMafia.length >= aliveTown.length) {
      this.winnerTeam = "MAFIA";
      this.winnerReason = "Mafia equals or outnumbers Town! Mafia wins";
      this.currentPhase = GAME_PHASES.GAME_OVER;
      this.recordEvent(EVENT_TYPES.WINNER_DECLARED, this.winnerReason);
      this.emit();
      return true;
    }

    return false;
  }

  private setPhaseTimer(seconds: number, callback: () => void): void {
    if (this.timerId) clearTimeout(this.timerId);
    this.phaseEndsAt = new Date(Date.now() + seconds * 1000).toISOString();
    this.timerId = setTimeout(() => {
      callback();
    }, seconds * 1000);
  }

  private getHuman(): InternalPlayer | undefined {
    return this.players.find((p) => !p.isAi);
  }

  private recordEvent(eventType: string, message: string): void {
    this.events.unshift({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      round: this.currentRound,
      phase: this.currentPhase,
      eventType: eventType as any,
      message,
      createdAt: new Date().toISOString()
    });
    if (this.events.length > 30) this.events.pop();
  }

  public getClientGameState(): ClientGameState {
    const human = this.getHuman();
    const humanRole = human ? ROLE_CONFIGS[human.roleKey] : null;

    const publicPlayers: GamePlayer[] = this.players.map((p) => {
      const isOver = this.currentPhase === GAME_PHASES.GAME_OVER;
      return {
        id: p.id,
        userId: p.userId,
        username: p.username,
        seatNumber: p.seatNumber,
        isAlive: p.isAlive,
        isReady: true,
        isConnected: true,
        isHost: p.isHost,
        hasVoted: this.votes.has(p.id),
        revealedRole: isOver
          ? {
              key: p.roleKey,
              name: ROLE_CONFIGS[p.roleKey].name,
              team: ROLE_CONFIGS[p.roleKey].team
            }
          : undefined
      };
    });

    const mafiaTeammates: MafiaTeammate[] = [];
    if (humanRole?.team === TEAMS.MAFIA) {
      for (const p of this.players) {
        if (ROLE_CONFIGS[p.roleKey].team === TEAMS.MAFIA) {
          mafiaTeammates.push({
            playerId: p.id,
            username: p.username,
            isAlive: p.isAlive,
            selectedTargetId: this.nightActions.get(p.id)?.targetId ?? null
          });
        }
      }
    }

    const humanAction = human ? this.nightActions.get(human.id) : null;
    const humanVote = human ? this.votes.get(human.id) : null;

    let gameResult: GameResult | null = null;
    if (this.currentPhase === GAME_PHASES.GAME_OVER && this.winnerTeam) {
      gameResult = {
        winnerTeam: this.winnerTeam,
        winnerReason: this.winnerReason ?? "Game completed",
        finalRoles: this.players.map((p) => ({
          playerId: p.id,
          username: p.username,
          isAlive: p.isAlive,
          roleKey: p.roleKey,
          roleName: ROLE_CONFIGS[p.roleKey].name,
          team: ROLE_CONFIGS[p.roleKey].team
        }))
      };
    }

    return {
      game: {
        id: "offline-single-player",
        code: "OFFLINE",
        name: "Single Player Match",
        hostId: "u-human",
        status:
          this.currentPhase === GAME_PHASES.GAME_OVER
            ? GAME_STATUS.COMPLETED
            : this.isPaused
              ? GAME_STATUS.PAUSED
              : GAME_STATUS.IN_PROGRESS,
        phase: this.currentPhase,
        round: this.currentRound,
        isRunoff: this.isRunoff,
        runoffCandidates: this.runoffCandidates,
        settings: {
          minPlayers: 4,
          maxPlayers: 12,
          roleRevealTime: 7,
          nightTime: 30,
          morningTime: 6,
          discussionTime: 25,
          votingTime: 30,
          voteResultTime: 7,
          allowDoctorSelfSave: true,
          allowRepeatedDoctorSave: true,
          tieRule: "NO_ELIMINATION",
          mafiaTieRule: "RANDOM",
          revealVotesAfterPhase: true,
          deadCanSpectate: true,
          autoAdvanceWhenAllActed: true
        },
        winnerTeam: this.winnerTeam,
        winnerReason: this.winnerReason,
        lastMorningMessage: this.lastMorningMessage,
        lastVoteMessage: this.lastVoteMessage,
        phaseStartedAt: new Date().toISOString(),
        phaseEndsAt: this.phaseEndsAt,
        serverTime: new Date().toISOString()
      },
      currentPlayer: human
        ? {
            id: human.id,
            userId: human.userId,
            username: human.username,
            seatNumber: human.seatNumber,
            isAlive: human.isAlive,
            isReady: true,
            isHost: true
          }
        : null,
      players: publicPlayers,
      role: humanRole,
      privateState: {
        mafiaTeammates,
        submittedActionTargetId: humanAction ? humanAction.targetId : null,
        submittedActionType: humanAction ? (humanAction.type as any) : null,
        canActTonight:
          Boolean(human?.isAlive) &&
          (humanRole?.key === ROLES.MAFIA ||
            humanRole?.key === ROLES.DOCTOR ||
            humanRole?.key === ROLES.DETECTIVE),
        restrictedTargetIds: [],
        investigations: this.investigations,
        submittedVoteTargetId: humanVote !== undefined ? humanVote : null,
        hasSubmittedVote: human ? this.votes.has(human.id) : false,
        canVoteToday: Boolean(human?.isAlive)
      },
      voteSummary: this.voteSummary,
      gameResult,
      events: this.events
    };
  }

  private emit(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getClientGameState());
    }
  }
}
