import { useMemo } from "react";
import { useGameContext } from "../context/GameContext";
import type { GamePlayer } from "../types/gameTypes";

export function useNightAction() {
  const { gameState, submitNightAction, busy } = useGameContext();
  const privateState = gameState?.privateState;
  const players = gameState?.players ?? [];

  const availableTargets = useMemo(() => {
    const restricted = new Set(privateState?.restrictedTargetIds ?? []);
    return players.filter(
      (p: GamePlayer) => p.isAlive && !restricted.has(p.id)
    );
  }, [players, privateState?.restrictedTargetIds]);

  return {
    canActTonight: Boolean(privateState?.canActTonight),
    submittedTargetId: privateState?.submittedActionTargetId ?? null,
    submittedActionType: privateState?.submittedActionType ?? null,
    availableTargets,
    submitNightAction,
    busy
  };
}
