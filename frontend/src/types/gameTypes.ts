import type { ActionType, EventType, GamePhase, GameStatus, InvestigationResult, RoleKey, Team, VoteType } from "../constants/gameConstants";
import type { GameSettings } from "../config/gameConfig";

export type UserSession = {
  id: string;
  username: string;
  sessionToken: string;
};

export type Role = {
  key: RoleKey;
  name: string;
  team: Team;
  description: string;
  ability: string;
  objective: string;
};

export type GamePlayer = {
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
};

export interface GameJoinCode {
  code: string;
  status: "AVAILABLE" | "USED" | "EXPIRED";
  usedByPlayerId: string | null;
  usedByUsername: string | null;
  createdAt: string;
}

export type Game = {
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

export type NightAction = {
  actorPlayerId: string;
  targetPlayerId: string;
  actionType: ActionType;
};

export type Vote = {
  voterPlayerId: string;
  targetPlayerId: string | null;
  voteType: VoteType;
};

export type MafiaTeammate = {
  playerId: string;
  username: string;
  isAlive: boolean;
  selectedTargetId: string | null;
};

export type DetectiveInvestigation = {
  round: number;
  targetPlayerId: string;
  targetUsername: string;
  result: InvestigationResult;
};

export type VoteTallyEntry = {
  targetPlayerId: string | null;
  targetUsername: string;
  count: number;
  voters?: string[];
};

export type VoteResultSummary = {
  round: number;
  isRunoff: boolean;
  tallies: VoteTallyEntry[];
  eliminatedPlayerId: string | null;
  eliminatedUsername: string | null;
  isTie: boolean;
  runoffStarted: boolean;
  runoffCandidates: string[];
  message: string;
};

export type FinalRoleEntry = {
  playerId: string;
  username: string;
  isAlive: boolean;
  roleKey: RoleKey;
  roleName: string;
  team: Team;
};

export type GameResult = {
  winnerTeam: Team;
  winnerReason: string;
  finalRoles: FinalRoleEntry[];
};

export type GameEvent = {
  id: string;
  round: number;
  phase: GamePhase;
  eventType: EventType;
  message: string;
  createdAt: string;
};

export type ClientGameState = {
  game: Game;
  currentPlayer: {
    id: string;
    userId: string;
    username: string;
    seatNumber: number;
    isAlive: boolean;
    isReady: boolean;
    isHost: boolean;
  } | null;
  players: GamePlayer[];
  role: Role | null;
  privateState: {
    mafiaTeammates: MafiaTeammate[];
    submittedActionTargetId: string | null;
    submittedActionType: ActionType | null;
    canActTonight: boolean;
    restrictedTargetIds: string[];
    investigations: DetectiveInvestigation[];
    submittedVoteTargetId: string | null;
    hasSubmittedVote: boolean;
    canVoteToday: boolean;
  };
  voteSummary: VoteResultSummary | null;
  gameResult: GameResult | null;
  events: GameEvent[];
};

export type ServerResponse<T = undefined> = {
  ok: boolean;
  message?: string;
  data?: T;
};

export type ToastItem = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};
