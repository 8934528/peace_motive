import { useMemo } from "react";
import { useGameContext } from "../context/GameContext";
import type { GamePlayer } from "../types/gameTypes";

export function useVoting() {
  const { gameState, submitVote, busy } = useGameContext();
  const privateState = gameState?.privateState;
  const currentPlayerId = gameState?.currentPlayer?.id ?? null;
  const isRunoff = gameState?.game.isRunoff ?? false;
  const runoffCandidates = gameState?.game.runoffCandidates ?? [];
  const players = gameState?.players ?? [];

  const votablePlayers = useMemo(() => {
    const candidateSet = new Set(runoffCandidates);
    return players.filter((p: GamePlayer) => {
      if (!p.isAlive) return false;
      if (p.id === currentPlayerId) return false;
      if (isRunoff && candidateSet.size > 0 && !candidateSet.has(p.id)) {
        return false;
      }
      return true;
    });
  }, [players, currentPlayerId, isRunoff, runoffCandidates]);

  return {
    canVoteToday: Boolean(privateState?.canVoteToday),
    hasSubmittedVote: Boolean(privateState?.hasSubmittedVote),
    submittedVoteTargetId: privateState?.submittedVoteTargetId ?? null,
    votablePlayers,
    voteSummary: gameState?.voteSummary ?? null,
    isRunoff,
    submitVote,
    busy
  };
}
