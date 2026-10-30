# Game Flow

Each match flows through eight structured phases controlled by the server.

## Phases

```text
┌───────────┐      ┌─────────────┐      ┌───────────┐      ┌─────────────┐
│ 1. LOBBY  │ ───► │ 2. REVEAL   │ ───► │ 3. NIGHT  │ ───► │ 4. MORNING  │
└───────────┘      └─────────────┘      └───────────┘      └──────┬──────┘
                                                                  │
┌───────────┐      ┌─────────────┐      ┌───────────┐             │
│ 8. OVER   │ ◄─── │ 7. RESULT   │ ◄─── │ 6. VOTING │ ◄─── 5. DAY │
└───────────┘      └─────────────┘      └───────────┘             ▼
      ▲                                       │
      └────── Win Condition Met? ─────────────┘
```

1. **Lobby (`LOBBY`)**: Players join using room or player codes, set ready status, and the host configures timers and settings.
2. **Role Reveal (`ROLE_REVEAL`)**: The server deals hidden roles. Each player sees only their secret role.
3. **Night (`NIGHT`)**: Active roles choose their secret targets:
   - Mafia picks a player to eliminate.
   - Doctor picks a player to protect.
   - Detective picks a player to investigate.
4. **Morning Report (`MORNING`)**: The server reveals if anyone was eliminated during the night (or if the Doctor successfully saved them).
5. **Day Discussion (`DAY_DISCUSSION`)**: Living players discuss their findings, share theories, and debate suspicions.
6. **Day Voting (`DAY_VOTING`)**: Living players vote to eliminate a suspect or vote for Nobody. If there is a tie, an optional runoff vote takes place.
7. **Vote Result (`VOTE_RESULT`)**: The vote tally is revealed and the eliminated player is announced.
8. **Game Over (`GAME_OVER`)**: Triggered as soon as Town or Mafia achieves victory. All players' true roles are revealed.

## Automatic Timers

Every phase has a server countdown timer. When the timer reaches zero—or when all eligible players have submitted their moves—the game advances to the next phase automatically.
