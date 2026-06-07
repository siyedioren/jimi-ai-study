"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./MiniChat.module.scss";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  problemId: string;
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function MiniChat({ problemId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamBuf = useRef("");
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 挂载时恢复对话
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`jimi_minichat_${problemId}`);
      if (raw) setMessages(JSON.parse(raw));
    } catch { /* noop */ }
  }, [problemId]);

  // 自动保存对话
  useEffect(() => {
    localStorage.setItem(`jimi_minichat_${problemId}`, JSON.stringify(messages));
  }, [messages, problemId]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const flush = useCallback((msgId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, content: streamBuf.current } : m))
    );
    flushTimer.current = null;
  }, []);

  const appendDelta = useCallback(
    (msgId: string, delta: string) => {
      streamBuf.current += delta;
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(() => flush(msgId), 40);
      }
    },
    [flush]
  );

  const sendMessage = async (content: string, mode = "cpp_basic") => {
    if (!content.trim() || loading) return;

    const userMsg: ChatMessage = { id: genId(), role: "user", content };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    const aiMsg: ChatMessage = { id: genId(), role: "assistant", content: "" };
    setMessages(prev => [...prev, aiMsg]);
    streamBuf.current = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, model: "moonshot-v1-8k", messages: history }),
      });

      if (!res.ok) {
        setMessages(prev =>
          prev.map(m => (m.id === aiMsg.id ? { ...m, content: `❌ 请求失败 (HTTP ${res.status})` } : m))
        );
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t || !t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.delta !== undefined) {
              appendDelta(aiMsg.id, parsed.delta);
            }
          } catch { /* ignore */ }
        }
      }

      if (flushTimer.current) clearTimeout(flushTimer.current);
      flush(aiMsg.id);
      if (!streamBuf.current.trim()) {
        setMessages(prev =>
          prev.map(m => (m.id === aiMsg.id ? { ...m, content: "基米暂时没有思路，请再试一次。" } : m))
        );
      }
    } catch {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      setMessages(prev =>
        prev.map(m => (m.id === aiMsg.id ? { ...m, content: "❌ 网络异常，请检查网络后重试。" } : m))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // 对外暴露：添加系统/分析消息
  const addAnalysisMessage = (content: string) => {
    sendMessage(content);
  };

  // 通过 ref 或全局事件暴露 addAnalysisMessage
  // 这里使用一个全局事件来接收外部调用
  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      sendMessage(e.detail);
    };
    window.addEventListener("minichat-analyze" as any, handler);
    return () => window.removeEventListener("minichat-analyze" as any, handler);
  }, [messages]); // eslint-disable-line

  if (!expanded) {
    return (
      <button
        className={styles.fab}
        onClick={() => setExpanded(true)}
        title="基米助手"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {messages.length > 0 && <span className={styles.fabBadge} />}
      </button>
    );
  }

  return (
    <div className={styles.chatWindow}>
      {/* 头部 */}
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <span className={styles.chatAvatar}>🐱</span>
          <span className={styles.chatTitle}>基米助手</span>
          {loading && <span className={styles.chatTyping}>思考中…</span>}
        </div>
        <button className={styles.chatClose} onClick={() => setExpanded(false)} title="收起">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* 消息区 */}
      <div className={styles.chatBody} ref={scrollRef}>
        {messages.length === 0 && (
          <div className={styles.chatEmpty}>
            点击"保存并分析"让基米逐行检查你的代码，<br />
            或在此直接提问。
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.chatMessage} ${msg.role === "user" ? styles.msgUser : styles.msgAI}`}
          >
            <div className={styles.msgBubble}>
              <pre className={styles.msgText}>{msg.content}</pre>
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className={`${styles.chatMessage} ${styles.msgAI}`}>
            <div className={styles.msgBubble}>
              <div className={styles.typingDots}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <form className={styles.chatInputWrap} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.chatInput}
          placeholder="问基米…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className={styles.chatSendBtn}
          disabled={!input.trim() || loading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}

// 全局辅助函数：触发分析
export function triggerAnalysis(content: string) {
  window.dispatchEvent(new CustomEvent("minichat-analyze", { detail: content }));
}
