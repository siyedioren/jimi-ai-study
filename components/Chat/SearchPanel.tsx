"use client";

import React, { useState, useMemo } from "react";
import styles from "./SearchPanel.module.scss";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
}

interface SearchPanelProps {
  sessions: Session[];
  currentId: string | null;
  onSwitchSession: (id: string) => void;
  onClose: () => void;
}

function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i} className={styles.highlight}>{part}</mark>
    ) : (
      part
    )
  );
}

export default function SearchPanel({
  sessions,
  currentId,
  onSwitchSession,
  onClose,
}: SearchPanelProps) {
  const [keyword, setKeyword] = useState("");

  const results = useMemo(() => {
    if (!keyword.trim() || keyword.length < 2) return [];
    const k = keyword.toLowerCase();
    const list: { sessionId: string; sessionTitle: string; msg: Message; preview: string }[] = [];

    for (const s of sessions) {
      for (const m of s.messages) {
        if (m.content.toLowerCase().includes(k)) {
          const idx = m.content.toLowerCase().indexOf(k);
          const start = Math.max(0, idx - 30);
          const end = Math.min(m.content.length, idx + k.length + 30);
          const preview = m.content.slice(start, end);
          list.push({ sessionId: s.id, sessionTitle: s.title, msg: m, preview });
        }
      }
    }
    return list.slice(0, 50);
  }, [keyword, sessions]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
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
          <input
            className={styles.input}
            placeholder="搜索历史消息..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            autoFocus
          />
          <button className={styles.closeBtn} onClick={onClose}>
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.results}>
          {results.length === 0 && keyword.length >= 2 && (
            <div className={styles.empty}>未找到匹配的消息</div>
          )}
          {results.map((r) => (
            <div
              key={`${r.sessionId}-${r.msg.id}`}
              className={`${styles.resultItem} ${
                r.sessionId === currentId ? styles.resultItemActive : ""
              }`}
              onClick={() => {
                onSwitchSession(r.sessionId);
                onClose();
              }}
            >
              <div className={styles.resultTitle}>{r.sessionTitle}</div>
              <div className={styles.resultPreview}>
                <span className={styles.resultRole}>
                  {r.msg.role === "user" ? "我" : "基米"}
                </span>
                : {highlightText(r.preview, keyword)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
