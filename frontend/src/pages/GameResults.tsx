import { useState } from "react";
import { RoleBadge } from "../badges/RoleBadge";
import { AliveBadge } from "../badges/StatusBadge";
import { TeamBadge } from "../badges/TeamBadge";
import { GameLog } from "../components/GameLog";
import { EmptyState, LoadingState } from "../components/StateViews";
import { TEAMS } from "../constants/gameConstants";
import { useGame } from "../hooks/useGame";
import { usePlayers } from "../hooks/usePlayers";
import { ConfirmActionModal } from "../modals/ConfirmActionModal";

import type { FinalRoleEntry } from "../types/gameTypes";

export function GameResults() {
  const { gameState, restartGame, leaveGame, busy } = useGame();
  const { isHost } = usePlayers();

  const [confirmType, setConfirmType] = useState<"restart" | "leave" | null>(
    null
  );

  if (!gameState) {
    return (
      <div className="container-fluid py-4 px-3 px-lg-5">
        <LoadingState message="Loading results..." />
      </div>
    );
  }

  const { game, gameResult } = gameState;
  const winnerTeam = game.winnerTeam ?? gameResult?.winnerTeam ?? null;
  const winnerHeading =
    winnerTeam === TEAMS.MAFIA
      ? "Mafia Wins"
      : winnerTeam === TEAMS.TOWN
        ? "Town Wins"
        : "Game Ended";

  const winnerReason =
    game.winnerReason ??
    gameResult?.winnerReason ??
    (winnerTeam === TEAMS.MAFIA
      ? "The Mafia controlled the town"
      : "All Mafia members were eliminated");

  const finalRoles = gameResult?.finalRoles ?? [];

  const confirmConfig =
    confirmType === "restart"
      ? {
          title: "Restart this game?",
          message: "All players will return to the lobby for a new round",
          confirmLabel: "Restart",
          variant: "primary" as const,
          action: restartGame
        }
      : confirmType === "leave"
        ? {
            title: "Leave game?",
            message: "Are you sure you want to leave this game?",
            confirmLabel: "Leave",
            variant: "danger" as const,
            action: leaveGame
          }
        : null;

  return (
    <div className="container-fluid py-4 px-3 px-lg-5">
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="panel-card">
            <span className="step-label">GAME OVER</span>
            <div className="d-flex align-items-center justify-content-between mt-1">
              <h1 className="winner-title m-0">{winnerHeading}</h1>
              {winnerTeam && <TeamBadge team={winnerTeam} />}
            </div>

            <p className="winner-reason mt-2">{winnerReason}</p>

            <div className="row g-2 mt-4">
              {isHost && (
                <div className="col-sm-6">
                  <button
                    type="button"
                    className="primary-button w-100 mt-0"
                    disabled={busy}
                    onClick={() => setConfirmType("restart")}
                  >
                    Play Again
                  </button>
                </div>
              )}
              <div className={isHost ? "col-sm-6" : "col-12"}>
                <button
                  type="button"
                  className="secondary-button w-100"
                  disabled={busy}
                  onClick={() => setConfirmType("leave")}
                >
                  Leave Game
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <GameLog />
          </div>
        </div>

        <div className="col-lg-6">
          <div className="panel-card">
            <span className="step-label">IDENTITY REVEAL</span>
            <h2 className="mt-1 mb-3">FINAL ROLES</h2>

            {finalRoles.length === 0 ? (
              <EmptyState message="No role summary available" />
            ) : (
              <div className="final-roles-list">
                {finalRoles.map((entry: FinalRoleEntry) => (
                  <div key={entry.playerId} className="final-role-row">
                    <div className="final-role-player">
                      <strong>{entry.username}</strong>
                      <span className="final-role-dash">—</span>
                      <span>{entry.roleName}</span>
                    </div>
                    <div className="badge-row">
                      <RoleBadge roleKey={entry.roleKey} />
                      <TeamBadge team={entry.team} />
                      <AliveBadge isAlive={entry.isAlive} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(confirmConfig)}
        title={confirmConfig?.title ?? ""}
        message={confirmConfig?.message ?? ""}
        confirmLabel={confirmConfig?.confirmLabel ?? "Confirm"}
        variant={confirmConfig?.variant ?? "danger"}
        busy={busy}
        onCancel={() => setConfirmType(null)}
        onConfirm={async () => {
          if (!confirmConfig) return;
          setConfirmType(null);
          await confirmConfig.action();
        }}
      />
    </div>
  );
}
