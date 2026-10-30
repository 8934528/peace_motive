# Database Design

Motive uses PostgreSQL for reliable, atomic data storage. Transactions and unique constraints guarantee that votes and night actions cannot be duplicated or corrupted.

## Database Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | Player identities and secret sessions | `id`, `username`, `session_token`, `created_at` |
| `roles` | Definitions of available roles | `id`, `key`, `name`, `team`, `ability`, `objective` |
| `games` | Game rooms and match state | `id`, `code`, `name`, `host_id`, `status`, `current_phase`, `current_round`, `settings` |
| `game_players` | Players participating in a game | `id`, `game_id`, `user_id`, `seat_number`, `is_alive`, `is_ready` |
| `game_roles` | Secret assigned roles per match | `id`, `game_id`, `player_id`, `role_id`, `assigned_at` |
| `night_actions` | Night abilities submitted by players | `id`, `game_id`, `round`, `actor_player_id`, `target_player_id`, `status`, `result` |
| `votes` | Daily elimination votes | `id`, `game_id`, `round`, `is_runoff`, `voter_player_id`, `target_player_id` |
| `game_events` | Match timeline and audit logs | `id`, `game_id`, `round`, `phase`, `event_type`, `metadata` |

## Integrity & Safety

- **One Vote per Round**: A unique index on `(game_id, round, is_runoff, voter_player_id)` blocks duplicate votes.
- **One Night Action per Round**: A unique index on `(game_id, round, actor_player_id)` prevents submitting multiple night actions.
- **One Seat per Player**: Unique index on `(game_id, user_id)` stops double-joining.
- **Transactions with Locks**: State changes run inside database transactions using `FOR UPDATE` row locks to prevent race conditions.
