import { useGameTimer } from "../hooks/useGameTimer";
import { Clock } from "../icons/GameIcons";

export function PhaseTimer() {
  const { secondsLeft, progressPercent, hasTimer } = useGameTimer();

  if (!hasTimer) {
    return null;
  }

  return (
    <div className="phase-timer-box" aria-live="off">
      <div className="phase-timer-row">
        <span className="phase-timer-label">
          <Clock size={13} /> Time remaining:
        </span>
        <strong
          className={`phase-timer-value ${secondsLeft <= 5 ? "timer-urgent" : ""}`}
        >
          {secondsLeft}s
        </strong>
      </div>
      <div className="phase-timer-track">
        <span style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}

