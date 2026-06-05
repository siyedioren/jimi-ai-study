"use client";

import React, { useState, useEffect } from "react";
import styles from "./ChatInterface.module.scss";
import { useSessions } from "../hooks/useSessions";
import { useChat } from "../hooks/useChat";
import { useAutoScroll } from "../hooks/useAutoScroll";
import SessionSidebar from "./SessionSidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

export default function ChatInterface() {
  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jimi_mode") || "cpp_basic";
    }
    return "cpp_basic";
  });

  // 持久化模式选择
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("jimi_mode", mode);
    }
  }, [mode]);
  const {
    sessions,
    currentId,
    currentSession,
    loaded,
    historyGroups,
    handleNewChat,
    handleSwitchSession,
    handleDeleteSession,
    addMessage,
    updateMessage,
    createSession,
  } = useSessions();

  const {
    input,
    setInput,
    loading,
    handleSend,
    sendMessages,
    handleKeyDown,
  } = useChat(currentSession, currentId, addMessage, updateMessage, mode);

  const wrappedNewChat = () => {
    setInput("");
    handleNewChat();
  };

  const messagesEndRef = useAutoScroll([
    currentSession?.messages,
    loading,
  ]);

  // ---------- 自动发送待处理题目 ----------
  useEffect(() => {
    if (!loaded) return;
    const raw = localStorage.getItem("jimi_pending_problem");
    if (!raw) return;

    let problem: { title?: string; content?: string };
    try {
      problem = JSON.parse(raw);
    } catch {
      localStorage.removeItem("jimi_pending_problem");
      return;
    }

    localStorage.removeItem("jimi_pending_problem");
    const content = (problem.content || "").trim();
    if (!content) return;

    const userContent = content + "\n\n请给出解题思路";
    const title = problem.title || autoTitleFromContent(userContent);

    const session = createSession(
      [{ role: "user", content: userContent }],
      title
    );

    // 发送 API 请求（使用新会话的 ID，避免时序问题）
    sendMessages([{ role: "user", content: userContent }], session.id);
  }, [loaded, mode, createSession, sendMessages]);

  if (!loaded) return null;

  return (
    <div className={styles.container}>
      <SessionSidebar
        historyGroups={historyGroups}
        currentId={currentId}
        onNewChat={wrappedNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
      />

      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <div className={styles.mainHeaderTitle}>AI 改题</div>
        </div>

        <MessageList
          messages={currentSession?.messages || []}
          loading={loading}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          mode={mode}
          setMode={setMode}
          loading={loading}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          onNewChat={wrappedNewChat}
        />
      </main>
    </div>
  );
}

function autoTitleFromContent(content: string): string {
  const t = content.trim().replace(/\n/g, " ");
  if (t.length <= 12) return t;
  return t.slice(0, 12) + "…";
}
