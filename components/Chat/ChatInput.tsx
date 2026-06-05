"use client";

import React, { useRef, useCallback } from "react";
import styles from "./ChatInterface.module.scss";

const MODE_OPTIONS = [
  { id: "cpp_basic", label: "C++ 基础" },
  { id: "cpp_acm", label: "C++ ACM" },
  { id: "general", label: "通用逻辑" },
];

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  mode: string;
  setMode: (v: string) => void;
  loading: boolean;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onNewChat: () => void;
}

export default function ChatInput({
  input,
  setInput,
  mode,
  setMode,
  loading,
  onSend,
  onKeyDown,
  onNewChat,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      autoResize(e.target);
    },
    [setInput, autoResize]
  );

  return (
    <div className={styles.chatInputCard}>
      <div className={styles.chatInputCardBody}>
        <div className={styles.chatInputCardSidebar}>
          <button
            className={styles.chatInputCardIconBtn}
            onClick={onNewChat}
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
          onChange={handleChange}
          onKeyDown={onKeyDown}
          rows={2}
        />
      </div>
      <div className={styles.chatInputCardFooter}>
        <select
          className={styles.chatInputCardModelSelect}
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
        <button
          className={styles.chatInputCardSend}
          onClick={onSend}
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
  );
}
