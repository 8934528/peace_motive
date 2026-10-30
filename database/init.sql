CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(20) NOT NULL,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_session_token ON users (session_token);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    key VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    team VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    ability TEXT NOT NULL,
    objective TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_roles_key ON roles (key);
CREATE INDEX IF NOT EXISTS idx_roles_team ON roles (team);

INSERT INTO roles (key, name, team, description, ability, objective, enabled)
VALUES
    (
        'MAFIA',
        'Mafia',
        'MAFIA',
        'You work in secret with the other Mafia members to take control of the town.',
        'Choose one player to eliminate each night.',
        'Equal or outnumber the living Town players.',
        TRUE
    ),
    (
        'DOCTOR',
        'Doctor',
        'TOWN',
        'You are the town medic who can save lives during the night.',
        'Protect one player each night from elimination.',
        'Keep the Town alive and help eliminate all Mafia.',
        TRUE
    ),
    (
        'DETECTIVE',
        'Detective',
        'TOWN',
        'You investigate suspects in the dark to uncover the truth.',
        'Investigate one player each night to learn if they are Mafia.',
        'Find the Mafia and help the Town survive.',
        TRUE
    ),
    (
        'VILLAGER',
        'Villager',
        'TOWN',
        'You are an ordinary citizen trying to figure out who to trust.',
        'No night action. Use discussion and voting during the day.',
        'Identify and vote out all Mafia members.',
        TRUE
    )
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    team = EXCLUDED.team,
    description = EXCLUDED.description,
    ability = EXCLUDED.ability,
    objective = EXCLUDED.objective,
    enabled = EXCLUDED.enabled;

CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(40) NOT NULL DEFAULT 'Motive Match',
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'LOBBY',
    current_phase VARCHAR(24) NOT NULL DEFAULT 'LOBBY',
    current_round INTEGER NOT NULL DEFAULT 0,
    is_runoff BOOLEAN NOT NULL DEFAULT FALSE,
    runoff_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    join_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    paused_remaining_seconds INTEGER,
    winner_team VARCHAR(20),
    winner_reason TEXT,
    last_morning_message TEXT,
    last_vote_message TEXT,
    phase_started_at TIMESTAMPTZ,
    phase_ends_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE games ALTER COLUMN code TYPE VARCHAR(64);
ALTER TABLE games ADD COLUMN IF NOT EXISTS join_codes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE games ADD COLUMN IF NOT EXISTS paused_remaining_seconds INTEGER;

CREATE INDEX IF NOT EXISTS idx_games_code ON games (code);
CREATE INDEX IF NOT EXISTS idx_games_host_id ON games (host_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);
CREATE INDEX IF NOT EXISTS idx_games_current_phase ON games (current_phase);

CREATE TABLE IF NOT EXISTS game_join_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    used_by_player_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_join_codes_code ON game_join_codes (code);
CREATE INDEX IF NOT EXISTS idx_game_join_codes_game_id ON game_join_codes (game_id);

CREATE TABLE IF NOT EXISTS game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_number SMALLINT NOT NULL,
    is_alive BOOLEAN NOT NULL DEFAULT TRUE,
    is_ready BOOLEAN NOT NULL DEFAULT FALSE,
    is_connected BOOLEAN NOT NULL DEFAULT TRUE,
    last_protected_player_id UUID,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminated_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    CONSTRAINT uq_game_players_game_user UNIQUE (game_id, user_id),
    CONSTRAINT uq_game_players_game_seat UNIQUE (game_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players (game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players (user_id);
CREATE INDEX IF NOT EXISTS idx_game_players_is_alive ON game_players (game_id, is_alive);

CREATE TABLE IF NOT EXISTS game_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_game_roles_game_player UNIQUE (game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_game_roles_game_id ON game_roles (game_id);
CREATE INDEX IF NOT EXISTS idx_game_roles_player_id ON game_roles (player_id);
CREATE INDEX IF NOT EXISTS idx_game_roles_role_id ON game_roles (role_id);

CREATE TABLE IF NOT EXISTS night_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    actor_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    target_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    action_type VARCHAR(24) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    result VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT uq_night_actions_actor_round UNIQUE (game_id, round, actor_player_id)
);

CREATE INDEX IF NOT EXISTS idx_night_actions_game_id ON night_actions (game_id);
CREATE INDEX IF NOT EXISTS idx_night_actions_round ON night_actions (game_id, round);
CREATE INDEX IF NOT EXISTS idx_night_actions_actor_player_id ON night_actions (actor_player_id);
CREATE INDEX IF NOT EXISTS idx_night_actions_target_player_id ON night_actions (target_player_id);

CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    is_runoff BOOLEAN NOT NULL DEFAULT FALSE,
    voter_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    target_player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
    vote_type VARCHAR(20) NOT NULL DEFAULT 'ELIMINATE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_votes_game_round_voter UNIQUE (game_id, round, is_runoff, voter_player_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_game_id ON votes (game_id);
CREATE INDEX IF NOT EXISTS idx_votes_round ON votes (game_id, round, is_runoff);
CREATE INDEX IF NOT EXISTS idx_votes_voter_player_id ON votes (voter_player_id);
CREATE INDEX IF NOT EXISTS idx_votes_target_player_id ON votes (target_player_id);

CREATE TABLE IF NOT EXISTS game_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round INTEGER NOT NULL DEFAULT 0,
    phase VARCHAR(24) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    player_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
    target_player_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events (game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_round ON game_events (game_id, round);
CREATE INDEX IF NOT EXISTS idx_game_events_phase ON game_events (game_id, phase);
