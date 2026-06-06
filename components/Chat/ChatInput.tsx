"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import styles from "./ChatInterface.module.scss";
import type { Attachment } from "./types";

interface ModeOption {
  id: string;
  label: string;
}

interface PersonaMode {
  label: string;
  model: string;
  modelOptions?: string[];
}

interface ChatInputProps {
  input: string;
  setInput: (v: string | ((prev: string) => string)) => void;
  mode: string;
  setMode: (v: string) => void;
  loading: boolean;
  onSend: (model: string, attachments?: Attachment[]) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modeOptions, setModeOptions] = useState<ModeOption[]>([]);
  const [personaModes, setPersonaModes] = useState<Record<string, PersonaMode>>({});
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const DRAFT_KEY = "jimi_draft_input";

  // 挂载时恢复草稿
  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      setInput(draft);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // input 变化时 debounce 保存草稿（500ms）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, input);
    }, 500);
    return () => clearTimeout(timer);
  }, [input]);

  // 动态加载 persona.json 中的模式列表与模型选项
  useEffect(() => {
    fetch("/config/persona.json")
      .then((res) => res.json())
      .then((data) => {
        const modes: Record<string, PersonaMode> = data.modes || {};
        setPersonaModes(modes);
        const options = Object.entries(modes).map(([id, cfg]: [string, any]) => ({
          id,
          label: cfg.label || id,
        }));
        setModeOptions(options);
      })
      .catch(() => {
        setModeOptions([
          { id: "cpp_basic", label: "C++ 基础" },
          { id: "cpp_code", label: "C++ 代码" },
          { id: "general", label: "通用问答" },
        ]);
      });
  }, []);

  // 当前 mode 变化时，恢复或初始化该模式对应的模型选择
  useEffect(() => {
    if (typeof window === "undefined" || !mode) return;
    const cfg = personaModes[mode];
    if (!cfg) return;

    const saved = localStorage.getItem(`jimi_model_${mode}`);
    const options = cfg.modelOptions || [cfg.model];
    if (saved && options.includes(saved)) {
      setSelectedModel(saved);
    } else {
      setSelectedModel(cfg.model);
    }
  }, [mode, personaModes]);

  const handleModelChange = useCallback((newModel: string) => {
    setSelectedModel(newModel);
    if (typeof window !== "undefined" && mode) {
      localStorage.setItem(`jimi_model_${mode}`, newModel);
    }
  }, [mode]);

  // 粘贴监听
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          readFileAsDataURL(file, (url) => {
            setAttachments((prev) => [...prev, { type: "image", url, name: file.name }]);
          });
        } else if (isCodeFile(file.name)) {
          readFileAsText(file, (text) => {
            setInput((prev: string) => (prev ? prev + "\n\n" : "") + text);
          });
        }
      }
    };
    const el = textareaRef.current;
    if (el) {
      el.addEventListener("paste", handlePaste);
      return () => el.removeEventListener("paste", handlePaste);
    }
  }, [setInput]);

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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        readFileAsDataURL(file, (url) => {
          setAttachments((prev) => [...prev, { type: "image", url, name: file.name }]);
        });
      } else if (isCodeFile(file.name)) {
        readFileAsText(file, (text) => {
          setInput((prev: string) => (prev ? prev + "\n\n" : "") + text);
        });
      }
    }
    e.target.value = "";
  }, [setInput]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSendClick = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(DRAFT_KEY);
    }
    onSend(selectedModel, attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
  }, [onSend, attachments, selectedModel]);

  const wrappedKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendClick();
        return;
      }
      onKeyDown(e);
    },
    [onKeyDown, handleSendClick]
  );

  const currentModeCfg = personaModes[mode];
  const modelOptions = currentModeCfg?.modelOptions || [currentModeCfg?.model || "moonshot-v1-8k"];

  return (
    <div className={styles.chatInputCard}>
      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className={styles.attachmentsBar}>
          {attachments.map((att, idx) => (
            <div key={idx} className={styles.attachmentChip}>
              {att.type === "image" ? (
                <img src={att.url} alt={att.name} className={styles.attachmentThumb} />
              ) : (
                <span className={styles.attachmentName}>{att.name}</span>
              )}
              <button
                className={styles.attachmentRemove}
                onClick={() => handleRemoveAttachment(idx)}
                title="移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.chatInputCardBody}>
        <div className={styles.chatInputCardSidebar}>
          <button
            className={styles.chatInputCardIconBtn}
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem(DRAFT_KEY);
              }
              onNewChat();
            }}
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
          <button
            className={styles.chatInputCardIconBtn}
            onClick={() => fileInputRef.current?.click()}
            title="上传图片或代码文件"
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.cpp,.c,.py,.js,.ts,.java,.go,.rs,.txt"
            style={{ display: "none" }}
            onChange={handleFileSelect}
            multiple
          />
        </div>
        <textarea
          ref={textareaRef}
          className={styles.chatInputCardTextarea}
          placeholder="粘贴题目描述或代码..."
          value={input}
          onChange={handleChange}
          onKeyDown={wrappedKeyDown}
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
          {modeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className={styles.chatInputCardModelSelect}
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
          title="切换模型（上下文大小）"
          disabled={modelOptions.length <= 1}
        >
          {modelOptions.map((m) => (
            <option key={m} value={m}>
              {formatModelLabel(m)}
            </option>
          ))}
        </select>
        <button
          className={styles.chatInputCardSend}
          onClick={handleSendClick}
          disabled={(!input.trim() && attachments.length === 0) || loading}
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

// ═══════════════════════════════════════════════════════════════
//                        工具函数
// ═══════════════════════════════════════════════════════════════

function isCodeFile(filename: string) {
  return /\.(cpp|c|py|js|ts|java|go|rs|txt|md|json|yaml|yml|html|css|scss)$/i.test(filename);
}

function readFileAsDataURL(file: File, cb: (url: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => cb(e.target?.result as string);
  reader.readAsDataURL(file);
}

function readFileAsText(file: File, cb: (text: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => cb(e.target?.result as string);
  reader.readAsText(file);
}

function formatModelLabel(model: string) {
  if (model.includes("128k")) return "128K 上下文";
  if (model.includes("32k")) return "32K 上下文";
  if (model.includes("8k")) return "8K 上下文";
  return model;
}
