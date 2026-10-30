import { useState } from "react";
import { useGame } from "../hooks/useGame";
import { useGamePhase } from "../hooks/useGamePhase";
import { usePlayers } from "../hooks/usePlayers";
import { ConfirmActionModal } from "../modals/ConfirmActionModal";
import { PlayerDetailsModal } from "../modals/PlayerDetailsModal";
import type { GamePlayer } from "../types/gameTypes";
import { PlayerCard } from "./PlayerCard";
import { EmptyState } from "./StateViews";

export function PlayerList() {
  const { gameState, removePlayer, busy } = useGame();
  const { phase } = useGamePhase();
  const { players, currentPlayer, isHost } = usePlayers();

  const [selectedPlayer, setSelectedPlayer] = useState<GamePlayer | null>(
    null
  );
  const [playerToRemove, setPlayerToRemove] = useState<GamePlayer | null>(
    null
  );

  const maxPlayers = gameState?.game.settings.maxPlayers ?? 12;

  return (
    <div className="panel-card">
      <div className="section-heading">
        <div>
          <span className="step-label">PLAYERS</span>
          <h2>
            {players.length} / {maxPlayers} Players
          </h2>
        </div>
        <span className="player-count">
          {players.filter((p: GamePlayer) => p.isAlive).length} Alive
        </span>
      </div>

      {players.length === 0 ? (
        <EmptyState message="No players in this room yet" />
      ) : (
        <div className="player-list">
          {players.map((player: GamePlayer) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCurrentUser={player.id === currentPlayer?.id}
              phase={phase}
              canRemove={isHost}
              onSelectPlayer={(p: GamePlayer) => setSelectedPlayer(p)}
              onRemovePlayer={(p: GamePlayer) => setPlayerToRemove(p)}
            />
          ))}
        </div>
      )}

      <PlayerDetailsModal
        open={Boolean(selectedPlayer)}
        player={selectedPlayer}
        canRemove={isHost}
        onRemoveRequest={(p: GamePlayer) => setPlayerToRemove(p)}
        onClose={() => setSelectedPlayer(null)}
      />

      <ConfirmActionModal
        open={Boolean(playerToRemove)}
        title="Remove this player?"
        message={
          playerToRemove?.username
            ? `Remove ${playerToRemove.username} from the game?`
            : "Remove this player from the game?"
        }
        confirmLabel="Remove"
        variant="danger"
        busy={busy}
        onCancel={() => setPlayerToRemove(null)}
        onConfirm={async () => {
          if (!playerToRemove) return;
          const targetId = playerToRemove.id;
          setPlayerToRemove(null);
          await removePlayer(targetId);
        }}
      />
    </div>
  );
}
