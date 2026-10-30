import { useEffect, useState } from "react";
import { Badge } from "../badges/Badge";
import { INVESTIGATION_RESULTS, ROLES } from "../constants/gameConstants";
import { useGamePhase } from "../hooks/useGamePhase";
import { useNightAction } from "../hooks/useNightAction";
import { usePlayerRole } from "../hooks/usePlayerRole";
import { usePlayers } from "../hooks/usePlayers";
import { useShortcuts } from "../hooks/useShortcuts";
import type { DetectiveInvestigation, GamePlayer, MafiaTeammate } from "../types/gameTypes";

export function NightAction() {
  const { round } = useGamePhase();
  const { isAlive, players } = usePlayers();
  const { role, mafiaTeammates, investigations } = usePlayerRole();
  const {
    canActTonight,
    submittedTargetId,
    availableTargets,
    submitNightAction,
    busy
  } = useNightAction();

  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    setSelectedId(submittedTargetId ?? "");
  }, [submittedTargetId, round]);

  useShortcuts(
    {
      SUBMIT: () => {
        if (selectedId && !busy && canActTonight && !submittedTargetId) {
          void submitNightAction(selectedId);
        }
      }
    },
    isAlive && canActTonight && !submittedTargetId && Boolean(selectedId)
  );

  if (!isAlive) {
    return (
      <div className="panel-card">
        <span className="step-label">NIGHT ACTION</span>
        <h3>You have been eliminated</h3>
        <p className="muted-copy">
          Dead players cannot perform night actions. Watch the night unfold.
        </p>
      </div>
    );
  }

  if (!role || role.key === ROLES.VILLAGER) {
    return (
      <div className="panel-card">
        <span className="step-label">NIGHT {round}</span>
        <h3>The town is sleeping</h3>
        <p className="muted-copy">
          You have no special night action. Wait for morning to discuss and
          vote.
        </p>
      </div>
    );
  }

  const actionHeading = (() => {
    switch (role.key) {
      case ROLES.MAFIA:
        return "Choose a player";
      case ROLES.DOCTOR:
        return "Protect a player";
      case ROLES.DETECTIVE:
        return "Investigate a player";
      default:
        return "Choose a player";
    }
  })();

  const buttonLabel =
    role.key === ROLES.DETECTIVE ? "Investigate" : "Confirm";

  const submittedTargetName = submittedTargetId
    ? players.find((p: GamePlayer) => p.id === submittedTargetId)?.username ??
    "Player"
    : null;

  const currentRoundInvestigation = investigations.find(
    (inv: DetectiveInvestigation) => inv.round === round
  );

  return (
    <div className="panel-card">
      <div className="section-heading">
        <div>
          <span className="step-label">
            {role.name.toUpperCase()} NIGHT ACTION
          </span>
          <h2>{actionHeading}</h2>
        </div>
        <Badge variant={role.key === ROLES.MAFIA ? "mafia" : "town"}>
          {role.name}
        </Badge>
      </div>

      {role.key === ROLES.MAFIA && mafiaTeammates.length > 0 && (
        <div className="teammate-box mb-3">
          <span className="field-label">MAFIA TEAM</span>
          <div className="teammate-list">
            {mafiaTeammates.map((mate: MafiaTeammate) => {
              const targetName = mate.selectedTargetId
                ? players.find(
                  (p: GamePlayer) => p.id === mate.selectedTargetId
                )?.username
                : null;
              return (
                <div key={mate.playerId} className="teammate-row">
                  <span>{mate.username}</span>
                  <span className="teammate-target">
                    {targetName
                      ? `Target: ${targetName}`
                      : mate.isAlive
                        ? "Selecting..."
                        : "Dead"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {submittedTargetId ? (
        <div className="submitted-banner">
          <strong>Action submitted</strong>
          <p>
            You selected <strong>{submittedTargetName}</strong>. Waiting for the
            night phase to end.
          </p>
        </div>
      ) : canActTonight ? (
        <>
          <div
            className="target-radio-list"
            role="radiogroup"
            aria-label={actionHeading}
          >
            {availableTargets.map((target: GamePlayer) => (
              <label
                key={target.id}
                className={`radio-option-row ${selectedId === target.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="night-target"
                  value={target.id}
                  checked={selectedId === target.id}
                  onChange={() => setSelectedId(target.id)}
                />
                <span className="radio-player-name">{target.username}</span>
                <span className="radio-seat">Seat #{target.seatNumber}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            className="primary-button mt-3"
            disabled={!selectedId || busy}
            onClick={() => submitNightAction(selectedId)}
            title={`${buttonLabel} (Ctrl + Enter)`}
          >
            {buttonLabel}
          </button>
        </>
      ) : (
        <p className="muted-copy">This action is no longer available</p>
      )}

      {role.key === ROLES.DETECTIVE && currentRoundInvestigation && (
        <div className="investigation-result-card mt-3">
          <span className="field-label">INVESTIGATION</span>
          <p className="investigation-copy">
            <strong>{currentRoundInvestigation.targetUsername}</strong> is:
          </p>
          <div className="mt-1">
            <Badge
              variant={
                currentRoundInvestigation.result === INVESTIGATION_RESULTS.MAFIA
                  ? "mafia"
                  : "town"
              }
            >
              {currentRoundInvestigation.result}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
