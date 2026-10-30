import { Badge } from "../badges/Badge";
import { GameLog } from "../components/GameLog";
import { GameStatus } from "../components/GameStatus";
import { NightAction } from "../components/NightAction";
import { PhaseHeader } from "../components/PhaseHeader";
import { PlayerList } from "../components/PlayerList";
import { RoleCard } from "../components/RoleCard";
import { LoadingState } from "../components/StateViews";
import { VoteResults } from "../components/VoteResults";
import { VotingPanel } from "../components/VotingPanel";
import { GAME_PHASES, GAME_STATUS, INVESTIGATION_RESULTS, ROLES } from "../constants/gameConstants";
import { useGame } from "../hooks/useGame";
import { useGamePhase } from "../hooks/useGamePhase";
import { usePlayerRole } from "../hooks/usePlayerRole";
import { usePlayers } from "../hooks/usePlayers";
import { Pause, Play } from "../icons/GameIcons";

import type { DetectiveInvestigation, GamePlayer } from "../types/gameTypes";

export function Game() {
  const { gameState, isSinglePlayer, skipDiscussion, pauseGame, resumeGame } = useGame();
  const { phase, round } = useGamePhase();
  const { livingPlayers, isHost } = usePlayers();
  const { role, investigations } = usePlayerRole();

  if (!gameState) {
    return (
      <div className="container-fluid py-3 px-3 px-lg-5">
        <LoadingState message="Loading game state" />
      </div>
    );
  }

  const latestInvestigation = investigations.find(
    (inv: DetectiveInvestigation) => inv.round === round
  );

  const isPaused = gameState.game.status === GAME_STATUS.PAUSED;

  const renderMainPhaseArea = () => {
    switch (phase) {
      case GAME_PHASES.ROLE_REVEAL:
        return <RoleCard />;

      case GAME_PHASES.NIGHT:
        return <NightAction />;

      case GAME_PHASES.MORNING:
        return (
          <div className="panel-card">
            <span className="step-label">MORNING REPORT</span>
            <h2 className="mt-1">Morning</h2>
            <div className="result-callout mt-3">
              <strong>
                {gameState.game.lastMorningMessage ??
                  "Nobody was eliminated during the night"}
              </strong>
            </div>

            {role?.key === ROLES.DETECTIVE && latestInvestigation && (
              <div className="investigation-result-card mt-3">
                <span className="field-label">INVESTIGATION</span>
                <p className="investigation-copy">
                  <strong>{latestInvestigation.targetUsername}</strong> is:
                </p>
                <div className="mt-1">
                  <Badge
                    variant={
                      latestInvestigation.result === INVESTIGATION_RESULTS.MAFIA
                        ? "mafia"
                        : "town"
                    }
                  >
                    {latestInvestigation.result}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        );

      case GAME_PHASES.DAY_DISCUSSION:
        return (
          <div className="panel-card">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="step-label">DAY {round} DISCUSSION</span>
                <h2 className="mt-1">Discuss who you think is Mafia</h2>
              </div>
              {(isSinglePlayer || isHost) && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={skipDiscussion}
                >
                  Proceed to Vote
                </button>
              )}
            </div>
            <p className="muted-copy mt-2">
              Talk with the surviving players and compare stories before voting begins
            </p>

            <div className="mt-3">
              <span className="field-label">
                LIVING PLAYERS ({livingPlayers.length})
              </span>
              <div className="row g-2 mt-1">
                {livingPlayers.map((p: GamePlayer) => (
                  <div key={p.id} className="col-sm-6 col-md-4">
                    <div className="living-chip">
                      <span className="chip-seat">#{p.seatNumber}</span>
                      <strong>{p.username}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case GAME_PHASES.DAY_VOTING:
        return <VotingPanel />;

      case GAME_PHASES.VOTE_RESULT:
        return <VoteResults />;

      default:
        return null;
    }
  };

  return (
    <div className="container-fluid py-3 px-3 px-lg-5">
      <div className="row g-3">
        {isPaused ? (
          <div className="col-12">
            <div className="panel-card d-flex justify-content-between align-items-center bg-surface border-warning">
              <div className="d-flex align-items-center gap-2">
                <Pause size={18} />
                <strong>Game is currently paused</strong>
              </div>
              {isHost && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={resumeGame}
                >
                  <Play size={16} /> Resume Game
                </button>
              )}
            </div>
          </div>
        ) : (
          isHost &&
          phase !== GAME_PHASES.GAME_OVER && (
            <div className="col-12 d-flex justify-content-end">
              <button
                type="button"
                className="secondary-button"
                onClick={pauseGame}
              >
                <Pause size={14} /> Pause Game
              </button>
            </div>
          )
        )}

        <div className="col-12">
          <PhaseHeader />
        </div>

        <div className="col-lg-4">
          <div className="d-flex flex-column gap-3">
            <PlayerList />
            <GameStatus />
          </div>
        </div>

        <div className="col-lg-8">
          <div className="d-flex flex-column gap-3">
            {phase !== GAME_PHASES.ROLE_REVEAL && <RoleCard compact />}
            {renderMainPhaseArea()}
            <GameLog />
          </div>
        </div>
      </div>
    </div>
  );
}
