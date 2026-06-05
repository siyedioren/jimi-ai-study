import { useState, useCallback } from "react";
import type { Session, Message } from "../Chat/types";

export function useChat(
  currentSession: Session | undefined,
  currentId: string | null,
  addMessage: (
    sessionId: string,
    message: { role: "user" | "assistant"; content: string }
  ) => Message,
  updateMessage: (
    sessionId: string,
    messageId: string,
    updater: (content: string) => string
  ) => void,
  mode: string
) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !currentSession || !currentId) return;

    const userMsg = addMessage(currentId, { role: "user", content: trimmed });
    setInput("");
    setLoading(true);

    const updatedMessages = [
      ...currentSession.messages,
      { role: "user" as const, content: trimmed },
    ];

    // 创建占位 AI 消息
    const aiMsg = addMessage(currentId, { role: "assistant", content: "" });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 流式读取
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.delta !== undefined) {
              updateMessage(currentId, aiMsg.id, (prev) => prev + parsed.delta);
            }
          } catch {
            // 忽略解析失败的行
          }
        }
      }

      // 如果 AI 完全没返回内容，显示默认提示
      updateMessage(currentId, aiMsg.id, (prev) =>
        prev.trim() ? prev : "基米暂时没有思路，请再试一次。"
      );
    } catch {
      updateMessage(currentId, aiMsg.id, () => "基米现在有点忙，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }, [input, loading, currentSession, currentId, addMessage, updateMessage, mode]);

  const sendMessages = useCallback(
    async (
      messages: { role: "user" | "assistant"; content: string }[],
      targetId?: string
    ) => {
      const sid = targetId || currentId;
      if (loading || !sid) return;
      setLoading(true);

      const aiMsg = addMessage(sid, { role: "assistant", content: "" });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.delta !== undefined) {
                updateMessage(sid, aiMsg.id, (prev) => prev + parsed.delta);
              }
            } catch {
              // ignore
            }
          }
        }

        updateMessage(sid, aiMsg.id, (prev) =>
          prev.trim() ? prev : "基米暂时没有思路，请再试一次。"
        );
      } catch {
        updateMessage(sid, aiMsg.id, () => "基米现在有点忙，请稍后再试。");
      } finally {
        setLoading(false);
      }
    },
    [loading, currentId, addMessage, updateMessage, mode]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return {
    input,
    setInput,
    loading,
    handleSend,
    sendMessages,
    handleKeyDown,
  };
}
