"use client";

import React, { useState, useEffect } from "react";
import styles from "./ChatInterface.module.scss";
import { useSessions } from "../hooks/useSessions";
import { useChat } from "../hooks/useChat";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useStats } from "../hooks/useStats";
import { useFavorites } from "../hooks/useFavorites";
import SessionSidebar from "./SessionSidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import SearchPanel from "./SearchPanel";
import SettingsPanel from "./SettingsPanel";

export default function ChatInterface() {
  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jimi_mode") || "cpp_basic";
    }
    return "cpp_basic";
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

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
    handleRetry,
    retryRef,
  } = useChat(currentSession, currentId, addMessage, updateMessage, mode);

  const wrappedNewChat = () => {
    setInput("");
    handleNewChat();
  };

  const wrappedHandleSend = (model: string, attachments?: import("./types").Attachment[]) => {
    recordStudy(mode);
    handleSend(model, attachments);
  };

  const { recordStudy } = useStats();
  const { favorites, addFavorite, removeFavorite, isFavorited } = useFavorites();

  const firstUserMessage = currentSession?.messages.find((m) => m.role === "user");
  const canFavorite = firstUserMessage && firstUserMessage.content.length > 10;
  const favorited = canFavorite && isFavorited(currentSession?.title || "");
  const messagesEndRef = useAutoScroll([
    currentSession?.messages,
    loading,
  ]);

  // 离线状态监听
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ---------- 键盘快捷键 ----------
  useKeyboardShortcuts({
    onNewChat: wrappedNewChat,
    onPrevSession: () => {
      const idx = sessions.findIndex((s) => s.id === currentId);
      if (idx > 0) handleSwitchSession(sessions[idx - 1].id);
    },
    onNextSession: () => {
      const idx = sessions.findIndex((s) => s.id === currentId);
      if (idx >= 0 && idx < sessions.length - 1) handleSwitchSession(sessions[idx + 1].id);
    },
    onClearInput: () => setInput(""),
  });

  // ---------- 自动发送待处理题目 ----------
  useEffect(() => {
    if (!loaded) return;

    // 检查是否需要新建对话（从首页模式卡片进入）
    const needNewChat = localStorage.getItem("jimi_new_chat");
    if (needNewChat) {
      localStorage.removeItem("jimi_new_chat");
      handleNewChat();
      return;
    }

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
  }, [loaded, mode, createSession, sendMessages, handleNewChat]);

  if (!loaded) return null;

  return (
    <div className={styles.container}>
      <SessionSidebar
        historyGroups={historyGroups}
        currentId={currentId}
        favorites={favorites}
        onNewChat={wrappedNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
        onLoadProblem={(problem) => {
          localStorage.setItem("jimi_mode", problem.mode);
          setMode(problem.mode);
          const session = createSession(
            [{ role: "user", content: problem.content }],
            problem.title
          );
          sendMessages([{ role: "user", content: problem.content }], session.id);
        }}
        onRemoveFavorite={removeFavorite}
      />

      <main className={styles.main}>
        {isOffline && (
          <div className={styles.offlineBar}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            网络已断开，恢复后将自动重试
          </div>
        )}
        <div className={styles.mainHeader}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              className={styles.mobileMenuBtn}
              onClick={() => setShowSidebar(true)}
              title="会话列表"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className={styles.mainHeaderTitle}>AI 改题</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className={styles.settingsBtn}
              onClick={() => { window.location.href = "/problemset"; }}
              title="题库"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </button>
            <button
              className={styles.settingsBtn}
              onClick={() => setShowSearch(true)}
              title="搜索消息"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            {canFavorite && (
              <button
                className={styles.settingsBtn}
                onClick={() => {
                  if (favorited) {
                    const fav = favorites.find((f) => f.title === currentSession?.title);
                    if (fav) removeFavorite(fav.id);
                  } else if (firstUserMessage && currentSession) {
                    addFavorite({
                      title: currentSession.title,
                      content: firstUserMessage.content,
                      mode,
                    });
                  }
                }}
                title={favorited ? "取消收藏" : "收藏题目"}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={favorited ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            )}
            <button
              className={styles.settingsBtn}
              onClick={() => setShowSettings(true)}
              title="设置"
            >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.17 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.17 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.17a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
        </div>

        <MessageList
          messages={currentSession?.messages || []}
          loading={loading}
          messagesEndRef={messagesEndRef}
          onRetry={handleRetry}
          retryRef={retryRef}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          mode={mode}
          setMode={setMode}
          loading={loading}
          onSend={wrappedHandleSend}
          onKeyDown={handleKeyDown}
          onNewChat={wrappedNewChat}
        />

        {showSidebar && (
          <>
            <div
              className={styles.sidebarOverlay}
              onClick={() => setShowSidebar(false)}
            />
            <div className={styles.sidebarDrawer}>
              <SessionSidebar
                historyGroups={historyGroups}
                currentId={currentId}
                favorites={favorites}
                onNewChat={() => {
                  wrappedNewChat();
                  setShowSidebar(false);
                }}
                onSwitchSession={(id) => {
                  handleSwitchSession(id);
                  setShowSidebar(false);
                }}
                onDeleteSession={handleDeleteSession}
                onLoadProblem={(problem) => {
                  setShowSidebar(false);
                  localStorage.setItem("jimi_mode", problem.mode);
                  setMode(problem.mode);
                  const session = createSession(
                    [{ role: "user", content: problem.content }],
                    problem.title
                  );
                  sendMessages([{ role: "user", content: problem.content }], session.id);
                }}
                onRemoveFavorite={removeFavorite}
              />
            </div>
          </>
        )}

        {showSearch && (
          <SearchPanel
            sessions={sessions}
            currentId={currentId}
            onSwitchSession={handleSwitchSession}
            onClose={() => setShowSearch(false)}
          />
        )}

        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </main>
    </div>
  );
}

function autoTitleFromContent(content: string): string {
  const t = content.trim().replace(/\n/g, " ");
  if (t.length <= 12) return t;
  return t.slice(0, 12) + "…";
}
