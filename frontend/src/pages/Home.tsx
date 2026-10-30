import type React from "react";
import { useState } from "react";

import { APP_VIEWS } from "../constants/gameConstants";
import { useGame } from "../hooks/useGame";
import { DoorOpen, Eye, Gamepad2, Play, Plus, Users, Vote } from "../icons/GameIcons";
import { JoinGameModal } from "../modals/JoinGameModal";
import { SinglePlayerModal } from "../modals/SinglePlayerModal";

export function Home() {
  const {
    playerName,
    setPlayerName,
    navigateTo,
    connected,
    joinGame,
    startSinglePlayer,
    busy
  } = useGame();

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSinglePlayerModal, setShowSinglePlayerModal] = useState(false);

  return (
    <div className="container-fluid py-4 px-3 px-lg-5">
      <div className="row g-4 align-items-start">
        <section className="col-lg-7">
          <div className="panel-card hero-panel">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              SOCIAL DEDUCTION · SINGLE & MULTIPLAYER
            </div>

            <h2 className="hero-heading">
              Find the Mafia before they find you
            </h2>

            <p className="hero-copy">
              Party game of hidden roles, secret night actions, discussion, and town voting with support for 4 to 12 players
            </p>

            <div className="row g-3 my-3">
              <div className="col-sm-4">
                <div className="feature-box">
                  <Users size={17} />
                  <span>4–12 Players</span>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="feature-box">
                  <Eye size={17} />
                  <span>Secret Roles</span>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="feature-box">
                  <Vote size={17} />
                  <span>Live Voting</span>
                </div>
              </div>
            </div>

            <div className="setup-section mt-3">
              <div className="section-heading">
                <div>
                  <span className="step-label">PLAYER PROFILE</span>
                  <h2>Enter your name</h2>
                </div>
                <Gamepad2 size={20} className="muted-icon" />
              </div>

              <label htmlFor="home-player-name" className="field-label">
                YOUR NAME
              </label>
              <input
                id="home-player-name"
                type="text"
                className="form-control pm-input"
                value={playerName}
                maxLength={20}
                placeholder="Enter your name (2-20 characters)"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPlayerName(e.target.value)
                }
              />

              <div className="row g-2 mt-4">
                <div className="col-12">
                  <span className="step-label d-block mb-2">SELECT GAME</span>
                </div>
                <div className="col-sm-6">
                  <button
                    type="button"
                    className="primary-button w-100"
                    onClick={() => setShowSinglePlayerModal(true)}
                  >
                    <Play size={16} /> Single Player
                  </button>
                  <small className="muted-copy d-block mt-1">
                    Play offline with AI players
                  </small>
                </div>
                <div className="col-sm-6">
                  <button
                    type="button"
                    className="secondary-button w-100"
                    disabled={!connected}
                    onClick={() => navigateTo(APP_VIEWS.CREATE_GAME)}
                  >
                    <Plus size={16} /> Multiplayer
                  </button>
                  <small className="muted-copy d-block mt-1">
                    Generate 12 player codes for friends
                  </small>
                </div>
                <div className="col-12 mt-2">
                  <button
                    type="button"
                    className="secondary-button w-100"
                    onClick={() => setShowJoinModal(true)}
                  >
                    <DoorOpen size={16} /> Join Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="col-lg-5">
          <div className="panel-card">
            <span className="step-label">HOW TO PLAY</span>
            <h2 className="mt-1 mb-3">Game Roles & Flow</h2>

            <div className="role-overview-grid">
              <div className="role-overview-item">
                <strong>Mafia</strong>
                <p>
                  Eliminate one player each night and outnumber the Town to win
                </p>
              </div>
              <div className="role-overview-item">
                <strong>Doctor</strong>
                <p>Protect one player each night from being eliminated</p>
              </div>
              <div className="role-overview-item">
                <strong>Detective</strong>
                <p>Investigate one player each night to learn their team</p>
              </div>
              <div className="role-overview-item">
                <strong>Villager</strong>
                <p>
                  Discuss, spot lies, and vote out the Mafia during the day
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <JoinGameModal
        open={showJoinModal}
        playerName={playerName}
        busy={busy}
        onClose={() => setShowJoinModal(false)}
        onJoin={async (code, customName) => {
          return await joinGame(code, customName);
        }}
      />

      <SinglePlayerModal
        open={showSinglePlayerModal}
        playerName={playerName}
        onClose={() => setShowSinglePlayerModal(false)}
        onStart={(name, count) => {
          startSinglePlayer(name, count);
        }}
      />
    </div>
  );
}
