import type { UserSession } from "../types/gameTypes";

const STORAGE_KEYS = {
  USER_SESSION: "motive_user_session",
  ACTIVE_GAME_CODE: "motive_active_game_code",
  PLAYER_NAME: "motive_player_name"
} as const;

export function getStoredUserSession(): UserSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserSession>;
    if (
      typeof parsed.id === "string" && typeof parsed.username === "string" && typeof parsed.sessionToken === "string"
    ) {
      return {
        id: parsed.id,
        username: parsed.username,
        sessionToken: parsed.sessionToken
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredUserSession(session: UserSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
    sessionStorage.setItem(STORAGE_KEYS.PLAYER_NAME, session.username);
  } catch {
    return;
  }
}

export function clearStoredUserSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_CODE);
    sessionStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
  } catch {
    return;
  }
}

export function getStoredGameCode(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_CODE);
  } catch {
    return null;
  }
}

export function setStoredGameCode(code: string | null): void {
  try {
    if (code) {
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_GAME_CODE, code);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_CODE);
    }
  } catch {
    return;
  }
}

export function getStoredPlayerName(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.PLAYER_NAME) ?? "";
  } catch {
    return "";
  }
}

export function setStoredPlayerName(name: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
  } catch {
    return;
  }
}
