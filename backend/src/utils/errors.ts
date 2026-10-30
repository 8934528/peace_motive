export class GameError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = "GAME_ERROR") {
    super(message);
    this.name = "GameError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const ERROR_MESSAGES = {
  INVALID_NAME: "Enter a name between 2 and 20 characters",
  INVALID_CODE: "Enter a valid game or invite code",
  GAME_NOT_FOUND: "Game not found",
  GAME_ALREADY_STARTED: "This game has already started",
  GAME_ALREADY_ENDED: "The game has already ended",
  GAME_FULL: "This game is full",
  DUPLICATE_NAME: "That name is already used in this game",
  PLAYER_ALREADY_JOINED: "You already joined this game",
  PLAYER_NOT_IN_GAME: "You are not in this game",
  NOT_ENOUGH_PLAYERS: "Not enough players",
  UNAUTHORIZED_HOST: "Only the host can do that",
  UNAUTHORIZED_PLAYER: "You cannot perform this action",
  PLAYER_DEAD: "Dead players cannot act",
  TARGET_DEAD: "That player is no longer alive",
  TARGET_NOT_FOUND: "Choose a valid player",
  ACTION_UNAVAILABLE: "This action is no longer available",
  NIGHT_ENDED: "The night phase has ended",
  DUPLICATE_ACTION: "You already submitted your action",
  DOCTOR_NO_SELF_SAVE: "The Doctor cannot protect themselves in this game",
  DOCTOR_NO_REPEAT_SAVE: "You cannot protect the same player two nights in a row",
  VOTING_ENDED: "Voting has ended",
  DUPLICATE_VOTE: "You already voted",
  SELF_VOTE: "You cannot vote for yourself",
  INVALID_RUNOFF_TARGET: "You can only vote for tied players in a runoff",
  INVITE_CODE_EXPIRED: "Invite code has expired",
  INVITE_CODE_IN_USE: "Invite code is already in use",
  SERVER_ERROR: "Something went wrong. Please try again"
} as const;

export function toUserErrorMessage(error: unknown): {
  message: string;
  statusCode: number;
} {
  if (error instanceof GameError) {
    return {
      message: error.message,
      statusCode: error.statusCode
    };
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const pgCode = String((error as { code?: unknown }).code);
    if (pgCode === "23505") {
      return {
        message: ERROR_MESSAGES.ACTION_UNAVAILABLE,
        statusCode: 409
      };
    }
  }

  console.error("Unexpected game error:", error);
  return {
    message: ERROR_MESSAGES.SERVER_ERROR,
    statusCode: 500
  };
}
