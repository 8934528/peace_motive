import { socket } from "../lib/socket";

import type { GameSettings } from "../config/gameConfig";
import type { ClientGameState, ServerResponse, UserSession } from "../types/gameTypes";

function emitWithAck<T>(
  event: string,
  payload?: unknown
): Promise<ServerResponse<T>> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    const timeout = setTimeout(() => {
      resolve({
        ok: false,
        message: "Connection timed out. Please try again"
      });
    }, 8000);

    socket.emit(event, payload, (response: ServerResponse<T>) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

export class GameClientController {
  static createGame(params: {
    username: string;
    gameName?: string;
    sessionToken?: string | null;
    settings?: Partial<GameSettings>;
  }) {
    return emitWithAck<{ user: UserSession; state: ClientGameState }>(
      "game:create",
      params
    );
  }

  static joinGame(params: {
    code: string;
    username: string;
    sessionToken?: string | null;
  }) {
    return emitWithAck<{ user: UserSession; state: ClientGameState }>(
      "game:join",
      params
    );
  }

  static reconnectGame(params: {
    gameCode: string;
    sessionToken: string;
    userId: string;
  }) {
    return emitWithAck<{ user: UserSession; state: ClientGameState }>(
      "game:reconnect",
      params
    );
  }

  static setReady(isReady: boolean) {
    return emitWithAck<ClientGameState>("game:ready", { isReady });
  }

  static updateSettings(settings: Partial<GameSettings>, gameName?: string) {
    return emitWithAck<ClientGameState>("game:settings", {
      settings,
      gameName
    });
  }

  static removePlayer(targetPlayerId: string) {
    return emitWithAck<ClientGameState>("game:remove_player", {
      targetPlayerId
    });
  }

  static startGame() {
    return emitWithAck<ClientGameState>("game:start", {});
  }

  static submitNightAction(targetPlayerId: string) {
    return emitWithAck<ClientGameState>("game:action", { targetPlayerId });
  }

  static submitVote(targetPlayerId: string | null) {
    return emitWithAck<ClientGameState>("game:vote", { targetPlayerId });
  }

  static pauseGame() {
    return emitWithAck<ClientGameState>("game:pause", {});
  }

  static resumeGame() {
    return emitWithAck<ClientGameState>("game:resume", {});
  }

  static generateJoinCode() {
    return emitWithAck<{ code: string; state: ClientGameState }>(
      "game:generate_code",
      {}
    );
  }

  static endGame() {
    return emitWithAck<ClientGameState>("game:end", {});
  }

  static restartGame() {
    return emitWithAck<ClientGameState>("game:restart", {});
  }

  static leaveGame() {
    return emitWithAck<undefined>("game:leave", {});
  }

  static deleteGame() {
    return emitWithAck<undefined>("game:delete", {});
  }
}
