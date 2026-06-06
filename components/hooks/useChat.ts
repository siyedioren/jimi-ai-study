import { useState, useCallback, useRef, useEffect } from "react";
import type { Session, Message } from "../Chat/types";

const CACHE_PREFIX = "jimi_cache_";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

function generateCacheKey(
  messages: { role: string; content: string }[],
  mode: string
) {
  return CACHE_PREFIX + messages.map((m) => m.content).join("") + mode;
}

function saveCache(key: string, content: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ content, timestamp: Date.now() }));
  } catch {
    // localStorage 写满时忽略
  }
}

function readCache(key: string): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.timestamp || Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.content;
  } catch {
    return null;
  }
}

export function useChat(
  currentSession: Session | undefined,
  currentId: string | null,
  addMessage: (
    sessionId: string,
    message: { role: "user" | "assistant"; content: string; attachments?: import("../Chat/types").Attachment[] }
  ) => Message,
  updateMessage: (
    sessionId: string,
    messageId: string,
    updater: (content: string) => string
  ) => void,
  mode: string
) {
  const draftKey = currentId ? `jimi_draft_${currentId}` : "";
  const [input, setInput] = useState(() => {
    if (typeof window !== "undefined" && draftKey) {
      return localStorage.getItem(draftKey) || "";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);

  // 自动保存草稿（debounce 500ms）
  useEffect(() => {
    if (!draftKey) return;
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(draftKey, input);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [input, draftKey]);

  // 重试状态：记录最后一次失败的消息列表
  const retryRef = useRef<{
    messages: { role: "user" | "assistant"; content: string; attachments?: import("../Chat/types").Attachment[] }[];
    targetId: string;
    msgId: string;
    model: string;
  } | null>(null);

  // 流式缓冲：累积 delta，批量刷新，减少 React 重渲染
  const streamBuf = useRef({ sid: "", mid: "", text: "" });
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const { sid, mid, text } = streamBuf.current;
    if (sid && mid) {
      updateMessage(sid, mid, () => text);
    }
    flushTimer.current = null;
  }, [updateMessage]);

  const appendDelta = useCallback(
    (sid: string, mid: string, delta: string) => {
      streamBuf.current.sid = sid;
      streamBuf.current.mid = mid;
      streamBuf.current.text += delta;
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(flush, 40); // 40ms 批量刷新 ≈ 25fps
      }
    },
    [flush]
  );

  const handleSend = useCallback(async (model: string = "moonshot-v1-8k", attachments?: import("../Chat/types").Attachment[]) => {
    const trimmed = input.trim();
    if ((!trimmed && (!attachments || attachments.length === 0)) || loading || !currentSession || !currentId) return;

    const userMsg = addMessage(currentId, { role: "user", content: trimmed, attachments });
    setInput("");
    if (typeof window !== "undefined" && draftKey) {
      localStorage.removeItem(draftKey);
    }
    setLoading(true);

    const updatedMessages = [
      ...currentSession.messages,
      { role: "user" as const, content: trimmed },
    ];

    const cacheKey = generateCacheKey(updatedMessages, mode);

    // 创建占位 AI 消息
    const aiMsg = addMessage(currentId, { role: "assistant", content: "" });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          model,
          messages: updatedMessages.map((m) => buildApiMessage(m)),
        }),
      });

      if (!res.ok) {
        let errMsg = `请求失败 (HTTP ${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          /* 忽略解析失败 */
        }
        // 记录重试状态
        retryRef.current = {
          messages: updatedMessages,
          targetId: currentId,
          msgId: aiMsg.id,
          model,
        };
        updateMessage(currentId, aiMsg.id, () => `❌ ${errMsg}`);
        setLoading(false);
        return;
      }

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
              appendDelta(currentId, aiMsg.id, parsed.delta);
            }
          } catch {
            // 忽略解析失败的行
          }
        }
      }

      // 如果 AI 完全没返回内容，显示默认提示
      flush();
      const finalText = streamBuf.current.text.trim();
      updateMessage(currentId, aiMsg.id, (prev) =>
        prev.trim() ? prev : "基米暂时没有思路，请再试一次。"
      );
      // 缓存成功回复（7 天过期）
      saveCache(cacheKey, finalText || "基米暂时没有思路，请再试一次。");
    } catch {
      flush();
      const cached = readCache(cacheKey);
      if (cached) {
        retryRef.current = {
          messages: updatedMessages,
          targetId: currentId,
          msgId: aiMsg.id,
          model,
        };
        updateMessage(
          currentId,
          aiMsg.id,
          () => `⚠️ 网络异常，显示上次缓存的回复\n\n${cached}`
        );
      } else {
        updateMessage(currentId, aiMsg.id, () => "❌ 网络异常，请检查网络后重试。");
      }
    } finally {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      setLoading(false);
    }
  }, [input, loading, currentSession, currentId, addMessage, updateMessage, mode]);

  const sendMessages = useCallback(
    async (
      messages: { role: "user" | "assistant"; content: string; attachments?: import("../Chat/types").Attachment[] }[],
      targetId?: string,
      model: string = "moonshot-v1-8k"
    ) => {
      const sid = targetId || currentId;
      if (loading || !sid) return;
      setLoading(true);

      const aiMsg = addMessage(sid, { role: "assistant", content: "" });
      const cacheKey = generateCacheKey(messages, mode);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            model,
            messages: messages.map((m) => buildApiMessage(m)),
          }),
        });

        if (!res.ok) {
          let errMsg = `请求失败 (HTTP ${res.status})`;
          try {
            const errData = await res.json();
            errMsg = errData.error || errData.message || errMsg;
          } catch {
            /* 忽略解析失败 */
          }
          // 记录重试状态
          retryRef.current = {
            messages,
            targetId: sid,
            msgId: aiMsg.id,
            model,
          };
          updateMessage(sid, aiMsg.id, () => `❌ ${errMsg}`);
          setLoading(false);
          return;
        }

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
                appendDelta(sid, aiMsg.id, parsed.delta);
              }
            } catch {
              // ignore
            }
          }
        }

        flush();
        const finalText = streamBuf.current.text.trim();
        updateMessage(sid, aiMsg.id, (prev) =>
          prev.trim() ? prev : "基米暂时没有思路，请再试一次。"
        );
        // 缓存成功回复（7 天过期）
        saveCache(cacheKey, finalText || "基米暂时没有思路，请再试一次。");
      } catch {
        flush();
        const cached = readCache(cacheKey);
        if (cached) {
          retryRef.current = {
            messages,
            targetId: sid,
            msgId: aiMsg.id,
            model,
          };
          updateMessage(
            sid,
            aiMsg.id,
            () => `⚠️ 网络异常，显示上次缓存的回复\n\n${cached}`
          );
        } else {
          updateMessage(sid, aiMsg.id, () => "❌ 网络异常，请检查网络后重试。");
        }
      } finally {
        if (flushTimer.current) {
          clearTimeout(flushTimer.current);
          flushTimer.current = null;
        }
        setLoading(false);
      }
    },
    [loading, currentId, addMessage, updateMessage, mode]
  );

  const handleRetry = useCallback(() => {
    const retry = retryRef.current;
    if (!retry || loading) return;

    // 清空之前的错误消息
    updateMessage(retry.targetId, retry.msgId, () => "");

    // 重新发送
    sendMessages(retry.messages, retry.targetId, retry.model);
  }, [loading, updateMessage, sendMessages]);

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
    handleRetry,
    retryRef,
  };
}

function buildApiMessage(m: {
  role: "user" | "assistant";
  content: string;
  attachments?: import("../Chat/types").Attachment[];
}) {
  const images = m.attachments?.filter((a) => a.type === "image");
  if (images && images.length > 0) {
    return {
      role: m.role,
      content: [
        { type: "text" as const, text: m.content },
        ...images.map((img) => ({
          type: "image_url" as const,
          image_url: { url: img.url },
        })),
      ],
    };
  }
  return { role: m.role, content: m.content };
}
