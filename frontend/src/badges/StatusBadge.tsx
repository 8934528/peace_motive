import { Badge } from "./Badge";

export function AliveBadge({ isAlive }: { isAlive: boolean }) {
  return (
    <Badge variant={isAlive ? "alive" : "dead"}>
      {isAlive ? "ALIVE" : "DEAD"}
    </Badge>
  );
}

export function ReadyBadge({ isReady }: { isReady: boolean }) {
  return (
    <Badge variant={isReady ? "ready" : "waiting"}>
      {isReady ? "READY" : "WAITING"}
    </Badge>
  );
}

export function HostBadge() {
  return <Badge variant="host">HOST</Badge>;
}

export function YouBadge() {
  return <Badge variant="you">YOU</Badge>;
}

