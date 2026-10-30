import { TEAMS, type Team } from "../constants/gameConstants";
import { Badge } from "./Badge";

export function TeamBadge({ team }: { team: Team }) {
  return (
    <Badge variant={team === TEAMS.MAFIA ? "mafia" : "town"}>
      {team === TEAMS.MAFIA ? "MAFIA" : "TOWN"}
    </Badge>
  );
}

