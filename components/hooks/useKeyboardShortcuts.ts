import { useEffect, useCallback } from "react";

interface ShortcutHandlers {
  onNewChat?: () => void;
  onPrevSession?: () => void;
  onNextSession?: () => void;
  onClearInput?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 忽略输入框内的快捷键（除了 Esc）
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl/Cmd + K: 新建会话
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        handlers.onNewChat?.();
        return;
      }

      // Ctrl/Cmd + Shift + [: 上一个会话
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "{") {
        e.preventDefault();
        handlers.onPrevSession?.();
        return;
      }

      // Ctrl/Cmd + Shift + ]: 下一个会话
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "}") {
        e.preventDefault();
        handlers.onNextSession?.();
        return;
      }

      // Esc: 清空输入框（仅在输入框内）
      if (e.key === "Escape" && isInput) {
        handlers.onClearInput?.();
        return;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
