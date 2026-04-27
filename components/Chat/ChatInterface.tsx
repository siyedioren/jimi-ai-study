"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./ChatInterface.module.scss";

// ═══════════════════════════════════════════════════════════════
//                        类 型 定 义
// ═══════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const STORAGE_KEY = "jimi_sessions";
const MODE_OPTIONS = [
  { id: "cpp_basic", label: "C++ 基础" },
  { id: "cpp_acm", label: "C++ ACM" },
  { id: "general", label: "通用逻辑" },
];

// ═══════════════════════════════════════════════════════════════
//                        工 具 函 数
// ═══════════════════════════════════════════════════════════════

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function now() {
  return Date.now();
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function groupSessionsByTime(sessions: Session[]) {
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  const groups: { label: string; sessions: Session[] }[] = [];

  const todayList = sessions.filter(
    (s) => new Date(s.updatedAt).setHours(0, 0, 0, 0) === today
  );
  const yesterdayList = sessions.filter(
    (s) => new Date(s.updatedAt).setHours(0, 0, 0, 0) === yesterday
  );
  const olderList = sessions.filter(
    (s) => new Date(s.updatedAt).setHours(0, 0, 0, 0) < yesterday
  );

  if (todayList.length) groups.push({ label: "今日", sessions: todayList });
  if (yesterdayList.length)
    groups.push({ label: "昨日", sessions: yesterdayList });
  if (olderList.length) groups.push({ label: "更早", sessions: olderList });

  return groups;
}

function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSessions(sessions: Session[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function autoTitleFromContent(content: string): string {
  const t = content.trim().replace(/\n/g, " ");
  if (t.length <= 12) return t;
  return t.slice(0, 12) + "…";
}

// ═══════════════════════════════════════════════════════════════
//                         主 组 件
// ═══════════════════════════════════════════════════════════════

export default function ChatInterface() {
  // ---------- 会话状态 ----------
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ---------- 输入与加载 ----------
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("cpp_basic");

  // ---------- DOM 引用 ----------
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---------- 初始化：从 localStorage 加载 ----------
  useEffect(() => {
    const list = loadSessions();
    if (list.length === 0) {
      const first: Session = {
        id: generateId(),
        title: "新对话",
        messages: [],
        updatedAt: now(),
      };
      setSessions([first]);
      setCurrentId(first.id);
      saveSessions([first]);
    } else {
      setSessions(list);
      setCurrentId(list[0].id);
    }
    setLoaded(true);
  }, []);

  const currentSession = sessions.find((s) => s.id === currentId);

  // ---------- 自动滚动 ----------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, loading]);

  // ---------- 持久化 ----------
  useEffect(() => {
    if (loaded) saveSessions(sessions);
  }, [sessions, loaded]);

  // ---------- 新建对话 ----------
  const handleNewChat = useCallback(() => {
    const s: Session = {
      id: generateId(),
      title: "新对话",
      messages: [],
      updatedAt: now(),
    };
    setSessions((prev) => [s, ...prev]);
    setCurrentId(s.id);
    setInput("");
  }, []);

  // ---------- 切换会话 ----------
  const handleSwitchSession = useCallback((id: string) => {
    setCurrentId(id);
    setInput("");
  }, []);

  // ---------- 删除会话 ----------
  const handleDeleteSession = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (currentId === id) {
          setCurrentId(next.length ? next[0].id : null);
        }
        return next;
      });
    },
    [currentId]
  );

  // ---------- 发送消息 ----------
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !currentSession) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: trimmed,
    };

    const updatedMessages = [...currentSession.messages, userMsg];
    const updatedSession: Session = {
      ...currentSession,
      messages: updatedMessages,
      updatedAt: now(),
      title:
        currentSession.title === "新对话" && currentSession.messages.length === 0
          ? autoTitleFromContent(trimmed)
          : currentSession.title,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === currentId ? updatedSession : s))
    );
    setInput("");
    setLoading(true);

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
      const data = await res.json();

      const aiMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: data.reply,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentId
            ? { ...s, messages: [...s.messages, aiMsg], updatedAt: now() }
            : s
        )
      );
    } catch {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: generateId(),
                    role: "assistant",
                    content: "基米现在有点忙，请稍后再试。",
                  },
                ],
                updatedAt: now(),
              }
            : s
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------- 键盘 ----------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---------- 输入框自动增高 ----------
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    autoResize(e.target);
  };

  // ---------- 判断代码 ----------
  const isCodeLike = (text: string) => {
    return /\n/.test(text) && /[;{}()]/.test(text);
  };

  // ═══════════════════════════════════════════════════════════════
  //                          渲 染
  // ═══════════════════════════════════════════════════════════════

  const historyGroups = groupSessionsByTime(sessions);

  if (!loaded) return null;

  return (
    <div className={styles.container}>
      {/* ==================== 左侧栏 ==================== */}
      <aside className={styles.sidebar}>
        {/* 返回首页 */}
        <div className={styles.sidebarTop}>
          <a href="/" className={styles.backLink}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回首页
          </a>
        </div>

        {/* 新建对话 */}
        <button className={styles.newChatBtn} onClick={handleNewChat}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建对话
        </button>

        {/* 历史会话 */}
        <div className={styles.historyScroll}>
          {historyGroups.map((group) => (
            <div key={group.label} className={styles.historyGroup}>
              <div className={styles.historyGroupTitle}>{group.label}</div>
              {group.sessions.map((s) => (
                <div
                  key={s.id}
                  className={`${styles.historyItem} ${
                    s.id === currentId ? styles.historyItemActive : ""
                  }`}
                  onClick={() => handleSwitchSession(s.id)}
                >
                  <div className={styles.historyItemTitle}>{s.title}</div>
                  <div className={styles.historyItemMeta}>
                    {formatTime(s.updatedAt)}
                  </div>
                  <button
                    className={styles.historyItemDelete}
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 今日知识点 */}
        <div className={styles.knowledgeCard}>
          <div className={styles.knowledgeLabel}>今日知识点</div>
          <div className={styles.knowledgeTitle}>边界条件的艺术</div>
          <div className={styles.knowledgeDesc}>
            空数组、全相同元素、极大值——这三组数据能覆盖 80% 的 WA 情况。
          </div>
        </div>

        {/* 用户区 */}
        <div className={styles.userArea}>
          <img
            className={styles.userAvatar}
            src="/image/logo.jpg"
            alt="用户"
          />
          <span className={styles.userName}>用户</span>
          <button className={styles.userSettings} title="设置">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.68 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 20.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ==================== 右侧栏 ==================== */}
      <main className={styles.main}>
        {/* 顶部模式选择 */}
        <div className={styles.mainHeader}>
          <div className={styles.mainHeaderTitle}>AI 改题</div>
          <select
            className={styles.modeSelect}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            title="切换解题模式"
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 消息流 */}
        <div className={styles.messages}>
          <div className={styles.messagesInner}>
            {currentSession?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${
                  msg.role === "user" ? styles.messageRowUser : ""
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className={`${styles.avatar} ${styles.avatarAi}`}>基</div>
                ) : (
                  <div
                    className={`${styles.avatar} ${styles.avatarAi}`}
                    style={{ background: "#dbeafe", color: "#2563eb" }}
                  >
                    我
                  </div>
                )}
                <div
                  className={`${styles.bubble} ${
                    msg.role === "user" ? styles.bubbleUser : styles.bubbleAi
                  }`}
                >
                  {msg.role === "user" && isCodeLike(msg.content) ? (
                    <div className={styles.codeBlock}>{msg.content}</div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className={styles.messageRow}>
                <div className={`${styles.avatar} ${styles.avatarAi}`}>基</div>
                <div
                  className={`${styles.bubbleAi} ${styles.thinkingCard}`}
                >
                  <div className={styles.typing}>
                    <div className={styles.dot} />
                    <div className={styles.dot} />
                    <div className={styles.dot} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入框卡片：始终一个形态，不贴底 */}
        <div className={styles.chatInputCard}>
          <div className={styles.chatInputCardBody}>
            <div className={styles.chatInputCardSidebar}>
              <button
                className={styles.chatInputCardIconBtn}
                onClick={handleNewChat}
                title="新建对话"
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            <textarea
              ref={textareaRef}
              className={styles.chatInputCardTextarea}
              placeholder="粘贴题目描述或代码..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={2}
            />
          </div>
          <div className={styles.chatInputCardFooter}>
            <button
              className={styles.chatInputCardSend}
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="发送"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
