import { useMemo } from "react";
import { useGameContext } from "../context/GameContext";
import type { GamePlayer } from "../types/gameTypes";

export function usePlayers() {
  const { gameState } = useGameContext();
  const players = gameState?.players ?? [];
  const currentPlayer = gameState?.currentPlayer ?? null;

  const livingPlayers = useMemo(
    () => players.filter((p: GamePlayer) => p.isAlive),
    [players]
  );

  const deadPlayers = useMemo(
    () => players.filter((p: GamePlayer) => !p.isAlive),
    [players]
  );

  const isHost = Boolean(currentPlayer?.isHost);
  const isAlive = Boolean(currentPlayer?.isAlive);

  return {
    players,
    currentPlayer,
    livingPlayers,
    deadPlayers,
    isHost,
    isAlive
  };
}
