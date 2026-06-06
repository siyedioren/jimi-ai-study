"use client";

import React, { useState, useEffect } from "react";
import styles from "./SettingsPanel.module.scss";

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState(14);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTheme(localStorage.getItem("jimi_theme") || "light");
      setFontSize(parseInt(localStorage.getItem("jimi_font_size") || "14", 10));
      setApiKey(localStorage.getItem("jimi_api_key") || "");
    }
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("jimi_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    if (typeof window !== "undefined") {
      localStorage.setItem("jimi_font_size", String(size));
      document.documentElement.style.setProperty("--chat-font-size", `${size}px`);
    }
  };

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    if (typeof window !== "undefined") {
      if (key.trim()) {
        localStorage.setItem("jimi_api_key", key.trim());
      } else {
        localStorage.removeItem("jimi_api_key");
      }
    }
  };

  const handleClearSessions = () => {
    if (typeof window !== "undefined") {
      if (confirm("确定要清空所有会话吗？此操作不可撤销。")) {
        localStorage.removeItem("jimi_sessions");
        localStorage.removeItem("jimi_current_session_id");
        window.location.reload();
      }
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>设置</h2>
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

        <div className={styles.content}>
          {/* 主题 */}
          <section className={styles.section}>
            <h3>主题</h3>
            <div className={styles.themeOptions}>
              <button
                className={`${styles.themeBtn} ${theme === "light" ? styles.active : ""}`}
                onClick={() => handleThemeChange("light")}
              >
                <div className={`${styles.themePreview} ${styles.lightPreview}`} />
                <span>浅色</span>
              </button>
              <button
                className={`${styles.themeBtn} ${theme === "dark" ? styles.active : ""}`}
                onClick={() => handleThemeChange("dark")}
              >
                <div className={`${styles.themePreview} ${styles.darkPreview}`} />
                <span>深色</span>
              </button>
            </div>
          </section>

          {/* 字体大小 */}
          <section className={styles.section}>
            <h3>字体大小</h3>
            <div className={styles.fontSizeOptions}>
              {[12, 14, 16, 18].map((size) => (
                <button
                  key={size}
                  className={`${styles.fontSizeBtn} ${fontSize === size ? styles.active : ""}`}
                  onClick={() => handleFontSizeChange(size)}
                >
                  {size}px
                </button>
              ))}
            </div>
          </section>

          {/* API Key */}
          <section className={styles.section}>
            <h3>API Key（可选）</h3>
            <p className={styles.hint}>覆盖环境变量中的 API Key，仅保存在本地</p>
            <input
              type="password"
              className={styles.apiKeyInput}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
            />
          </section>

          {/* 清空会话 */}
          <section className={styles.section}>
            <h3>数据管理</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  const data: Record<string, string> = {};
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith("jimi_")) {
                      data[key] = localStorage.getItem(key) || "";
                    }
                  }
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `jimi-backup-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                导出全部数据
              </button>

              <label className={styles.actionBtn} style={{ cursor: "pointer" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                导入数据
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const data = JSON.parse(ev.target?.result as string);
                        if (confirm("导入将覆盖现有数据，确定继续吗？")) {
                          for (const [key, value] of Object.entries(data)) {
                            if (typeof value === "string") {
                              localStorage.setItem(key, value);
                            }
                          }
                          window.location.reload();
                        }
                      } catch {
                        alert("文件格式错误");
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>

              <button className={styles.dangerBtn} onClick={handleClearSessions}>
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
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                清空所有会话
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
