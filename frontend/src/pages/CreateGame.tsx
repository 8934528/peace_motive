import React, { useCallback, useState } from "react";
import { DEFAULT_GAME_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, ROLE_DISTRIBUTION } from "../config/gameConfig";
import { preventSingleKeySubmit } from "../config/shortcutsConfig";
import { APP_VIEWS, ROLES, TIE_RULES, type TieRule } from "../constants/gameConstants";
import { useGame } from "../hooks/useGame";
import { useShortcuts } from "../hooks/useShortcuts";
import { ArrowLeft, IconButton, Plus } from "../icons/GameIcons";

export function CreateGame() {
  const {
    playerName,
    setPlayerName,
    createGame,
    navigateTo,
    busy,
    connected
  } = useGame();

  const [gameName, setGameName] = useState("Motive Match");
  const [nightTime, setNightTime] = useState(DEFAULT_GAME_SETTINGS.nightTime);
  const [discussionTime, setDiscussionTime] = useState(
    DEFAULT_GAME_SETTINGS.discussionTime
  );
  const [votingTime, setVotingTime] = useState(
    DEFAULT_GAME_SETTINGS.votingTime
  );
  const [allowDoctorSelfSave, setAllowDoctorSelfSave] = useState(
    DEFAULT_GAME_SETTINGS.allowDoctorSelfSave
  );
  const [allowRepeatedDoctorSave, setAllowRepeatedDoctorSave] = useState(
    DEFAULT_GAME_SETTINGS.allowRepeatedDoctorSave
  );
  const [tieRule, setTieRule] = useState<TieRule>(
    DEFAULT_GAME_SETTINGS.tieRule
  );

  const canSubmit = !busy && connected && playerName.trim().length >= 2;

  const submitForm = useCallback(async () => {
    if (!canSubmit) return;
    await createGame(gameName, {
      nightTime,
      discussionTime,
      votingTime,
      allowDoctorSelfSave,
      allowRepeatedDoctorSave,
      tieRule
    });
  }, [
    canSubmit,
    createGame,
    gameName,
    nightTime,
    discussionTime,
    votingTime,
    allowDoctorSelfSave,
    allowRepeatedDoctorSave,
    tieRule
  ]);

  useShortcuts(
    {
      SUBMIT: () => {
        void submitForm();
      }
    },
    canSubmit
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitForm();
  };

  return (
    <div className="container-fluid py-4 px-3 px-lg-5">
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="panel-card">
            <div className="section-heading">
              <div className="d-flex align-items-center gap-2">
                <IconButton
                  tooltip="Back to home"
                  onClick={() => navigateTo(APP_VIEWS.HOME)}
                >
                  <ArrowLeft size={16} />
                </IconButton>
                <div>
                  <span className="step-label">HOST SETUP</span>
                  <h2>Create a Game</h2>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} onKeyDown={preventSingleKeySubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="field-label" htmlFor="create-player-name">
                    YOUR NAME
                  </label>
                  <input
                    id="create-player-name"
                    type="text"
                    className="form-control pm-input"
                    value={playerName}
                    maxLength={20}
                    minLength={2}
                    required
                    placeholder="Your display name"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPlayerName(e.target.value)
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="field-label" htmlFor="create-game-name">
                    GAME NAME
                  </label>
                  <input
                    id="create-game-name"
                    type="text"
                    className="form-control pm-input"
                    value={gameName}
                    maxLength={40}
                    required
                    placeholder="Motive Match"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setGameName(e.target.value)
                    }
                  />
                </div>

                <div className="col-md-4 col-6">
                  <label className="field-label">NIGHT TIMER (S)</label>
                  <input
                    type="number"
                    className="form-control pm-input"
                    min={10}
                    max={180}
                    value={nightTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNightTime(Number(e.target.value))
                    }
                  />
                </div>

                <div className="col-md-4 col-6">
                  <label className="field-label">DISCUSSION TIMER (S)</label>
                  <input
                    type="number"
                    className="form-control pm-input"
                    min={10}
                    max={300}
                    value={discussionTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDiscussionTime(Number(e.target.value))
                    }
                  />
                </div>

                <div className="col-md-4 col-12">
                  <label className="field-label">VOTING TIMER (S)</label>
                  <input
                    type="number"
                    className="form-control pm-input"
                    min={10}
                    max={180}
                    value={votingTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setVotingTime(Number(e.target.value))
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="field-label">TIE VOTE RULE</label>
                  <select
                    className="form-select pm-input"
                    value={tieRule}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setTieRule(e.target.value as TieRule)
                    }
                  >
                    <option value={TIE_RULES.RUNOFF}>
                      Runoff vote between tied players
                    </option>
                    <option value={TIE_RULES.NO_ELIMINATION}>
                      No elimination on tie
                    </option>
                  </select>
                </div>

                <div className="col-md-6 d-flex flex-column justify-content-end gap-2">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={allowDoctorSelfSave}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAllowDoctorSelfSave(e.target.checked)
                      }
                    />
                    <span>Doctor can protect themselves</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={allowRepeatedDoctorSave}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAllowRepeatedDoctorSave(e.target.checked)
                      }
                    />
                    <span>Doctor can protect same player repeatedly</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="primary-button mt-4"
                disabled={!canSubmit}
                title="Create Game (Ctrl + Enter)"
              >
                <Plus size={16} /> Create Game
              </button>
            </form>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel-card">
            <span className="step-label">AUTOMATIC BALANCING</span>
            <h2 className="mt-1 mb-3">
              Role Distribution ({MIN_PLAYERS}–{MAX_PLAYERS} Players)
            </h2>

            <div className="distribution-table">
              <div className="dist-row dist-header">
                <span>Players</span>
                <span>Mafia</span>
                <span>Detective</span>
                <span>Doctor</span>
                <span>Town</span>
              </div>
              {Object.entries(ROLE_DISTRIBUTION).map(([count, dist]) => (
                <div key={count} className="dist-row">
                  <strong>{count}</strong>
                  <span>{dist[ROLES.MAFIA]}</span>
                  <span>{dist[ROLES.DETECTIVE]}</span>
                  <span>{dist[ROLES.DOCTOR]}</span>
                  <span>{dist[ROLES.VILLAGER]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
