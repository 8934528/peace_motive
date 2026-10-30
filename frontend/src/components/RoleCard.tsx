import { RoleBadge } from "../badges/RoleBadge";
import { TeamBadge } from "../badges/TeamBadge";
import { ROLES } from "../constants/gameConstants";
import { usePlayerRole } from "../hooks/usePlayerRole";
import { HeartPulse, Search, Shield, Skull } from "../icons/GameIcons";
import type { MafiaTeammate } from "../types/gameTypes";

export function RoleCard({ compact = false }: { compact?: boolean }) {
  const { role, mafiaTeammates } = usePlayerRole();

  if (!role) {
    return null;
  }

  const renderRoleIcon = () => {
    switch (role.key) {
      case ROLES.MAFIA:
        return <Skull size={20} />;
      case ROLES.DOCTOR:
        return <HeartPulse size={20} />;
      case ROLES.DETECTIVE:
        return <Search size={20} />;
      default:
        return <Shield size={20} />;
    }
  };

  if (compact) {
    return (
      <div className="panel-card role-card-compact">
        <div className="role-compact-header">
          <div className="role-compact-title">
            <span className="phase-badge-icon">{renderRoleIcon()}</span>
            <div>
              <span className="step-label">YOUR ROLE</span>
              <strong>{role.name}</strong>
            </div>
          </div>
          <div className="badge-row">
            <RoleBadge roleKey={role.key} />
            <TeamBadge team={role.team} />
          </div>
        </div>
        <p className="role-compact-copy">{role.ability}</p>
      </div>
    );
  }

  return (
    <div className="panel-card role-reveal-card">
      <span className="step-label">YOUR ROLE</span>
      <div className="role-title-bar">
        <span className="phase-badge-icon">{renderRoleIcon()}</span>
        <h2>{role.name}</h2>
        <RoleBadge roleKey={role.key} />
      </div>

      <div className="row g-3 mt-1">
        <div className="col-md-4">
          <div className="info-box">
            <span className="field-label">TEAM</span>
            <div className="mt-1">
              <TeamBadge team={role.team} />
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="info-box">
            <span className="field-label">SHORT DESCRIPTION</span>
            <p className="info-box-copy">{role.description}</p>
          </div>
        </div>

        <div className="col-md-6">
          <div className="info-box">
            <span className="field-label">ABILITY</span>
            <p className="info-box-copy">{role.ability}</p>
          </div>
        </div>

        <div className="col-md-6">
          <div className="info-box">
            <span className="field-label">OBJECTIVE</span>
            <p className="info-box-copy">{role.objective}</p>
          </div>
        </div>
      </div>

      {role.key === ROLES.MAFIA && mafiaTeammates.length > 0 && (
        <div className="info-box mt-3">
          <span className="field-label">MAFIA TEAMMATES</span>
          <div className="badge-row mt-2">
            {mafiaTeammates.map((mate: MafiaTeammate) => (
              <span key={mate.playerId} className="teammate-chip">
                {mate.username} ({mate.isAlive ? "Alive" : "Dead"})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
