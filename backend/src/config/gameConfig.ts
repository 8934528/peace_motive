import { ACTION_TYPES, MAFIA_TIE_RULES, ROLES, TEAMS, TIE_RULES, type ActionType, type MafiaTieRule, type RoleKey, type Team, type TieRule } from "../constants/gameConstants";

export const MIN_PLAYERS = 4;
export const RECOMMENDED_MIN_PLAYERS = 5;
export const MAX_PLAYERS = 12;

export const DEFAULT_ROLE_REVEAL_TIME = 8;
export const DEFAULT_NIGHT_TIME = 25;
export const DEFAULT_MORNING_TIME = 6;
export const DEFAULT_DISCUSSION_TIME = 60;
export const DEFAULT_VOTING_TIME = 30;
export const DEFAULT_VOTE_RESULT_TIME = 6;

export const ALLOW_DOCTOR_SELF_SAVE = true;
export const ALLOW_REPEATED_DOCTOR_SAVE = false;
export const DEFAULT_TIE_RULE: TieRule = TIE_RULES.RUNOFF;
export const DEFAULT_MAFIA_TIE_RULE: MafiaTieRule = MAFIA_TIE_RULES.RANDOM;

export interface RoleConfig {
  key: RoleKey;
  name: string;
  team: Team;
  description: string;
  ability: string;
  objective: string;
  actionType: ActionType | null;
}

export const ROLE_CONFIGS: Record<RoleKey, RoleConfig> = {
  [ROLES.MAFIA]: {
    key: ROLES.MAFIA,
    name: "Mafia",
    team: TEAMS.MAFIA,
    description: "You work in secret with the other Mafia members to take control of the town.",
    ability: "Select one player to eliminate each night.",
    objective: "Reach a state where Mafia equals or outnumbers the Town.",
    actionType: ACTION_TYPES.ELIMINATE
  },
  [ROLES.DOCTOR]: {
    key: ROLES.DOCTOR,
    name: "Doctor",
    team: TEAMS.TOWN,
    description: "You are the town medic who can save lives during the night.",
    ability: "Protect one player each night from elimination.",
    objective: "Keep the Town alive and help eliminate all Mafia.",
    actionType: ACTION_TYPES.PROTECT
  },
  [ROLES.DETECTIVE]: {
    key: ROLES.DETECTIVE,
    name: "Detective",
    team: TEAMS.TOWN,
    description: "You investigate suspects in the dark to uncover the truth.",
    ability: "Investigate one player each night.",
    objective: "Find the Mafia and help the Town survive.",
    actionType: ACTION_TYPES.INVESTIGATE
  },
  [ROLES.VILLAGER]: {
    key: ROLES.VILLAGER,
    name: "Villager",
    team: TEAMS.TOWN,
    description: "You are a town citizen trying to figure out who is lying.",
    ability: "No special night action. Discuss and vote during the day.",
    objective: "Find and vote out all Mafia members.",
    actionType: null
  }
};

export interface RoleDistributionEntry {
  [ROLES.MAFIA]: number;
  [ROLES.DETECTIVE]: number;
  [ROLES.DOCTOR]: number;
  [ROLES.VILLAGER]: number;
}

export const ROLE_DISTRIBUTION: Record<number, RoleDistributionEntry> = {
  4: {
    [ROLES.MAFIA]: 1,
    [ROLES.DETECTIVE]: 1,
    [ROLES.DOCTOR]: 1,
    [ROLES.VILLAGER]: 1
  },
  5: {
    [ROLES.MAFIA]: 1,
    [ROLES.DETECTIVE]: 1,
    [ROLES.DOCTOR]: 1,
    [ROLES.VILLAGER]: 2
  },
  6: {
    [ROLES.MAFIA]: 2,
    [ROLES.DETECTIVE]: 1,
    [ROLES.DOCTOR]: 1,
    [ROLES.VILLAGER]: 2
  },
  7: {
    [ROLES.MAFIA]: 2,
    [ROLES.DETECTIVE]: 1,
    [ROLES.DOCTOR]: 1,
    [ROLES.VILLAGER]: 3
  },
  8: {
    [ROLES.MAFIA]: 2,
    [ROLES.DETECTIVE]: 1,
    [ROLES.DOCTOR]: 1,
    [ROLES.VILLAGER]: 4
  },
  9: {
    [ROLES.MAFIA]: 3,
    [ROLES.DETECTIVE]: 1,
    [ROLES.DOCTOR]: 1,
    [ROLES.VILLAGER]: 4
  },
  10: {
    [ROLES.MAFIA]: 3,
    [ROLES.DETECTIVE]: 1,
    [ROLES.DOCTOR]: 1,
    [ROLES.VILLAGER]: 5
  },
  11: {
    [ROLES.MAFIA]: 3,
    [ROLES.DETECTIVE]: 1,
    [ROLES.DOCTOR]: 1,
    [ROLES.VILLAGER]: 6
  },
  12: {
    [ROLES.MAFIA]: 3,
    [ROLES.DETECTIVE]: 1,
    [ROLES.DOCTOR]: 1,
    [ROLES.VILLAGER]: 7
  }
};

export interface GameSettings {
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
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  roleRevealTime: DEFAULT_ROLE_REVEAL_TIME,
  nightTime: DEFAULT_NIGHT_TIME,
  morningTime: DEFAULT_MORNING_TIME,
  discussionTime: DEFAULT_DISCUSSION_TIME,
  votingTime: DEFAULT_VOTING_TIME,
  voteResultTime: DEFAULT_VOTE_RESULT_TIME,
  allowDoctorSelfSave: ALLOW_DOCTOR_SELF_SAVE,
  allowRepeatedDoctorSave: ALLOW_REPEATED_DOCTOR_SAVE,
  tieRule: DEFAULT_TIE_RULE,
  mafiaTieRule: DEFAULT_MAFIA_TIE_RULE,
  revealVotesAfterPhase: true,
  deadCanSpectate: true,
  autoAdvanceWhenAllActed: true
};
