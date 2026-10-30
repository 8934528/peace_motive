import type React from "react";
import { useState } from "react";
import { APP_VIEWS, GAME_PHASES } from "../constants/gameConstants";
import { useGame } from "../hooks/useGame";
import { usePlayerRole } from "../hooks/usePlayerRole";
import { usePlayers } from "../hooks/usePlayers";
import { useShortcuts } from "../hooks/useShortcuts";
import { Copy, DoorOpen, Eye, HelpCircle, IconButton, LogOut, RefreshCw, Settings, Trash2, Wifi, WifiOff, XCircle } from "../icons/GameIcons";
import motiveLogo from "../assets/motive_logo.png";
import { ConfirmActionModal } from "../modals/ConfirmActionModal";
import { GameSettingsModal } from "../modals/GameSettingsModal";
import { RoleDetailsModal } from "../modals/RoleDetailsModal";

type HeaderConfirmType =
  | "leave"
  | "delete"
  | "end"
  | "restart"
  | "signout"
  | null;

export function GameHeader() {
  const {
    connected,
    busy,
    user,
    gameState,
    addToast,
    copyGameCode,
    navigateTo,
    updateSettings,
    endGame,
    restartGame,
    leaveGame,
    deleteGame,
    signOut
  } = useGame();
  const { isHost } = usePlayers();
  const { role } = usePlayerRole();

  const [confirmType, setConfirmType] = useState<HeaderConfirmType>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const game = gameState?.game ?? null;

  useShortcuts(
    {
      SETTINGS: () => {
        if (game) {
          setShowSettingsModal((prev: boolean) => !prev);
        }
      }
    },
    Boolean(game) && !confirmType
  );

  const confirmConfig = (() => {
    switch (confirmType) {
      case "leave":
        return {
          title: "Leave game?",
          message: "Are you sure you want to leave this game?",
          confirmLabel: "Leave",
          variant: "danger" as const,
          action: leaveGame
        };
      case "delete":
        return {
          title: "Delete game?",
          message: "This cannot be undone",
          confirmLabel: "Delete",
          variant: "danger" as const,
          action: deleteGame
        };
      case "end":
        return {
          title: "End this game?",
          message: "This will stop the active match for all players",
          confirmLabel: "End Game",
          variant: "danger" as const,
          action: endGame
        };
      case "restart":
        return {
          title: "Restart this game?",
          message: "All players will return to the lobby for a new round",
          confirmLabel: "Restart",
          variant: "primary" as const,
          action: restartGame
        };
      case "signout":
        return {
          title: "Sign out?",
          message: "Are you sure you want to sign out?",
          confirmLabel: "Sign out",
          variant: "danger" as const,
          action: signOut
        };
      default:
        return null;
    }
  })();

  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href="#home"
          aria-label="Motive home"
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            if (!game) {
              navigateTo(APP_VIEWS.HOME);
            }
          }}
        >
          <span className="brand-mark">
            <img src={motiveLogo} alt="Motive Logo" className="brand-logo-img" />
          </span>
          <span className="brand-copy">
            <strong>MOTIVE</strong>
            <small>SOCIAL DEDUCTION</small>
          </span>
        </a>

        {game && (
          <div className="topbar-center">
            <span className="topbar-game-name">{game.name}</span>
            <span className="topbar-code-pill">
              Code: <strong>{game.code}</strong>
              <button
                type="button"
                className="inline-copy-btn"
                onClick={copyGameCode}
                title="Copy game code"
                aria-label="Copy game code"
              >
                <Copy size={12} />
              </button>
            </span>
          </div>
        )}

        <div className="topbar-right">
          <span className={`connection ${connected ? "online" : ""}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{connected ? "Online" : "Offline"}</span>
          </span>

          {game && role && (
            <IconButton
              tooltip="View your secret role"
              onClick={() => setShowRoleModal(true)}
            >
              <Eye size={16} />
            </IconButton>
          )}

          {game && (
            <IconButton
              tooltip="Game settings (Ctrl + K)"
              onClick={() => setShowSettingsModal(true)}
            >
              <Settings size={16} />
            </IconButton>
          )}

          {game &&
            isHost &&
            game.phase !== GAME_PHASES.LOBBY &&
            game.phase !== GAME_PHASES.GAME_OVER && (
              <IconButton
                tooltip="End this game"
                variant="danger"
                onClick={() => setConfirmType("end")}
              >
                <XCircle size={16} />
              </IconButton>
            )}

          {game && isHost && game.phase !== GAME_PHASES.LOBBY && (
            <IconButton
              tooltip="Restart this game"
              onClick={() => setConfirmType("restart")}
            >
              <RefreshCw size={16} />
            </IconButton>
          )}

          {game && isHost && game.phase === GAME_PHASES.LOBBY && (
            <IconButton
              tooltip="Delete game"
              variant="danger"
              onClick={() => setConfirmType("delete")}
            >
              <Trash2 size={16} />
            </IconButton>
          )}

          {game && (
            <IconButton
              tooltip="Leave game"
              variant="danger"
              onClick={() => setConfirmType("leave")}
            >
              <DoorOpen size={16} />
            </IconButton>
          )}

          {!game && user && (
            <IconButton
              tooltip="Sign out"
              variant="danger"
              onClick={() => setConfirmType("signout")}
            >
              <LogOut size={16} />
            </IconButton>
          )}

          <IconButton
            tooltip="How to play Motive"
            onClick={() =>
              addToast(
                "info",
                "Find the Mafia before they equal or outnumber the Town"
              )
            }
          >
            <HelpCircle size={16} />
          </IconButton>
        </div>
      </header>

      <ConfirmActionModal
        open={Boolean(confirmConfig)}
        title={confirmConfig?.title ?? ""}
        message={confirmConfig?.message ?? ""}
        confirmLabel={confirmConfig?.confirmLabel ?? "Confirm"}
        variant={confirmConfig?.variant ?? "danger"}
        busy={busy}
        onCancel={() => setConfirmType(null)}
        onConfirm={async () => {
          if (!confirmConfig) return;
          setConfirmType(null);
          await confirmConfig.action();
        }}
      />

      {game && (
        <GameSettingsModal
          open={showSettingsModal}
          gameName={game.name}
          settings={game.settings}
          isHost={isHost && game.phase === GAME_PHASES.LOBBY}
          busy={busy}
          onClose={() => setShowSettingsModal(false)}
          onSave={async (nextSettings, nextName) => {
            const ok = await updateSettings(nextSettings, nextName);
            if (ok) setShowSettingsModal(false);
          }}
        />
      )}

      <RoleDetailsModal
        open={showRoleModal}
        role={role}
        onClose={() => setShowRoleModal(false)}
      />
    </>
  );
}
