import { Badge } from "../badges/Badge";
import { useGame } from "../hooks/useGame";
import { useVoting } from "../hooks/useVoting";
import type { VoteTallyEntry } from "../types/gameTypes";

export function VoteResults() {
  const { gameState } = useGame();
  const { voteSummary } = useVoting();

  const message = voteSummary?.message ?? gameState?.game.lastVoteMessage ?? "Nobody was eliminated";

  return (
    <div className="panel-card">
      <div className="section-heading">
        <div>
          <span className="step-label">VERDICT</span>
          <h2>Vote Results</h2>
        </div>
        {voteSummary?.eliminatedUsername ? (
          <Badge variant="dead">ELIMINATED</Badge>
        ) : (
          <Badge variant="neutral">NO ELIMINATION</Badge>
        )}
      </div>

      <div className="result-callout mb-3">
        <strong>{message}</strong>
      </div>

      {voteSummary && voteSummary.tallies.length > 0 && (
        <div className="vote-tally-table">
          <div className="tally-header">
            <span>Target</span>
            <span>Votes</span>
          </div>
          {voteSummary.tallies.map((entry: VoteTallyEntry) => (
            <div
              key={entry.targetPlayerId ?? "nobody"}
              className="tally-row"
            >
              <div>
                <strong>{entry.targetUsername}</strong>
                {entry.voters && entry.voters.length > 0 && (
                  <small className="tally-voters">
                    Voted by: {entry.voters.join(", ")}
                  </small>
                )}
              </div>
              <span className="tally-count">{entry.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
