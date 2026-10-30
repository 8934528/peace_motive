import React, { useState } from "react";
import { DoorOpen, X } from "../icons/GameIcons";

interface JoinGameModalProps {
  open: boolean;
  playerName: string;
  busy: boolean;
  onClose: () => void;
  onJoin: (code: string, playerName: string) => Promise<boolean>;
}

export function JoinGameModal({
  open,
  playerName: initialPlayerName,
  busy,
  onClose,
  onJoin
}: JoinGameModalProps) {
  const [name, setName] = useState(initialPlayerName);
  const [code, setCode] = useState("");

  if (!open) return null;

  const cleanCode = code.trim();
  const canSubmit = !busy && name.trim().length >= 2 && cleanCode.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const ok = await onJoin(cleanCode, name.trim());
    if (ok) {
      onClose();
    }
  };

  return (
    <div className="pm-modal-backdrop" onClick={onClose}>
      <div
        className="pm-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-modal-title"
      >
        <div className="pm-modal-header">
          <div>
            <span className="step-label">ENTER ROOM</span>
            <h2 id="join-modal-title" className="m-0">
              Join a Game
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pm-modal-body">
            <label htmlFor="modal-join-player-name" className="field-label">
              YOUR NAME
            </label>
            <input
              id="modal-join-player-name"
              type="text"
              className="form-control pm-input"
              value={name}
              maxLength={20}
              minLength={2}
              required
              placeholder="Your display name"
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="modal-join-code" className="field-label mt-3">
              INVITE CODE OR GAME CODE
            </label>
            <input
              id="modal-join-code"
              type="text"
              className="form-control pm-input code-input"
              value={code}
              required
              placeholder="e.g. apcr-89ny-3t47-ng34-8t7g-348n or 6-character code"
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="pm-modal-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!canSubmit}
            >
              <DoorOpen size={16} /> Join Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

