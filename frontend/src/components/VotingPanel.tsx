import { useEffect, useState } from "react";
import { usePlayers } from "../hooks/usePlayers";
import { useShortcuts } from "../hooks/useShortcuts";
import { useVoting } from "../hooks/useVoting";
import type { GamePlayer } from "../types/gameTypes";

export function VotingPanel() {
  const { isAlive, players } = usePlayers();
  const { canVoteToday, hasSubmittedVote, submittedVoteTargetId, votablePlayers, isRunoff, submitVote, busy } = useVoting();

  const [selectedTarget, setSelectedTarget] = useState<string>("");

  useEffect(() => {
    setSelectedTarget(submittedVoteTargetId ?? "");
  }, [submittedVoteTargetId, isRunoff]);

  useShortcuts(
    {
      SUBMIT: () => {
        if (selectedTarget && !busy && canVoteToday && !hasSubmittedVote) {
          void submitVote(selectedTarget === "NOBODY" ? null : selectedTarget);
        }
      }
    },
    isAlive && canVoteToday && !hasSubmittedVote && Boolean(selectedTarget)
  );

  if (!isAlive) {
    return (
      <div className="panel-card">
        <span className="step-label">VOTING</span>
        <h3>You have been eliminated</h3>
        <p className="muted-copy">
          Dead players cannot vote. Watch the town make its decision.
        </p>
      </div>
    );
  }

  const submittedName = submittedVoteTargetId === "NOBODY" ? "Nobody" : submittedVoteTargetId ? players.find((p: GamePlayer) => p.id === submittedVoteTargetId) ?.username ?? "Player" : null;

  return (
    <div className="panel-card">
      <div className="section-heading">
        <div>
          <span className="step-label">
            {isRunoff ? "RUNOFF VOTE" : "TOWN VOTE"}
          </span>
          <h2>WHO IS MAFIA?</h2>
        </div>
      </div>

      {isRunoff && (
        <p className="runoff-notice">
          The previous vote was tied. Vote between the tied suspects below.
        </p>
      )}

      {hasSubmittedVote ? (
        <div className="submitted-banner">
          <strong>Vote submitted</strong>
          <p>
            You voted for <strong>{submittedName}</strong>. Waiting for other
            players to vote.
          </p>
        </div>
      ) : canVoteToday ? (
        <>
          <div
            className="target-radio-list"
            role="radiogroup"
            aria-label="Who is Mafia?"
          >
            {votablePlayers.map((target: GamePlayer) => (
              <label
                key={target.id}
                className={`radio-option-row ${selectedTarget === target.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="vote-target"
                  value={target.id}
                  checked={selectedTarget === target.id}
                  onChange={() => setSelectedTarget(target.id)}
                />
                <span className="radio-player-name">{target.username}</span>
                <span className="radio-seat">Seat #{target.seatNumber}</span>
              </label>
            ))}

            <label
              className={`radio-option-row ${selectedTarget === "NOBODY" ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="vote-target"
                value="NOBODY"
                checked={selectedTarget === "NOBODY"}
                onChange={() => setSelectedTarget("NOBODY")}
              />
              <span className="radio-player-name">Nobody</span>
              <span className="radio-seat">Skip elimination</span>
            </label>
          </div>

          <button
            type="button"
            className="primary-button mt-3"
            disabled={!selectedTarget || busy}
            onClick={() =>
              submitVote(selectedTarget === "NOBODY" ? null : selectedTarget)
            }
            title="Vote (Ctrl + Enter)"
          >
            Vote
          </button>
        </>
      ) : (
        <p className="muted-copy">Voting has ended</p>
      )}
    </div>
  );
}
