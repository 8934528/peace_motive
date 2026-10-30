import { useGameEvents } from "../hooks/useGameEvents";
import type { GameEvent } from "../types/gameTypes";
import { EmptyState } from "./StateViews";

export function GameLog() {
  const { events } = useGameEvents();

  return (
    <div className="panel-card game-log-card">
      <div className="section-heading">
        <div>
          <span className="step-label">HISTORY</span>
          <h2>Game Log</h2>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState message="No events recorded yet" />
      ) : (
        <div className="game-log-list">
          {events.map((event: GameEvent) => (
            <div key={event.id} className="game-log-item">
              <span className="log-round">
                {event.round > 0 ? `R${event.round}` : "LOBBY"}
              </span>
              <span className="log-message">{event.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
