import React, { useCallback, useEffect, useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS, type GameSettings } from "../config/gameConfig";
import { preventSingleKeySubmit } from "../config/shortcutsConfig";
import { MAFIA_TIE_RULES, TIE_RULES, type MafiaTieRule, type TieRule } from "../constants/gameConstants";
import { useShortcuts } from "../hooks/useShortcuts";
import { IconButton, X } from "../icons/GameIcons";

export type GameSettingsModalProps = {
  open: boolean;
  gameName: string;
  settings: GameSettings;
  isHost: boolean;
  busy?: boolean;
  onSave: (settings: Partial<GameSettings>, gameName: string) => void;
  onClose: () => void;
};

export function GameSettingsModal({
  open,
  gameName,
  settings,
  isHost,
  busy = false,
  onSave,
  onClose
}: GameSettingsModalProps) {
  const [nameInput, setNameInput] = useState(gameName);
  const [formState, setFormState] = useState<GameSettings>(settings);

  useEffect(() => {
    if (open) {
      setNameInput(gameName);
      setFormState(settings);
    }
  }, [open, gameName, settings]);

  const submitSettings = useCallback(() => {
    if (busy) return;
    if (!isHost) {
      onClose();
      return;
    }
    onSave(formState, nameInput);
  }, [busy, isHost, onClose, onSave, formState, nameInput]);

  useShortcuts(
    {
      SAVE: submitSettings,
      SUBMIT: submitSettings
    },
    open
  );

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitSettings();
  };

  return (
    <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
      <div className="modal-card modal-card-lg">
        <div className="modal-card-header">
          <h3>Game Settings</h3>
          <IconButton tooltip="Close settings" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={preventSingleKeySubmit}>
          <div className="modal-card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="field-label">GAME NAME</label>
                <input
                  type="text"
                  className="form-control pm-input"
                  value={nameInput}
                  maxLength={40}
                  disabled={!isHost || busy}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNameInput(e.target.value)
                  }
                />
              </div>

              <div className="col-md-3 col-6">
                <label className="field-label">MIN PLAYERS</label>
                <input
                  type="number"
                  className="form-control pm-input"
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  value={formState.minPlayers}
                  disabled={!isHost || busy}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormState({
                      ...formState,
                      minPlayers: Number(e.target.value)
                    })
                  }
                />
              </div>

              <div className="col-md-3 col-6">
                <label className="field-label">MAX PLAYERS</label>
                <input
                  type="number"
                  className="form-control pm-input"
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  value={formState.maxPlayers}
                  disabled={!isHost || busy}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormState({
                      ...formState,
                      maxPlayers: Number(e.target.value)
                    })
                  }
                />
              </div>

              <div className="col-md-4 col-6">
                <label className="field-label">NIGHT TIME (S)</label>
                <input
                  type="number"
                  className="form-control pm-input"
                  min={10}
                  max={180}
                  value={formState.nightTime}
                  disabled={!isHost || busy}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormState({
                      ...formState,
                      nightTime: Number(e.target.value)
                    })
                  }
                />
              </div>

              <div className="col-md-4 col-6">
                <label className="field-label">DISCUSSION TIME (S)</label>
                <input
                  type="number"
                  className="form-control pm-input"
                  min={10}
                  max={300}
                  value={formState.discussionTime}
                  disabled={!isHost || busy}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormState({
                      ...formState,
                      discussionTime: Number(e.target.value)
                    })
                  }
                />
              </div>

              <div className="col-md-4 col-6">
                <label className="field-label">VOTING TIME (S)</label>
                <input
                  type="number"
                  className="form-control pm-input"
                  min={10}
                  max={180}
                  value={formState.votingTime}
                  disabled={!isHost || busy}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormState({
                      ...formState,
                      votingTime: Number(e.target.value)
                    })
                  }
                />
              </div>

              <div className="col-md-6">
                <label className="field-label">VOTE TIE RULE</label>
                <select
                  className="form-select pm-input"
                  value={formState.tieRule}
                  disabled={!isHost || busy}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFormState({
                      ...formState,
                      tieRule: e.target.value as TieRule
                    })
                  }
                >
                  <option value={TIE_RULES.RUNOFF}>
                    Runoff vote, then no elimination
                  </option>
                  <option value={TIE_RULES.NO_ELIMINATION}>
                    No elimination on tie
                  </option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="field-label">MAFIA TARGET TIE RULE</label>
                <select
                  className="form-select pm-input"
                  value={formState.mafiaTieRule}
                  disabled={!isHost || busy}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFormState({
                      ...formState,
                      mafiaTieRule: e.target.value as MafiaTieRule
                    })
                  }
                >
                  <option value={MAFIA_TIE_RULES.RANDOM}>
                    Random among tied targets
                  </option>
                  <option value={MAFIA_TIE_RULES.FIRST_SUBMITTED}>
                    First target submitted
                  </option>
                  <option value={MAFIA_TIE_RULES.NO_KILL}>
                    No elimination on tie
                  </option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={formState.allowDoctorSelfSave}
                    disabled={!isHost || busy}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormState({
                        ...formState,
                        allowDoctorSelfSave: e.target.checked
                      })
                    }
                  />
                  <span>Doctor can protect themselves</span>
                </label>
              </div>

              <div className="col-md-6">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={formState.allowRepeatedDoctorSave}
                    disabled={!isHost || busy}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormState({
                        ...formState,
                        allowRepeatedDoctorSave: e.target.checked
                      })
                    }
                  />
                  <span>Doctor can protect same player repeatedly</span>
                </label>
              </div>

              <div className="col-md-6">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={formState.autoAdvanceWhenAllActed}
                    disabled={!isHost || busy}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormState({
                        ...formState,
                        autoAdvanceWhenAllActed: e.target.checked
                      })
                    }
                  />
                  <span>Advance early when all players submit</span>
                </label>
              </div>

              <div className="col-md-6">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={formState.revealVotesAfterPhase}
                    disabled={!isHost || busy}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormState({
                        ...formState,
                        revealVotesAfterPhase: e.target.checked
                      })
                    }
                  />
                  <span>Show vote breakdown after voting ends</span>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-card-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={busy}
            >
              Close
            </button>
            {isHost && (
              <button
                type="submit"
                className="primary-button"
                disabled={busy}
                title="Save (Ctrl + S)"
              >
                Save
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
