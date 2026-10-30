import type React from "react";

export type BadgeVariant =
  | "mafia"
  | "town"
  | "alive"
  | "dead"
  | "host"
  | "detective"
  | "doctor"
  | "villager"
  | "ready"
  | "waiting"
  | "you"
  | "neutral";

export type BadgeProps = {
  variant?: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
  key?: React.Key;
};

export function Badge({
  variant = "neutral",
  children,
  className = ""
}: BadgeProps) {
  return (
    <span className={`motive-badge badge-${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}
