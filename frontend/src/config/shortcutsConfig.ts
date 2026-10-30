import type React from "react";

export type ShortcutActionId = "SAVE" | "SUBMIT" | "SETTINGS";

export type ShortcutDefinition = {
  id: ShortcutActionId;
  key: string;
  ctrl: true;
  label: string;
  description: string;
};

export const SHORTCUTS: Record<ShortcutActionId, ShortcutDefinition> = {
  SAVE: {
    id: "SAVE",
    key: "s",
    ctrl: true,
    label: "Ctrl + S",
    description: "Save game settings"
  },
  SUBMIT: {
    id: "SUBMIT",
    key: "Enter",
    ctrl: true,
    label: "Ctrl + Enter",
    description: "Submit form or confirm active action"
  },
  SETTINGS: {
    id: "SETTINGS",
    key: "k",
    ctrl: true,
    label: "Ctrl + K",
    description: "Open game settings"
  }
};

export function matchesShortcut(
  event: KeyboardEvent | React.KeyboardEvent,
  shortcut: ShortcutDefinition
): boolean {
  if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
    return false;
  }
  return event.key.toLowerCase() === shortcut.key.toLowerCase();
}

export function preventSingleKeySubmit(
  event: React.KeyboardEvent<HTMLFormElement>
): void {
  if (event.key === "Enter" && !event.ctrlKey) {
    event.preventDefault();
  }
}

