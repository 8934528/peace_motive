import { RoleBadge } from "../badges/RoleBadge";
import { TeamBadge } from "../badges/TeamBadge";
import { IconButton, X } from "../icons/GameIcons";
import type { Role } from "../types/gameTypes";

export type RoleDetailsModalProps = {
  open: boolean;
  role: Role | null;
  onClose: () => void;
};

export function RoleDetailsModal({
  open,
  role,
  onClose
}: RoleDetailsModalProps) {
  if (!open || !role) return null;

  return (
    <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
      <div className="modal-card modal-card-sm">
        <div className="modal-card-header">
          <h3>Your Role</h3>
          <IconButton tooltip="Close role details" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        <div className="modal-card-body">
          <div className="badge-row">
            <RoleBadge roleKey={role.key} />
            <TeamBadge team={role.team} />
          </div>

          <div className="detail-group">
            <span className="field-label">DESCRIPTION</span>
            <p className="detail-copy">{role.description}</p>
          </div>

          <div className="detail-group">
            <span className="field-label">ABILITY</span>
            <p className="detail-copy">{role.ability}</p>
          </div>

          <div className="detail-group">
            <span className="field-label">OBJECTIVE</span>
            <p className="detail-copy">{role.objective}</p>
          </div>
        </div>

        <div className="modal-card-footer">
          <button
            type="button"
            className="primary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
