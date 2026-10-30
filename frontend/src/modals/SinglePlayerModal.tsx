import React, { useState } from "react";
import { Badge } from "../badges/Badge";
import { ROLE_DISTRIBUTION } from "../config/gameConfig";
import { ROLES } from "../constants/gameConstants";
import { Play, X } from "../icons/GameIcons";

interface SinglePlayerModalProps {
  open: boolean;
  playerName: string;
  onClose: () => void;
  onStart: (playerName: string, playerCount: number) => void;
}

export function SinglePlayerModal({
  open,
  playerName: initialPlayerName,
  onClose,
  onStart
}: SinglePlayerModalProps) {
  const [name, setName] = useState(initialPlayerName);
  const [playerCount, setPlayerCount] = useState(6);

  if (!open) return null;

  const dist = ROLE_DISTRIBUTION[playerCount] ?? ROLE_DISTRIBUTION[6];
  const canStart = name.trim().length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStart) return;
    onStart(name.trim(), playerCount);
    onClose();
  };

  return (
    <div className="pm-modal-backdrop" onClick={onClose}>
      <div
        className="pm-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="single-player-title"
      >
        <div className="pm-modal-header">
          <div>
            <span className="step-label">OFFLINE PLAY</span>
            <h2 id="single-player-title" className="m-0">
              single-player
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
            <label htmlFor="sp-player-name" className="field-label">
              YOUR NAME
            </label>
            <input
              id="sp-player-name"
              type="text"
              className="form-control pm-input"
              value={name}
              maxLength={20}
              minLength={2}
              required
              placeholder="Your display name"
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="sp-player-count" className="field-label mt-3">
              NUMBER OF PLAYERS ({playerCount} Players)
            </label>
            <input
              id="sp-player-count"
              type="range"
              className="form-range w-100"
              min={4}
              max={12}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
            />

            <div className="d-flex justify-content-between text-muted small mt-1">
              <span>4 Min</span>
              <span>8</span>
              <span>12 Max</span>
            </div>

            <div className="panel-card bg-surface mt-3 p-3">
              <span className="step-label">ROLES ASSIGNED RANDOMLY</span>
              <div className="badge-row mt-2">
                <Badge variant="mafia">{dist[ROLES.MAFIA]} Mafia</Badge>
                <Badge variant="detective">
                  {dist[ROLES.DETECTIVE]} Detective
                </Badge>
                <Badge variant="doctor">{dist[ROLES.DOCTOR]} Doctor</Badge>
                <Badge variant="villager">{dist[ROLES.VILLAGER]} Town</Badge>
              </div>
              <p className="muted-copy mt-2 mb-0 small">
                The remaining {playerCount - 1} players are AI participants (Xhosa, Afrikaaner, English, etc.)
              </p>
            </div>
          </div>

          <div className="pm-modal-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!canStart}
            >
              <Play size={16} /> START
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
