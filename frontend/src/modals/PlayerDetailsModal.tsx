import { RoleBadge } from "../badges/RoleBadge";
import { AliveBadge, HostBadge, ReadyBadge } from "../badges/StatusBadge";
import { TeamBadge } from "../badges/TeamBadge";
import { IconButton, X } from "../icons/GameIcons";
import type { GamePlayer } from "../types/gameTypes";

export type PlayerDetailsModalProps = {
  open: boolean;
  player: GamePlayer | null;
  canRemove?: boolean;
  onRemoveRequest?: (player: GamePlayer) => void;
  onClose: () => void;
};

export function PlayerDetailsModal({
  open,
  player,
  canRemove = false,
  onRemoveRequest,
  onClose
}: PlayerDetailsModalProps) {
  if (!open || !player) return null;

  return (
    <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
      <div className="modal-card modal-card-sm">
        <div className="modal-card-header">
          <h3>Player Details</h3>
          <IconButton tooltip="Close player details" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        <div className="modal-card-body">
          <div className="detail-group">
            <span className="field-label">PLAYER</span>
            <strong className="detail-title">
              Seat #{player.seatNumber} — {player.username}
            </strong>
          </div>

          <div className="badge-row">
            <AliveBadge isAlive={player.isAlive} />
            <ReadyBadge isReady={player.isReady} />
            {player.isHost && <HostBadge />}
            {player.revealedRole && (
              <>
                <RoleBadge roleKey={player.revealedRole.key} />
                <TeamBadge team={player.revealedRole.team} />
              </>
            )}
          </div>

          <div className="detail-group">
            <span className="field-label">CONNECTION</span>
            <p className="detail-copy">
              {player.isConnected ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="modal-card-footer">
          {canRemove && onRemoveRequest && !player.isHost && (
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                onClose();
                onRemoveRequest(player);
              }}
            >
              Remove Player
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
