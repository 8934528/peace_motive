import React, { useCallback, useState } from "react";
import { preventSingleKeySubmit } from "../config/shortcutsConfig";
import { APP_VIEWS } from "../constants/gameConstants";
import { useGame } from "../hooks/useGame";
import { useShortcuts } from "../hooks/useShortcuts";
import { ArrowLeft, DoorOpen, IconButton } from "../icons/GameIcons";

export function JoinGame() {
  const {
    playerName,
    setPlayerName,
    joinGame,
    navigateTo,
    busy,
    connected
  } = useGame();

  const [code, setCode] = useState("");

  const canSubmit =
    !busy && connected && playerName.trim().length >= 2 && code.trim().length >= 6;

  const submitForm = useCallback(async () => {
    if (!canSubmit) return;
    await joinGame(code.trim());
  }, [canSubmit, joinGame, code]);

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
      <div className="row g-4 justify-content-center">
        <div className="col-lg-6 col-md-8">
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
                  <span className="step-label">ENTER ROOM</span>
                  <h2>Join a Game</h2>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} onKeyDown={preventSingleKeySubmit}>
              <label htmlFor="join-player-name" className="field-label">
                YOUR NAME
              </label>
              <input
                id="join-player-name"
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

              <label htmlFor="join-game-code" className="field-label">
                INVITE CODE OR GAME CODE
              </label>
              <input
                id="join-game-code"
                type="text"
                className="form-control pm-input code-input"
                value={code}
                required
                placeholder="e.g. apcr-89ny-3t47-ng34-8t7g-348n or Room Code"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCode(e.target.value)
                }
              />

              <button
                type="submit"
                className="primary-button mt-4"
                disabled={!canSubmit}
                title="Join Game (Ctrl + Enter)"
              >
                <DoorOpen size={16} /> Join Game
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
