# API & Socket Reference

Motive uses REST endpoints for basic requests and Socket.IO for real-time multiplayer updates.

## Authentication & Headers

All player requests must include session authentication headers:

- `x-session-token`: The private session token created when the player first joins or creates a game.
- `x-user-id`: The player's user ID (validated against the session token on the server).

## REST Endpoints

All endpoints are available under `/api/games`:

| Method | Endpoint | Description | Permissions |
|--------|---|---|---|
| `POST` | `/` | Create a new game room | Anyone |
| `POST` | `/:id/join` | Join an existing room with code or ID | Anyone |
| `POST` | `/:id/ready` | Toggle ready status | Joined Player |
| `POST` | `/:id/settings` | Update game timers and rules | Host Only |
| `POST` | `/:id/start` | Start the game and deal roles | Host Only |
| `POST` | `/:id/actions` | Submit a secret night action | Living Active Role |
| `POST` | `/:id/votes` | Submit a vote for elimination | Living Player |
| `POST` | `/:id/pause` | Pause the active match timer | Host Only |
| `POST` | `/:id/resume` | Resume the paused match | Host Only |
| `POST` | `/:id/restart` | Send everyone back to the lobby | Host Only |
| `POST` | `/:id/end` | Stop the active match | Host Only |
| `POST` | `/:id/remove-player` | Kick a player from the game | Host Only |
| `POST` | `/:id/leave` | Leave the game room | Joined Player |
| `DELETE` | `/:id` | Delete the game room | Host Only |
| `GET` | `/:id/state` | Get current game state filtered for you | Joined Player |

## Socket.IO Events

### Client to Server

- `game:create`: Create a new room.
- `game:join`: Join an existing room.
- `game:reconnect`: Restore player connection after refresh.
- `game:ready`: Toggle ready status.
- `game:settings`: Save settings (Host only).
- `game:start`: Start the match (Host only).
- `game:action`: Submit night target.
- `game:vote`: Submit vote.
- `game:pause` / `game:resume`: Pause or resume timer (Host only).
- `game:restart` / `game:end`: Restart or end match (Host only).
- `game:leave`: Leave the match.

### Server to Client

- `game:state`: Broadcasts updated game state (filtered so players only see what their role allows).
- `game:removed`: Sent to a player when they are kicked by the host.
- `game:deleted`: Sent to all players when the game room is deleted.
