import { GAME_PHASES, type GamePhase } from "../constants/gameConstants";
import { useGameContext } from "../context/GameContext";

export function useGamePhase() {
  const { gameState } = useGameContext();
  const phase: GamePhase = gameState?.game.phase ?? GAME_PHASES.LOBBY;
  const round = gameState?.game.round ?? 0;
  const isRunoff = gameState?.game.isRunoff ?? false;

  const phaseTitle = (() => {
    switch (phase) {
      case GAME_PHASES.LOBBY:
        return "LOBBY";
      case GAME_PHASES.ROLE_REVEAL:
        return "YOUR ROLE";
      case GAME_PHASES.NIGHT:
        return `NIGHT ${round}`;
      case GAME_PHASES.MORNING:
        return "MORNING";
      case GAME_PHASES.DAY_DISCUSSION:
        return `DAY ${round}`;
      case GAME_PHASES.DAY_VOTING:
        return isRunoff ? `RUNOFF VOTE (DAY ${round})` : `DAY ${round} VOTING`;
      case GAME_PHASES.VOTE_RESULT:
        return "VOTE RESULTS";
      case GAME_PHASES.GAME_OVER:
        return "GAME OVER";
      default:
        return phase;
    }
  })();

  const phaseSubtitle = (() => {
    switch (phase) {
      case GAME_PHASES.LOBBY:
        return "Waiting for players to join";
      case GAME_PHASES.ROLE_REVEAL:
        return "Memorize your secret identity";
      case GAME_PHASES.NIGHT:
        return "The town is sleeping";
      case GAME_PHASES.MORNING:
        return (
          gameState?.game.lastMorningMessage ??
          "Nobody was eliminated during the night"
        );
      case GAME_PHASES.DAY_DISCUSSION:
        return "Discuss who you think is Mafia";
      case GAME_PHASES.DAY_VOTING:
        return isRunoff
          ? "Vote between the tied suspects"
          : "Choose who to eliminate";
      case GAME_PHASES.VOTE_RESULT:
        return (
          gameState?.game.lastVoteMessage ??
          gameState?.voteSummary?.message ??
          "Voting has concluded"
        );
      case GAME_PHASES.GAME_OVER:
        return gameState?.game.winnerReason ?? "The match has finished";
      default:
        return "";
    }
  })();

  return {
    phase,
    round,
    isRunoff,
    phaseTitle,
    phaseSubtitle
  };
}

