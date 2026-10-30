import { MAFIA_TIE_RULES, ROLES, TIE_RULES, type MafiaTieRule, type RoleKey, type TieRule } from "../constants/gameConstants";

export const MIN_PLAYERS = 4;
export const RECOMMENDED_MIN_PLAYERS = 5;
export const MAX_PLAYERS = 12;

export const DEFAULT_ROLE_REVEAL_TIME = 8;
export const DEFAULT_NIGHT_TIME = 25;
export const DEFAULT_MORNING_TIME = 6;
export const DEFAULT_DISCUSSION_TIME = 60;
export const DEFAULT_VOTING_TIME = 30;
export const DEFAULT_VOTE_RESULT_TIME = 6;

export const ROLE_DISTRIBUTION: Record<number, Record<RoleKey, number>> = {
  4: { [ROLES.MAFIA]: 1, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.VILLAGER]: 1 },
  5: { [ROLES.MAFIA]: 1, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.VILLAGER]: 2 },
  6: { [ROLES.MAFIA]: 2, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.VILLAGER]: 2 },
  7: { [ROLES.MAFIA]: 2, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.VILLAGER]: 3 },
  8: { [ROLES.MAFIA]: 2, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.VILLAGER]: 4 },
  9: { [ROLES.MAFIA]: 3, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.VILLAGER]: 4 },
  10: { [ROLES.MAFIA]: 3, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.VILLAGER]: 5 },
  11: { [ROLES.MAFIA]: 3, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.VILLAGER]: 6 },
  12: { [ROLES.MAFIA]: 3, [ROLES.DETECTIVE]: 1, [ROLES.DOCTOR]: 1, [ROLES.VILLAGER]: 7 }
};

export type GameSettings = {
  minPlayers: number;
  maxPlayers: number;
  roleRevealTime: number;
  nightTime: number;
  morningTime: number;
  discussionTime: number;
  votingTime: number;
  voteResultTime: number;
  allowDoctorSelfSave: boolean;
  allowRepeatedDoctorSave: boolean;
  tieRule: TieRule;
  mafiaTieRule: MafiaTieRule;
  revealVotesAfterPhase: boolean;
  deadCanSpectate: boolean;
  autoAdvanceWhenAllActed: boolean;
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  roleRevealTime: DEFAULT_ROLE_REVEAL_TIME,
  nightTime: DEFAULT_NIGHT_TIME,
  morningTime: DEFAULT_MORNING_TIME,
  discussionTime: DEFAULT_DISCUSSION_TIME,
  votingTime: DEFAULT_VOTING_TIME,
  voteResultTime: DEFAULT_VOTE_RESULT_TIME,
  allowDoctorSelfSave: true,
  allowRepeatedDoctorSave: false,
  tieRule: TIE_RULES.RUNOFF,
  mafiaTieRule: MAFIA_TIE_RULES.RANDOM,
  revealVotesAfterPhase: true,
  deadCanSpectate: true,
  autoAdvanceWhenAllActed: true
};
