import type React from "react";
import { RoleBadge } from "../badges/RoleBadge";
import { AliveBadge, HostBadge, ReadyBadge, YouBadge } from "../badges/StatusBadge";
import { GAME_PHASES } from "../constants/gameConstants";
import { Check, IconButton, Skull, UserMinus, Users } from "../icons/GameIcons";
import type { GamePlayer } from "../types/gameTypes";

export type PlayerCardProps = {
  player: GamePlayer;
  isCurrentUser: boolean;
  phase: string;
  canRemove: boolean;
  onSelectPlayer?: (player: GamePlayer) => void;
  onRemovePlayer?: (player: GamePlayer) => void;
  key?: React.Key;
};

export function PlayerCard({
  player,
  isCurrentUser,
  phase,
  canRemove,
  onSelectPlayer,
  onRemovePlayer
}: PlayerCardProps) {
  const isLobby = phase === GAME_PHASES.LOBBY;

  return (
    <div
      className={`player-row ${!player.isAlive ? "player-row-dead" : ""} ${isCurrentUser ? "player-row-you" : ""}`.trim()}
    >
      <span className="player-number">
        {String(player.seatNumber).padStart(2, "0")}
      </span>

      <span className="player-avatar">
        {player.isAlive ? <Users size={15} /> : <Skull size={15} />}
      </span>

      <button
        type="button"
        className="player-name-btn"
        onClick={() => onSelectPlayer?.(player)}
        title={`View ${player.username}`}
      >
        <span className="player-name-text">{player.username}</span>
      </button>

      <div className="player-badges">
        {isCurrentUser && <YouBadge />}
        {player.isHost && <HostBadge />}
        {isLobby ? (
          <ReadyBadge isReady={player.isReady} />
        ) : (
          <AliveBadge isAlive={player.isAlive} />
        )}
        {player.revealedRole && (
          <RoleBadge roleKey={player.revealedRole.key} />
        )}
        {phase === GAME_PHASES.DAY_VOTING && player.isAlive && player.hasVoted && (
          <span className="voted-indicator" title="Vote submitted">
            <Check size={12} /> Voted
          </span>
        )}
      </div>

      <span
        className={`status-dot ${player.isConnected ? "active" : ""}`}
        title={player.isConnected ? "Online" : "Offline"}
      />

      {canRemove && !player.isHost && onRemovePlayer && (
        <IconButton
          tooltip={`Remove ${player.username}`}
          variant="danger"
          className="icon-button-xs"
          onClick={() => onRemovePlayer(player)}
        >
          <UserMinus size={14} />
        </IconButton>
      )}
    </div>
  );
}
