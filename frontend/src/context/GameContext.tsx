import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { GameSettings } from "../config/gameConfig";

import { APP_VIEWS, GAME_PHASES, type AppView } from "../constants/gameConstants";
import { GameClientController } from "../controllers/GameClientController";
import { socket } from "../lib/socket";
import { SinglePlayerEngine } from "../services/singlePlayerEngine";

import type { ClientGameState, ToastItem, UserSession } from "../types/gameTypes";

import { clearStoredUserSession, getStoredGameCode, getStoredPlayerName, getStoredUserSession, setStoredGameCode, setStoredPlayerName, setStoredUserSession } from "../utils/storage";

export type GameContextValue = {
  connected: boolean;
  busy: boolean;
  view: AppView;
  user: UserSession | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  gameState: ClientGameState | null;
  toasts: ToastItem[];
  isSinglePlayer: boolean;
  addToast: (type: ToastItem["type"], message: string) => void;
  removeToast: (id: string) => void;
  copyGameCode: () => Promise<void>;
  navigateTo: (nextView: AppView) => void;
  startSinglePlayer: (playerName: string, playerCount: number) => void;
  createGame: (gameName?: string, settings?: Partial<GameSettings> ) => Promise<boolean>;
  joinGame: (code: string, customUsername?: string) => Promise<boolean>;
  toggleReady: () => Promise<void>;
  updateSettings: (settings: Partial<GameSettings>, gameName?: string ) => Promise<boolean>;
  removePlayer: (targetPlayerId: string) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  submitNightAction: (targetPlayerId: string) => Promise<boolean>;
  submitVote: (targetPlayerId: string | null) => Promise<boolean>;
  pauseGame: () => Promise<boolean>;
  resumeGame: () => Promise<boolean>;
  generateInviteCode: () => Promise<string | null>;
  skipDiscussion: () => void;
  endGame: () => Promise<boolean>;
  restartGame: () => Promise<boolean>;
  leaveGame: () => Promise<void>;
  deleteGame: () => Promise<void>;
  signOut: () => Promise<void>;
};

const GameContext = createContext<GameContextValue | null>(null);

