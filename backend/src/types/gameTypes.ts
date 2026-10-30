import type { ActionStatus, ActionType, EventType, GamePhase, GameStatus, InvestigationResult, RoleKey, Team, VoteType } from "../constants/gameConstants";
import type { GameSettings } from "../config/gameConfig";

export interface User {
  id: string;
  username: string;
  sessionToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: number;
  key: RoleKey;
  name: string;
  team: Team;
  description: string;
  ability: string;
  objective: string;
  enabled: boolean;
}

export interface GameJoinCode {
  code: string;
  status: "AVAILABLE" | "USED" | "EXPIRED";
  usedByPlayerId: string | null;
  usedByUsername: string | null;
  createdAt: string;
}

export interface Game {
  id: string;
  code: string;
  name: string;
  hostId: string;
  status: GameStatus;
  currentPhase: GamePhase;
  currentRound: number;
  isRunoff: boolean;
  runoffCandidates: string[];
  settings: GameSettings;
  joinCodes?: GameJoinCode[];
  pausedRemainingSeconds?: number | null;
  winnerTeam: Team | null;
  winnerReason: string | null;
  lastMorningMessage: string | null;
  lastVoteMessage: string | null;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GamePlayer {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  seatNumber: number;
  isAlive: boolean;
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
  lastProtectedPlayerId: string | null;
  joinedAt: string;
  eliminatedAt: string | null;
  leftAt: string | null;
}

export interface GameRoleAssignment {
  id: string;
  gameId: string;
  playerId: string;
  roleId: number;
  roleKey: RoleKey;
  roleName: string;
  team: Team;
  description: string;
  ability: string;
  objective: string;
  assignedAt: string;
}

export interface NightAction {
  id: string;
  gameId: string;
  round: number;
  actorPlayerId: string;
  targetPlayerId: string;
  actionType: ActionType;
  status: ActionStatus;
  result: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Vote {
  id: string;
  gameId: string;
  round: number;
  isRunoff: boolean;
  voterPlayerId: string;
  targetPlayerId: string | null;
  voteType: VoteType;
  createdAt: string;
}

export interface GameEvent {
  id: string;
  gameId: string;
  round: number;
  phase: GamePhase;
  eventType: EventType;
  playerId: string | null;
  targetPlayerId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PublicPlayerView {
  id: string;
  userId: string;
  username: string;
  seatNumber: number;
  isAlive: boolean;
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
  hasVoted?: boolean;
  revealedRole?: {
    key: RoleKey;
    name: string;
    team: Team;
  };
}

export interface PrivateRoleView {
  key: RoleKey;
  name: string;
  team: Team;
  description: string;
  ability: string;
  objective: string;
}

export interface MafiaTeammateView {
  playerId: string;
  username: string;
  isAlive: boolean;
  selectedTargetId: string | null;
}

export interface DetectiveInvestigationView {
  round: number;
  targetPlayerId: string;
  targetUsername: string;
  result: InvestigationResult;
}

export interface VoteResultSummary {
  round: number;
  isRunoff: boolean;
  tallies: Array<{
    targetPlayerId: string | null;
    targetUsername: string;
    count: number;
    voters?: string[];
  }>;
  eliminatedPlayerId: string | null;
  eliminatedUsername: string | null;
  isTie: boolean;
  runoffStarted: boolean;
  runoffCandidates: string[];
  message: string;
}

export interface GameResult {
  winnerTeam: Team;
  winnerReason: string;
  finalRoles: Array<{
    playerId: string;
    username: string;
    isAlive: boolean;
    roleKey: RoleKey;
    roleName: string;
    team: Team;
  }>;
}

export interface ClientGameState {
  game: {
    id: string;
    code: string;
    name: string;
    hostId: string;
    status: GameStatus;
    phase: GamePhase;
    round: number;
    isRunoff: boolean;
    runoffCandidates: string[];
    settings: GameSettings;
    joinCodes?: GameJoinCode[];
    pausedRemainingSeconds?: number | null;
    winnerTeam: Team | null;
    winnerReason: string | null;
    lastMorningMessage: string | null;
    lastVoteMessage: string | null;
    phaseStartedAt: string | null;
    phaseEndsAt: string | null;
    serverTime: string;
  };
  currentPlayer: {
    id: string;
    userId: string;
    username: string;
    seatNumber: number;
    isAlive: boolean;
    isReady: boolean;
    isHost: boolean;
  } | null;
  players: PublicPlayerView[];
  role: PrivateRoleView | null;
  privateState: {
    mafiaTeammates: MafiaTeammateView[];
    submittedActionTargetId: string | null;
    submittedActionType: ActionType | null;
    canActTonight: boolean;
    restrictedTargetIds: string[];
    investigations: DetectiveInvestigationView[];
    submittedVoteTargetId: string | null;
    hasSubmittedVote: boolean;
    canVoteToday: boolean;
  };
  voteSummary: VoteResultSummary | null;
  gameResult: GameResult | null;
  events: Array<{
    id: string;
    round: number;
    phase: GamePhase;
    eventType: EventType;
    message: string;
    createdAt: string;
  }>;
}

export interface ServiceResult<T = undefined> {
  ok: boolean;
  message?: string;
  data?: T;
}

