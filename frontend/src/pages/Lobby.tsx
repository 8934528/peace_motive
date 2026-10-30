import { useCallback, useState } from "react";
import { Badge } from "../badges/Badge";
import { GameLog } from "../components/GameLog";
import { PlayerList } from "../components/PlayerList";
import { LoadingState } from "../components/StateViews";
import { ROLE_DISTRIBUTION } from "../config/gameConfig";
import { ROLES } from "../constants/gameConstants";
import { useGame } from "../hooks/useGame";
import { usePlayers } from "../hooks/usePlayers";
import { useShortcuts } from "../hooks/useShortcuts";
import { Check, Copy, IconButton, Plus, Settings } from "../icons/GameIcons";
import { GameSettingsModal } from "../modals/GameSettingsModal";

import type { GameJoinCode, GamePlayer } from "../types/gameTypes";

export function Lobby() {
  const {
    gameState,
    toggleReady,
    startGame,
    updateSettings,
    copyGameCode,
    generateInviteCode,
    addToast,
    busy
  } = useGame();
  const { players, currentPlayer, isHost } = usePlayers();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const minPlayers = gameState?.game.settings.minPlayers ?? 4;

  const handleStartClick = useCallback(async () => {
    if (!gameState || busy) return;
    if (players.length < minPlayers) {
      addToast("error", "Not enough players");
      return;
    }
    await startGame();
  }, [gameState, busy, players.length, minPlayers, addToast, startGame]);

  const copySpecificCode = useCallback(
    async (codeToCopy: string) => {
      try {
        await navigator.clipboard.writeText(codeToCopy);
        setCopiedCode(codeToCopy);
        addToast("success", "Invite code copied");
        setTimeout(() => setCopiedCode(null), 2000);
      } catch {
        addToast("error", "Could not copy invite code");
      }
    },
    [addToast]
  );

  const copyAllAvailableCodes = useCallback(async () => {
    const available = (gameState?.game.joinCodes ?? [])
      .filter((c: GameJoinCode) => c.status === "AVAILABLE")
      .map((c: GameJoinCode) => c.code);

    if (available.length === 0) {
      addToast("info", "No available invite codes");
      return;
    }

    try {
      await navigator.clipboard.writeText(available.join("\n"));
      addToast("success", `Copied ${available.length} available invite codes`);
    } catch {
      addToast("error", "Could not copy codes");
    }
  }, [gameState?.game.joinCodes, addToast]);

  useShortcuts(
    {
      SUBMIT: () => {
        if (isHost) {
          void handleStartClick();
        }
      }
    },
    Boolean(gameState) && isHost && !showSettingsModal
  );

  if (!gameState) {
    return (
      <div className="container-fluid py-4 px-3 px-lg-5">
        <LoadingState message="Loading lobby..." />
      </div>
    );
  }

  const { game } = gameState;
  const hostPlayer = players.find((p: GamePlayer) => p.isHost);
  const hasEnoughPlayers = players.length >= minPlayers;
  const previewCount = Math.max(4, Math.min(12, players.length || 5));
  const distribution = ROLE_DISTRIBUTION[previewCount];

  return (
    <div className="container-fluid py-4 px-3 px-lg-5">
      <div className="row g-4">
        <div className="col-lg-5">
          <div className="panel-card">
            <div className="section-heading">
              <div>
                <span className="step-label">GAME INFO</span>
                <h2>{game.name}</h2>
              </div>
              <Badge variant="neutral">LOBBY</Badge>
            </div>

            <div className="room-code-card">
              <div>
                <span className="field-label">GAME CODE</span>
                <strong className="room-code">{game.code}</strong>
              </div>
              <IconButton tooltip="Copy game code" onClick={copyGameCode}>
                <Copy size={17} />
              </IconButton>
            </div>

            <div className="info-table">
              <div className="info-table-row">
                <span>Host</span>
                <strong>{hostPlayer?.username ?? "Host"}</strong>
              </div>
              <div className="info-table-row">
                <span>Status</span>
                <strong>
                  {hasEnoughPlayers
                    ? "Ready to start"
                    : `Waiting (${players.length}/${minPlayers} min)`}
                </strong>
              </div>
              <div className="info-table-row">
                <span>Player Count</span>
                <strong>
                  {players.length} / {game.settings.maxPlayers} Players
                </strong>
              </div>
              <div className="info-table-row">
                <span>Timers (Night / Day / Vote)</span>
                <strong>
                  {game.settings.nightTime}s / {game.settings.discussionTime}s /{" "}
                  {game.settings.votingTime}s
                </strong>
              </div>
              <div className="info-table-row">
                <span>Doctor Self-Save</span>
                <strong>
                  {game.settings.allowDoctorSelfSave ? "Allowed" : "Disabled"}
                </strong>
              </div>
              <div className="info-table-row">
                <span>Tie Vote Rule</span>
                <strong>
                  {game.settings.tieRule === "RUNOFF"
                    ? "Runoff Vote"
                    : "No Elimination"}
                </strong>
              </div>
            </div>

            {distribution && (
              <div className="mt-3">
                <span className="field-label">
                  ROLES FOR {previewCount} PLAYERS
                </span>
                <div className="badge-row mt-2">
                  <Badge variant="mafia">
                    {distribution[ROLES.MAFIA]} Mafia
                  </Badge>
                  <Badge variant="detective">
                    {distribution[ROLES.DETECTIVE]} Detective
                  </Badge>
                  <Badge variant="doctor">
                    {distribution[ROLES.DOCTOR]} Doctor
                  </Badge>
                  <Badge variant="villager">
                    {distribution[ROLES.VILLAGER]} Town
                  </Badge>
                </div>
              </div>
            )}

            <div className="lobby-actions mt-4">
              {currentPlayer && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={toggleReady}
                >
                  {currentPlayer.isReady ? "Set Waiting" : "Set Ready"}
                </button>
              )}

              {isHost && (
                <IconButton
                  tooltip="Configure game settings (Ctrl + K)"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Settings size={16} />
                </IconButton>
              )}
            </div>

            {isHost ? (
              <button
                type="button"
                className="primary-button mt-2"
                disabled={busy}
                onClick={handleStartClick}
                title="Start Game (Ctrl + Enter)"
              >
                Start Game
              </button>
            ) : (
              <p className="muted-copy mt-3">
                Waiting for the host to start the game
              </p>
            )}
          </div>
        </div>

        <div className="col-lg-7">
          <div className="row g-4">
            {isHost && (game.joinCodes ?? []).length > 0 && (
              <div className="col-12">
                <div className="panel-card">
                  <div className="section-heading">
                    <div>
                      <span className="step-label">PLAYER INVITE CODES</span>
                      <h2>Send Codes to Players</h2>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={copyAllAvailableCodes}
                      >
                        <Copy size={14} /> Copy Available
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={busy}
                        onClick={generateInviteCode}
                      >
                        <Plus size={14} /> Generate Code
                      </button>
                    </div>
                  </div>

                  <p className="muted-copy mb-3">
                    Each player needs their own 24-character code to enter. Expired codes can be replaced by generating a new one
                  </p>

                  <div className="invite-codes-list">
                    {(game.joinCodes ?? []).map((codeObj, index) => (
                      <div
                        key={codeObj.code}
                        className={`invite-code-card status-${codeObj.status.toLowerCase()}`}
                      >
                        <div className="invite-code-main">
                          <span className="code-index">#{index + 1}</span>
                          <span className="code-string">{codeObj.code}</span>
                        </div>
                        <div className="invite-code-status-row">
                          <span
                            className={`badge badge-${codeObj.status.toLowerCase()}`}
                          >
                            {codeObj.status === "USED"
                              ? `Used by ${codeObj.usedByUsername ?? "Player"}`
                              : codeObj.status}
                          </span>
                          <IconButton
                            tooltip="Copy invite code"
                            onClick={() => copySpecificCode(codeObj.code)}
                          >
                            {copiedCode === codeObj.code ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="col-12">
              <PlayerList />
            </div>
            <div className="col-12">
              <GameLog />
            </div>
          </div>
        </div>
      </div>

      <GameSettingsModal
        open={showSettingsModal}
        gameName={game.name}
        settings={game.settings}
        isHost={isHost}
        busy={busy}
        onClose={() => setShowSettingsModal(false)}
        onSave={async (nextSettings, nextName) => {
          const ok = await updateSettings(nextSettings, nextName);
          if (ok) setShowSettingsModal(false);
        }}
      />
    </div>
  );
}
