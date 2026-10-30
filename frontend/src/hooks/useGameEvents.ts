import { useGameContext } from "../context/GameContext";

export function useGameEvents() {
  const { gameState } = useGameContext();
  return {
    events: gameState?.events ?? []
  };
}

