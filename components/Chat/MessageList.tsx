"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./ChatInterface.module.scss";
import type { Message } from "./types";
import DiffViewer from "./DiffViewer";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onRetry?: () => void;
  retryRef?: React.RefObject<{ msgId: string } | null>;
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

/** 导出单条消息为 Markdown */
function ExportButton({ content }: { content: string }) {
  const handleExport = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  return (
    <button className={styles.msgCopyBtn} onClick={handleExport} title="导出 Markdown" style={{ right: "40px" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}

function MessageCopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  return (
    <button className={styles.msgCopyBtn} onClick={handleCopy} title="复制全文">
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
    </button>
  );
}

function isCodeLike(text: string) {
  return /\n/.test(text) && /[;{}()]/.test(text);
}

/** 流式传输中的纯文本显示（带逐字动画） */
function StreamingText({ content }: { content: string }) {
  return (
    <span className={styles.streamingText}>
      {content}
      <span className={styles.streamingCursor} />
    </span>
  );
}

/** Markdown 渲染（流式完成后使用） */
function MarkdownContent({ content }: { content: string }) {
  const components = useMemo(
    () => ({
      code({ inline, className, children, ...props }: any) {
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
    }),
    []
  );

  return (
    <ReactMarkdown components={components}>
      {content}
    </ReactMarkdown>
  );
}

function extractFirstCodeBlock(text: string): string | null {
  const match = text.match(/```[\w]*\n([\s\S]*?)\n```/);
  return match ? match[1].trim() : null;
}

// ═══════════════════════════════════════════════════════════════
//                     单条消息组件
// ═══════════════════════════════════════════════════════════════

interface MessageItemProps {
  msg: Message;
  index: number;
  messages: Message[];
  loading: boolean;
  onRetry?: () => void;
  onDiff: (oldCode: string, newCode: string) => void;
}

function MessageItem({ msg, index, messages, loading, onRetry, onDiff }: MessageItemProps) {
  const isLastAssistant = msg.role === "assistant" && index === messages.length - 1;
  const isStreaming = isLastAssistant && loading;

  return (
    <div
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
        {/* 附件预览 */}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className={styles.messageAttachments}>
            {msg.attachments.map((att, i) => (
              <div key={i} className={styles.messageAttachment}>
                {att.type === "image" ? (
                  <img src={att.url} alt={att.name} className={styles.messageAttachmentImg} />
                ) : (
                  <span className={styles.messageAttachmentFile}>{att.name}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {msg.role === "user" && isCodeLike(msg.content) ? (
          <div className={styles.codeBlock}>{msg.content}</div>
        ) : msg.role === "assistant" ? (
          <>
            {!isStreaming && (
              <>
                <ExportButton content={msg.content} />
                <MessageCopyButton content={msg.content} />
              </>
            )}
            {isStreaming ? (
              <StreamingText content={msg.content} />
            ) : msg.content.startsWith("❌") || msg.content.startsWith("⚠️") ? (
              <div className={styles.errorBubble}>
                <p>{msg.content}</p>
                {onRetry && (
                  <button
                    className={styles.retryBtn}
                    onClick={onRetry}
                    disabled={loading}
                  >
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
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    重试
                  </button>
                )}
              </div>
            ) : (
              <MarkdownContent content={msg.content} />
            )}
            {/* 代码对比按钮 */}
            {!isStreaming && (() => {
              const newCode = extractFirstCodeBlock(msg.content);
              if (!newCode) return null;
              const prevUserMsg = messages.slice(0, index).reverse().find((m) => m.role === "user");
              const oldCode = prevUserMsg ? extractFirstCodeBlock(prevUserMsg.content) : null;
              if (!oldCode) return null;
              return (
                <button
                  className={styles.diffBtn}
                  onClick={() => onDiff(oldCode, newCode)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  与上一条代码对比
                </button>
              );
            })()}
          </>
        ) : (
          msg.content
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//                     虚拟消息包装
// ═══════════════════════════════════════════════════════════════

interface VirtualMessageProps {
  index: number;
  isVisible: boolean;
  isStreaming: boolean;
  observer: IntersectionObserver | null;
  children: React.ReactNode;
}

function VirtualMessage({ index, isVisible, isStreaming, observer, children }: VirtualMessageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !observer) return;
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [observer]);

  const shouldRender = isVisible || isStreaming;

  return (
    <div
      ref={ref}
      data-index={index}
      style={shouldRender ? undefined : { minHeight: 80 }}
    >
      {shouldRender ? children : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//                     消息列表（虚拟滚动）
// ═══════════════════════════════════════════════════════════════

export default function MessageList({
  messages,
  loading,
  messagesEndRef,
  onRetry,
}: MessageListProps) {
  const [diffData, setDiffData] = useState<{ oldCode: string; newCode: string } | null>(null);
  const [visibleSet, setVisibleSet] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleSet((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const idxAttr = (entry.target as HTMLDivElement).dataset.index;
            if (idxAttr === undefined) return;
            const index = Number(idxAttr);
            if (entry.isIntersecting) next.add(index);
            else next.delete(index);
          });
          return next;
        });
      },
      { root, threshold: 0.1 }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  // 根据可见索引计算渲染范围（上下各缓冲 5 条）
  const renderRange = useMemo(() => {
    if (visibleSet.size === 0) {
      return { start: 0, end: messages.length - 1 };
    }
    const visible = Array.from(visibleSet);
    const min = Math.min(...visible);
    const max = Math.max(...visible);
    return {
      start: Math.max(0, min - 5),
      end: Math.min(messages.length - 1, max + 5),
    };
  }, [visibleSet, messages.length]);

  const showTyping = loading && messages[messages.length - 1]?.role !== "assistant";

  return (
    <div ref={containerRef} className={styles.messages}>
      <div className={styles.messagesInner}>
        {messages.map((msg, index) => {
          const isStreaming = msg.role === "assistant" && index === messages.length - 1 && loading;
          const isVisible = renderRange.start <= index && index <= renderRange.end;

          return (
            <VirtualMessage
              key={msg.id}
              index={index}
              isVisible={isVisible}
              isStreaming={!!isStreaming}
              observer={observerRef.current}
            >
              <MessageItem
                msg={msg}
                index={index}
                messages={messages}
                loading={loading}
                onRetry={onRetry}
                onDiff={(oldCode, newCode) => setDiffData({ oldCode, newCode })}
              />
            </VirtualMessage>
          );
        })}

        {showTyping && (
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

        <div ref={messagesEndRef} style={{ height: 1 }} />
      </div>

      {diffData && (
        <DiffViewer
          oldCode={diffData.oldCode}
          newCode={diffData.newCode}
          onClose={() => setDiffData(null)}
        />
      )}
    </div>
  );
}
