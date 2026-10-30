# System Architecture

Motive is built with a server-authoritative design. The server controls all rules, timers, and state transitions, while the client simply displays the state and sends player intentions.

## System Components

```text
┌─────────────────────────┐             ┌─────────────────────────┐
│     Frontend (React)    │             │   Backend (Express +    │
│  - Bootstrap UI         │◄──Socket───►│    Socket.IO Server)    │
│  - GameContext State    │    HTTP     │  - GameEngine Service   │
│  - User Actions         │             │  - Controllers & Rules  │
└─────────────────────────┘             └────────────┬────────────┘
                                                     │
                                                     ▼
                                        ┌─────────────────────────┐
                                        │   PostgreSQL Database   │
                                        │  - Atomic Transactions  │
                                        │  - Row Locks FOR UPDATE │
                                        └─────────────────────────┘
```

### 1. Frontend (`frontend/src/`)

- **React + TypeScript**: Modular components, modals, and views.
- **GameContext**: Manages active connection, game state, local session tokens, and countdown timers.
- **Single-Player Mode**: Includes a local bot engine for practicing offline.

### 2. Backend (`backend/src/`)

- **Express API**: Handles room creation, joins, actions, and settings.
- **Socket.IO Service**: Pushes instant state updates to players.
- **Controllers**:
  - `LobbyController`: Rooms, players, codes, and settings.
  - `GameController`: Starts games, filters state, and coordinates rounds.
  - `RoleController`: Distributes balanced roles.
  - `NightController`: Resolves night kills, protections, and investigations.
  - `VotingController`: Manages day votes, runoff ties, and eliminations.
  - `PhaseController`: Advances the state machine safely.
  - `WinConditionController`: Detects when Town or Mafia wins.

### 3. Database (`PostgreSQL`)

- Stores persistent match states, roles, and event logs.
- Uses transactions and `FOR UPDATE` row locks to prevent race conditions when multiple players act at the same time.

## Security & State Privacy

1. **Never Trust the Client**: All actions (votes, targets, kicks, starts) are checked on the server.
2. **Server-Side Secret Filtering**: The server filters the state payload before sending it to a player:
   - Town players never see who the Mafia members are.
   - Detectives only see their own investigation results.
   - The full truth is only revealed when the game reaches `GAME_OVER`.
3. **Session Authentication**: Actions require a verified session token.
4. **Rate Limiting**: Protects HTTP and WebSocket connections against flooding.
