import { useEffect, useState } from "react";
import { useGameContext } from "../context/GameContext";

export function useGameTimer() {
  const { gameState } = useGameContext();
  const phaseEndsAt = gameState?.game.phaseEndsAt ?? null;
  const phaseStartedAt = gameState?.game.phaseStartedAt ?? null;
  const serverTime = gameState?.game.serverTime ?? null;

  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);

  useEffect(() => {
    if (!phaseEndsAt) {
      setSecondsLeft(0);
      setTotalSeconds(0);
      return;
    }

    const endMs = new Date(phaseEndsAt).getTime();
    const startMs = phaseStartedAt ? new Date(phaseStartedAt).getTime() : Date.now();
    const serverMs = serverTime ? new Date(serverTime).getTime() : Date.now();
    const clientOffsetMs = serverMs - Date.now();

    const durationSec = Math.max(1, Math.round((endMs - startMs) / 1000));
    setTotalSeconds(durationSec);

    const updateRemaining = () => {
      const nowAdjusted = Date.now() + clientOffsetMs;
      const remaining = Math.max(0, Math.ceil((endMs - nowAdjusted) / 1000));
      setSecondsLeft(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 250);
    return () => clearInterval(interval);
  }, [phaseEndsAt, phaseStartedAt, serverTime]);

  const progressPercent = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0;

  return {
    secondsLeft,
    totalSeconds,
    progressPercent,
    hasTimer: Boolean(phaseEndsAt)
  };
}
