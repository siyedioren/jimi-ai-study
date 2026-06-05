"use client";

import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./ChatInterface.module.scss";
import type { Message } from "./types";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <button className={styles.copyBtn} onClick={handleCopy} title="复制">
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      <span>{copied ? "已复制" : "复制"}</span>
    </button>
  );
}

function isCodeLike(text: string) {
  return /\n/.test(text) && /[;{}()]/.test(text);
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = String(children).replace(/\n$/, "");
          const hasNewlines = codeString.includes("\n");

          if (!inline && (match || hasNewlines)) {
            const lang = match ? match[1] : "text";
            return (
              <div className={styles.codeBlockWrapper}>
                <div className={styles.codeBlockHeader}>
                  <span className={styles.codeBlockLang}>{lang}</span>
                  <CopyButton code={codeString} />
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={lang}
                  PreTag="div"
                  {...props}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }

          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        pre({ children }: any) {
          return <>{children}</>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function MessageList({
  messages,
  loading,
  messagesEndRef,
}: MessageListProps) {
  return (
    <div className={styles.messages}>
      <div className={styles.messagesInner}>
        {messages.map((msg) => (
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
              ) : msg.role === "assistant" ? (
                <MarkdownContent content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className={styles.messageRow}>
            <div className={`${styles.avatar} ${styles.avatarAi}`}>基</div>
            <div className={`${styles.bubbleAi} ${styles.thinkingCard}`}>
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
  );
}
