import { GAME_PHASES } from "../constants/gameConstants";
import { useGamePhase } from "../hooks/useGamePhase";
import { Eye, Moon, Sun, Vote } from "../icons/GameIcons";
import { PhaseTimer } from "./PhaseTimer";

export function PhaseHeader() {
  const { phase, phaseTitle, phaseSubtitle } = useGamePhase();

  const renderPhaseIcon = () => {
    switch (phase) {
      case GAME_PHASES.NIGHT:
        return <Moon size={18} />;
      case GAME_PHASES.MORNING:
      case GAME_PHASES.DAY_DISCUSSION:
        return <Sun size={18} />;
      case GAME_PHASES.DAY_VOTING:
      case GAME_PHASES.VOTE_RESULT:
        return <Vote size={18} />;
      default:
        return <Eye size={18} />;
    }
  };

  return (
    <div className="phase-header-card">
      <div className="row g-3 align-items-center">
        <div className="col-md-7">
          <div className="phase-title-group">
            <span className="phase-badge-icon">{renderPhaseIcon()}</span>
            <div>
              <h2 className="phase-main-title">{phaseTitle}</h2>
              <p className="phase-sub-copy">{phaseSubtitle}</p>
            </div>
          </div>
        </div>
        <div className="col-md-5">
          <PhaseTimer />
        </div>
      </div>
    </div>
  );
}

