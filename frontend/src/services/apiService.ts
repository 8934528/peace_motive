import type { GameSettings } from "../config/gameConfig";
import type { ClientGameState, ServerResponse, UserSession } from "../types/gameTypes";
import { getStoredUserSession } from "../utils/storage";

const API_BASE = `${import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001"}/api/games`;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ServerResponse<T>> {
  const session = getStoredUserSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(session?.sessionToken ? { "x-session-token": session.sessionToken } : {}),
    ...(session?.id ? { "x-user-id": session.id } : {})
  };

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> | undefined)
      }
    });
    return (await response.json()) as ServerResponse<T>;
  } catch {
    return {
      ok: false,
      message: "Network failure. Check your connection"
    };
  }
}

export const apiService = {
  createGame: (payload: {
    username: string;
    gameName?: string;
    sessionToken?: string | null;
    settings?: Partial<GameSettings>;
  }) =>
    request<{ user: UserSession; state: ClientGameState }>("", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  joinGame: (
    gameIdOrCode: string,
    payload: { username: string; sessionToken?: string | null }
  ) =>
    request<{ user: UserSession; state: ClientGameState }>(
      `/${encodeURIComponent(gameIdOrCode)}/join`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    ),

  getGameState: (gameIdOrCode: string) =>
    request<ClientGameState>(`/${encodeURIComponent(gameIdOrCode)}/state`, {
      method: "GET"
    })
};
