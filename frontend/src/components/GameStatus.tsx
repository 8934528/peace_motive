import { Badge } from "../badges/Badge";
import { AliveBadge } from "../badges/StatusBadge";
import { INVESTIGATION_RESULTS, ROLES } from "../constants/gameConstants";
import { useGame } from "../hooks/useGame";
import { usePlayerRole } from "../hooks/usePlayerRole";
import { usePlayers } from "../hooks/usePlayers";
import type { DetectiveInvestigation } from "../types/gameTypes";

export function GameStatus() {
  const { gameState } = useGame();
  const { livingPlayers, deadPlayers, currentPlayer } = usePlayers();
  const { role, investigations } = usePlayerRole();

  if (!gameState) return null;

  return (
    <div className="panel-card">
      <div className="section-heading">
        <div>
          <span className="step-label">MATCH STATUS</span>
          <h2>Round {gameState.game.round || 1}</h2>
        </div>
        {currentPlayer && <AliveBadge isAlive={currentPlayer.isAlive} />}
      </div>

      <div className="row g-2 status-metrics">
        <div className="col-6">
          <div className="metric-box">
            <span className="field-label">LIVING</span>
            <strong>{livingPlayers.length}</strong>
          </div>
        </div>
        <div className="col-6">
          <div className="metric-box">
            <span className="field-label">ELIMINATED</span>
            <strong>{deadPlayers.length}</strong>
          </div>
        </div>
      </div>

      {role?.key === ROLES.DETECTIVE && investigations.length > 0 && (
        <div className="mt-3">
          <span className="field-label">YOUR INVESTIGATIONS</span>
          <div className="investigation-history-list mt-1">
            {investigations.map((inv: DetectiveInvestigation) => (
              <div
                key={`${inv.round}-${inv.targetPlayerId}`}
                className="investigation-history-row"
              >
                <span>
                  Night {inv.round}: <strong>{inv.targetUsername}</strong>
                </span>
                <Badge
                  variant={
                    inv.result === INVESTIGATION_RESULTS.MAFIA
                      ? "mafia"
                      : "town"
                  }
                >
                  {inv.result}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
