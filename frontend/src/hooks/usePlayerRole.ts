import { useGameContext } from "../context/GameContext";

export function usePlayerRole() {
  const { gameState } = useGameContext();
  const role = gameState?.role ?? null;
  const mafiaTeammates = gameState?.privateState.mafiaTeammates ?? [];
  const investigations = gameState?.privateState.investigations ?? [];

  return {
    role,
    mafiaTeammates,
    investigations
  };
}

