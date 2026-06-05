"use client";

import React from "react";
import styles from "./ChatInterface.module.scss";

interface SessionSidebarProps {
  historyGroups: { label: string; sessions: { id: string; title: string; updatedAt: number }[] }[];
  currentId: string | null;
  onNewChat: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function SessionSidebar({
  historyGroups,
  currentId,
  onNewChat,
  onSwitchSession,
  onDeleteSession,
}: SessionSidebarProps) {
  return (
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
      <button className={styles.newChatBtn} onClick={onNewChat}>
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
                onClick={() => onSwitchSession(s.id)}
              >
                <div className={styles.historyItemTitle}>{s.title}</div>
                <div className={styles.historyItemMeta}>
                  {formatTime(s.updatedAt)}
                </div>
                <button
                  className={styles.historyItemDelete}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(s.id);
                  }}
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
  );
}
