"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./ChatInterface.module.scss";

// ═══════════════════════════════════════════════════════════════
//                      基 米 人 设 调 教 区
// ═══════════════════════════════════════════════════════════════
//  前端只保留模式列表（用于渲染选择器）。
//  真正的 system prompt 在后端 app/api/chat/route.ts 里管理，
//  防止暴露提示词工程细节和 API Key。
// ═══════════════════════════════════════════════════════════════

/** 前端可用的模式列表
 *  新增模式：去 app/api/chat/route.ts 的 MODES 对象里加配置，
 *  然后再来这里加一条 { id, label } 即可。
 */
const MODE_OPTIONS = [
  { id: "cpp_basic", label: "C++ 基础" },
  { id: "cpp_acm", label: "C++ ACM" },
  { id: "general", label: "通用逻辑" },
];

// ═══════════════════════════════════════════════════════════════
//                        类 型 与 工 具
// ═══════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

// ═══════════════════════════════════════════════════════════════
//                         主 组 件
// ═══════════════════════════════════════════════════════════════

export default function ChatInterface() {
  // ---------- 状态 ----------
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 当前选择的解题模式，默认 C++ 基础
  const [mode, setMode] = useState("cpp_basic");

  // ---------- DOM 引用 ----------
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---------- 自动滚动到底部 ----------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ---------- 发送消息（接入真实 API） ----------
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: trimmed,
    };

    // 1. 立即把用户消息显示到界面
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 2. 调用后端 API（Key 和 Prompt 都在后端，前端不暴露）
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode, // 把当前模式传给后端
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // 3. 把基米的回复显示到界面
      const aiMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: data.reply,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // 4. 网络或 API 报错时的兜底提示
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "基米现在有点忙，请稍后再试。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- 键盘：Enter 发送，Shift+Enter 换行 ----------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---------- 输入框自动增高 ----------
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [input]);

  // ---------- 判断用户消息是否像代码 ----------
  const isCodeLike = (text: string) => {
    return /\n/.test(text) && /[;{}()]/.test(text);
  };

  // ═══════════════════════════════════════════════════════════════
  //                          渲 染
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className={styles.container}>
      {/* ---------- 顶部导航 ---------- */}
      <header className={styles.header}>
        <a href="/" className={styles.backLink}>
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
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </a>

        <div className={styles.headerCenter}>
          <div className={styles.headerTitle}>AI 改题</div>
          <div className={styles.headerSub}>基米</div>
        </div>

        {/* 模式切换器 */}
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
      </header>

      {/* ---------- 消息列表 ---------- */}
      <div className={styles.messages}>
        {/* 空状态提示 */}
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            把题目描述或代码贴进来
            <br />
            基米会用自然语言帮你梳理逻辑错误
          </div>
        )}

        {/* 消息渲染 */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageRow} ${
              msg.role === "user" ? styles.messageRowUser : ""
            }`}
          >
            {/* 头像 */}
            {msg.role === "assistant" ? (
              <div className={`${styles.avatar} ${styles.avatarAi}`}>基</div>
            ) : (
              <div
                className={`${styles.avatar} ${styles.avatarAi}`}
                style={{ background: "#f3f4f6", color: "#6b7280" }}
              >
                我
              </div>
            )}

            {/* 气泡 */}
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

        {/* Loading 动画 */}
        {loading && (
          <div className={styles.messageRow}>
            <div className={`${styles.avatar} ${styles.avatarAi}`}>基</div>
            <div className={styles.bubbleAi} style={{ padding: "18px 18px" }}>
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

      {/* ---------- 底部输入 ---------- */}
      <div className={styles.inputArea}>
        <div className={styles.inputBox}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            rows={1}
            placeholder="粘贴题目描述或代码，基米会帮你分析..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim() || loading}
            aria-label="发送"
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
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