function resolveViewFromPhase(phase: string): AppView {
  if (phase === GAME_PHASES.LOBBY) {
    return APP_VIEWS.LOBBY;
  }
  if (phase === GAME_PHASES.GAME_OVER) {
    return APP_VIEWS.GAME_RESULTS;
  }
  return APP_VIEWS.GAME;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState<boolean>(socket.connected);
  const [busy, setBusy] = useState<boolean>(false);
  const [view, setView] = useState<AppView>(APP_VIEWS.HOME);
  const [isSinglePlayer, setIsSinglePlayer] = useState<boolean>(false);
  const singlePlayerEngineRef = useRef<SinglePlayerEngine | null>(null);

  const [user, setUser] = useState<UserSession | null>(() =>
    getStoredUserSession()
  );
  const [playerName, setPlayerNameState] = useState<string>(() => {
    const stored = getStoredPlayerName();
    return stored || getStoredUserSession()?.username || "";
  });
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    setStoredPlayerName(name);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev: ToastItem[]) =>
      prev.filter((item: ToastItem) => item.id !== id)
    );
  }, []);

  const addToast = useCallback(
    (type: ToastItem["type"], message: string) => {
      // Strip trailing period if any
      const cleanMessage = message.endsWith(".") ? message.slice(0, -1) : message;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev: ToastItem[]) => {
        const duplicate = prev.some((t: ToastItem) => t.message === cleanMessage);
        if (duplicate) return prev;
        return [...prev.slice(-3), { id, type, message: cleanMessage }];
      });
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const copyGameCode = useCallback(async () => {
    const code = gameState?.game.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      addToast("success", "Game code copied");
    } catch {
      addToast("error", "Could not copy code");
    }
  }, [gameState?.game.code, addToast]);

  const applyGameState = useCallback((nextState: ClientGameState) => {
    setGameState(nextState);
    if (nextState.game.code !== "OFFLINE") {
      setStoredGameCode(nextState.game.code);
    }
    setView(resolveViewFromPhase(nextState.game.phase));
  }, []);

  useEffect(() => {
    const onConnect = async () => {
      setConnected(true);
      const savedSession = getStoredUserSession();
      const savedCode = getStoredGameCode();

      if (savedSession && savedCode) {
        const res = await GameClientController.reconnectGame({
          gameCode: savedCode,
          sessionToken: savedSession.sessionToken,
          userId: savedSession.id
        });
        if (res.ok && res.data) {
          setUser(res.data.user);
          setStoredUserSession(res.data.user);
          applyGameState(res.data.state);
        } else {
          setStoredGameCode(null);
        }
      }
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onGameState = (updatedState: ClientGameState) => {
      applyGameState(updatedState);
    };

    const onGameRemoved = (payload: { message?: string }) => {
      setGameState(null);
      setStoredGameCode(null);
      setView(APP_VIEWS.HOME);
      addToast("error", payload?.message ?? "Player removed");
    };

    const onGameDeleted = (payload: { message?: string }) => {
      setGameState(null);
      setStoredGameCode(null);
      setView(APP_VIEWS.HOME);
      addToast("info", payload?.message ?? "Game ended");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("game:state", onGameState);
    socket.on("game:removed", onGameRemoved);
    socket.on("game:deleted", onGameDeleted);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("game:state", onGameState);
      socket.off("game:removed", onGameRemoved);
      socket.off("game:deleted", onGameDeleted);
      socket.disconnect();
    };
  }, [applyGameState, addToast]);

  const navigateTo = useCallback((nextView: AppView) => {
    setView(nextView);
  }, []);

  const startSinglePlayer = useCallback(
    (customName: string, count: number) => {
      if (singlePlayerEngineRef.current) {
        singlePlayerEngineRef.current.destroy();
      }
      setIsSinglePlayer(true);
      setPlayerName(customName);
      const engine = new SinglePlayerEngine(customName, count);
      singlePlayerEngineRef.current = engine;
      engine.subscribe((nextState) => {
        applyGameState(nextState);
      });
      engine.start();
      addToast("success", "Single player match started");
    },
    [setPlayerName, applyGameState, addToast]
  );

  const createGame = useCallback(
    async (gameName?: string, settings?: Partial<GameSettings>) => {
      if (busy) return false;
      setBusy(true);
      try {
        setIsSinglePlayer(false);
        const existingSession = getStoredUserSession();
        const res = await GameClientController.createGame({
          username: playerName.trim(),
          gameName,
          sessionToken: existingSession?.sessionToken ?? null,
          settings
        });

        if (!res.ok || !res.data) {
          addToast("error", res.message ?? "Could not create the game");
          return false;
        }

        setUser(res.data.user);
        setStoredUserSession(res.data.user);
        applyGameState(res.data.state);
        addToast("success", "Game created");
        return true;
      } finally {
        setBusy(false);
      }
    },
    [busy, playerName, addToast, applyGameState]
  );

  const joinGame = useCallback(
    async (code: string, customUsername?: string) => {
      if (busy) return false;
      setBusy(true);
      try {
        setIsSinglePlayer(false);
        const nameToUse = (customUsername ?? playerName).trim();
        if (customUsername) {
          setPlayerName(customUsername);
        }
        const existingSession = getStoredUserSession();
        const res = await GameClientController.joinGame({
          code: code.trim(),
          username: nameToUse,
          sessionToken: existingSession?.sessionToken ?? null
        });

        if (!res.ok || !res.data) {
          addToast("error", res.message ?? "Could not join the game");
          return false;
        }

        setUser(res.data.user);
        setStoredUserSession(res.data.user);
        applyGameState(res.data.state);
        addToast("success", "You joined the game");
        return true;
      } finally {
        setBusy(false);
      }
    },
    [busy, playerName, setPlayerName, addToast, applyGameState]
  );

  const toggleReady = useCallback(async () => {
    if (!gameState?.currentPlayer || busy) return;
    setBusy(true);
    try {
      const nextReady = !gameState.currentPlayer.isReady;
      const res = await GameClientController.setReady(nextReady);
      if (!res.ok || !res.data) {
        addToast("error", res.message ?? "This action is no longer available");
        return;
      }
      applyGameState(res.data);
    } finally {
      setBusy(false);
    }
  }, [gameState, busy, addToast, applyGameState]);

  const updateSettings = useCallback(
    async (settings: Partial<GameSettings>, gameName?: string) => {
      if (busy) return false;
      setBusy(true);
      try {
        const res = await GameClientController.updateSettings(
          settings,
          gameName
        );
        if (!res.ok || !res.data) {
          addToast("error", res.message ?? "Could not save settings");
          return false;
        }
        applyGameState(res.data);
        addToast("success", "Settings saved");
        return true;
      } finally {
        setBusy(false);
      }
    },
    [busy, addToast, applyGameState]
  );

  const removePlayer = useCallback(
    async (targetPlayerId: string) => {
      if (busy) return false;
      setBusy(true);
      try {
        const res = await GameClientController.removePlayer(targetPlayerId);
        if (!res.ok || !res.data) {
          addToast("error", res.message ?? "Could not remove player");
          return false;
        }
        applyGameState(res.data);
        addToast("info", "Player removed");
        return true;
      } finally {
        setBusy(false);
      }
    },
    [busy, addToast, applyGameState]
  );

  const startGame = useCallback(async () => {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await GameClientController.startGame();
      if (!res.ok || !res.data) {
        addToast("error", res.message ?? "Not enough players");
        return false;
      }
      applyGameState(res.data);
      return true;
    } finally {
      setBusy(false);
    }
  }, [busy, addToast, applyGameState]);

  const submitNightAction = useCallback(
    async (targetPlayerId: string) => {
      if (busy) return false;
      if (isSinglePlayer && singlePlayerEngineRef.current) {
        const ok = singlePlayerEngineRef.current.submitNightAction(targetPlayerId);
        if (ok) addToast("success", "Action submitted");
        return ok;
      }
      setBusy(true);
      try {
        const res = await GameClientController.submitNightAction(
          targetPlayerId
        );
        if (!res.ok || !res.data) {
          addToast("error", res.message ?? "This action is no longer available");
          return false;
        }
        applyGameState(res.data);
        addToast("success", "Action submitted");
        return true;
      } finally {
        setBusy(false);
      }
    },
    [busy, isSinglePlayer, addToast, applyGameState]
  );

  const submitVote = useCallback(
    async (targetPlayerId: string | null) => {
      if (busy) return false;
      if (isSinglePlayer && singlePlayerEngineRef.current) {
        const ok = singlePlayerEngineRef.current.submitVote(targetPlayerId);
        if (ok) addToast("success", "Vote submitted");
        return ok;
      }
      setBusy(true);
      try {
        const res = await GameClientController.submitVote(targetPlayerId);
        if (!res.ok || !res.data) {
          addToast("error", res.message ?? "Could not submit your vote");
          return false;
        }
        applyGameState(res.data);
        addToast("success", "Vote submitted");
        return true;
      } finally {
        setBusy(false);
      }
    },
    [busy, isSinglePlayer, addToast, applyGameState]
  );

  const pauseGame = useCallback(async () => {
    if (isSinglePlayer && singlePlayerEngineRef.current) {
      singlePlayerEngineRef.current.pause();
      addToast("info", "Game paused");
      return true;
    }
    try {
      const res = await GameClientController.pauseGame();
      if (!res.ok || !res.data) {
        addToast("error", res.message ?? "Could not pause game");
        return false;
      }
      applyGameState(res.data);
      addToast("info", "Game paused");
      return true;
    } catch {
      return false;
    }
  }, [isSinglePlayer, addToast, applyGameState]);

  const resumeGame = useCallback(async () => {
    if (isSinglePlayer && singlePlayerEngineRef.current) {
      singlePlayerEngineRef.current.resume();
      addToast("success", "Game resumed");
      return true;
    }
    try {
      const res = await GameClientController.resumeGame();
      if (!res.ok || !res.data) {
        addToast("error", res.message ?? "Could not resume game");
        return false;
      }
      applyGameState(res.data);
      addToast("success", "Game resumed");
      return true;
    } catch {
      return false;
    }
  }, [isSinglePlayer, addToast, applyGameState]);

  const generateInviteCode = useCallback(async () => {
    try {
      const res = await GameClientController.generateJoinCode();
      if (!res.ok || !res.data) {
        addToast("error", res.message ?? "Could not generate code");
        return null;
      }
      applyGameState(res.data.state);
      addToast("success", "New invite code generated");
      return res.data.code;
    } catch {
      addToast("error", "Could not generate code");
      return null;
    }
  }, [addToast, applyGameState]);

  const skipDiscussion = useCallback(() => {
    if (isSinglePlayer && singlePlayerEngineRef.current) {
      singlePlayerEngineRef.current.skipToVote();
    }
  }, [isSinglePlayer]);

  const endGame = useCallback(async () => {
    if (isSinglePlayer) {
      if (singlePlayerEngineRef.current) {
        singlePlayerEngineRef.current.destroy();
        singlePlayerEngineRef.current = null;
      }
      setIsSinglePlayer(false);
      setGameState(null);
      setView(APP_VIEWS.HOME);
      addToast("info", "Game ended");
      return true;
    }
    if (busy) return false;
    setBusy(true);
    try {
      const res = await GameClientController.endGame();
      if (!res.ok || !res.data) {
        addToast("error", res.message ?? "Could not end the game");
        return false;
      }
      applyGameState(res.data);
      addToast("info", "Game ended");
      return true;
    } finally {
      setBusy(false);
    }
  }, [busy, isSinglePlayer, addToast, applyGameState]);

  const restartGame = useCallback(async () => {
    if (isSinglePlayer) {
      if (singlePlayerEngineRef.current) {
        singlePlayerEngineRef.current.start();
        addToast("success", "Game restarted");
        return true;
      }
    }
    if (busy) return false;
    setBusy(true);
    try {
      const res = await GameClientController.restartGame();
      if (!res.ok || !res.data) {
        addToast("error", res.message ?? "Could not restart the game");
        return false;
      }
      applyGameState(res.data);
      addToast("success", "Game restarted");
      return true;
    } finally {
      setBusy(false);
    }
  }, [busy, isSinglePlayer, addToast, applyGameState]);

  const leaveGame = useCallback(async () => {
    if (isSinglePlayer) {
      if (singlePlayerEngineRef.current) {
        singlePlayerEngineRef.current.destroy();
        singlePlayerEngineRef.current = null;
      }
      setIsSinglePlayer(false);
      setGameState(null);
      setView(APP_VIEWS.HOME);
      addToast("info", "You left the game");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await GameClientController.leaveGame();
      setGameState(null);
      setStoredGameCode(null);
      setView(APP_VIEWS.HOME);
      addToast("info", "You left the game");
    } finally {
      setBusy(false);
    }
  }, [busy, isSinglePlayer, addToast]);

  const deleteGame = useCallback(async () => {
    if (isSinglePlayer) {
      leaveGame();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const res = await GameClientController.deleteGame();
      if (!res.ok) {
        addToast("error", res.message ?? "Could not delete the game");
        return;
      }
      setGameState(null);
      setStoredGameCode(null);
      setView(APP_VIEWS.HOME);
      addToast("info", "Game deleted");
    } finally {
      setBusy(false);
    }
  }, [busy, isSinglePlayer, leaveGame, addToast]);

  const signOut = useCallback(async () => {
    if (gameState && !isSinglePlayer) {
      await GameClientController.leaveGame();
    }
    if (singlePlayerEngineRef.current) {
      singlePlayerEngineRef.current.destroy();
      singlePlayerEngineRef.current = null;
    }
    setIsSinglePlayer(false);
    clearStoredUserSession();
    setUser(null);
    setPlayerNameState("");
    setGameState(null);
    setView(APP_VIEWS.HOME);
    addToast("info", "Signed out");
  }, [gameState, isSinglePlayer, addToast]);

  const contextValue = useMemo<GameContextValue>(
    () => ({
      connected,
      busy,
      view,
      user,
      playerName,
      setPlayerName,
      gameState,
      toasts,
      isSinglePlayer,
      addToast,
      removeToast,
      copyGameCode,
      navigateTo,
      startSinglePlayer,
      createGame,
      joinGame,
      toggleReady,
      updateSettings,
      removePlayer,
      startGame,
      submitNightAction,
      submitVote,
      pauseGame,
      resumeGame,
      generateInviteCode,
      skipDiscussion,
      endGame,
      restartGame,
      leaveGame,
      deleteGame,
      signOut
    }),
    [
      connected,
      busy,
      view,
      user,
      playerName,
      setPlayerName,
      gameState,
      toasts,
      isSinglePlayer,
      addToast,
      removeToast,
      copyGameCode,
      navigateTo,
      startSinglePlayer,
      createGame,
      joinGame,
      toggleReady,
      updateSettings,
      removePlayer,
      startGame,
      submitNightAction,
      submitVote,
      pauseGame,
      resumeGame,
      generateInviteCode,
      skipDiscussion,
      endGame,
      restartGame,
      leaveGame,
      deleteGame,
      signOut
    ]
  );

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGameContext must be used inside a GameProvider.");
  }
  return ctx;
}
