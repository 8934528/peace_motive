import { useEffect } from "react";
import { matchesShortcut, SHORTCUTS, type ShortcutActionId } from "../config/shortcutsConfig";

type ShortcutHandlers = Partial<Record<ShortcutActionId, () => void>>;

export function useShortcuts(handlers: ShortcutHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return;
      }

      for (const shortcut of Object.values(SHORTCUTS)) {
        const handler = handlers[shortcut.id];
        if (handler && matchesShortcut(event, shortcut)) {
          event.preventDefault();
          handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers, enabled]);
}

