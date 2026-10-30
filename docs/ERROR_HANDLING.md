# Error Handling

Motive uses clear, safe error handling so that errors are easy for players to understand without leaking system internals.

## Core Rules

1. **Clean Error Messages**: Players see friendly English messages, never stack traces or raw database errors.
2. **Proper HTTP Status Codes**:
   - `400 Bad Request`: Invalid action (e.g. Voting during the night phase, invalid name).
   - `401 / 403 Forbidden`: Unauthorized action (e.g. Non-host trying to start match, wrong session token).
   - `404 Not Found`: Game room or player does not exist.
   - `409 Conflict`: Replay or duplicate action (e.g. Submitting a vote twice).
   - `429 Too Many Requests`: Rate limit exceeded.
3. **Fail-Safe Game Engine**: If an unexpected exception happens during a phase timer, the match logs the error and maintains state integrity.

## Common Messages

| Message | Meaning |
|---|---|
| `Not enough players.` | Need at least 4 players to start the game. |
| `Only the host can start the game.` | Non-host attempted host-only action. |
| `You already voted.` | Duplicate vote attempt in the same round. |
| `You cannot vote for yourself.` | Self-voting is prohibited. |
| `That player is no longer alive.` | Target is eliminated. |
| `Voting has ended.` | Vote received after the timer expired. |
| `Game not found.` | Invalid room code or ID. |
| `Too many requests. Please slow down.` | Rate limit triggered. |
