import { ROLES, type RoleKey } from "../constants/gameConstants";
import { Badge, type BadgeVariant } from "./Badge";

export function RoleBadge({ roleKey }: { roleKey: RoleKey }) {
  const variantMap: Record<RoleKey, BadgeVariant> = {
    [ROLES.MAFIA]: "mafia",
    [ROLES.DETECTIVE]: "detective",
    [ROLES.DOCTOR]: "doctor",
    [ROLES.VILLAGER]: "villager"
  };

  return <Badge variant={variantMap[roleKey] ?? "neutral"}>{roleKey}</Badge>;
}

