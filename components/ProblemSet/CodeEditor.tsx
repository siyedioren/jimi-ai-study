"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import styles from "./CodeEditor.module.scss";

export interface CodeEditorRef {
  getCode: () => string;
  setCode: (code: string) => void;
  saveCode: () => void;
}

interface Props {
  problemId: string;
  onSaveAndAnalyze?: (code: string, language: string) => void;
}

const LANGUAGES = [
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
];

const DEFAULT_CODE: Record<string, string> = {
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}",
  c: "#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}",
  python: "# 请在此编写你的代码\n",
  java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}",
};

const STORAGE_KEY = (pid: string, lang: string) => `jimi_code_${pid}_${lang}`;

const CodeEditor = forwardRef<CodeEditorRef, Props>(function CodeEditor(
  { problemId, onSaveAndAnalyze },
  ref
) {
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNoRef = useRef<HTMLDivElement>(null);

  // 挂载时恢复代码
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(problemId, language));
    setCode(saved || DEFAULT_CODE[language] || "");
  }, [problemId, language]);

  // 自动保存（debounce 800ms）
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY(problemId, language), code);
    }, 800);
    return () => clearTimeout(timer);
  }, [code, problemId, language]);

  const lines = code.split("\n");
  const lineCount = lines.length;

  const handleScroll = useCallback(() => {
    if (lineNoRef.current && textareaRef.current) {
      lineNoRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + "    " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const saveCode = () => {
    localStorage.setItem(STORAGE_KEY(problemId, language), code);
  };

  useImperativeHandle(ref, () => ({
    getCode: () => code,
    setCode: (c: string) => setCode(c),
    saveCode,
  }));

  const handleAnalyze = () => {
    saveCode();
    onSaveAndAnalyze?.(code, language);
  };

  return (
    <div className={styles.editorWrap}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <select
          className={styles.langSelect}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <div className={styles.toolbarSpacer} />
        <button className={styles.secondaryBtn} onClick={saveCode} title="Ctrl+S">
          💾 保存
        </button>
      </div>

      {/* 编辑器主体 */}
      <div className={styles.editorBody}>
        <div className={styles.lineNumbers} ref={lineNoRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={styles.lineNo}>
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className={styles.codeArea}
          value={code}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
        />
      </div>

      {/* 底部按钮 */}
      <div className={styles.editorFooter}>
        <button className={styles.primaryBtn} onClick={handleAnalyze}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          保存并分析
        </button>
        <button
          className={styles.submitBtn}
          onClick={() => alert("判题系统接入中，敬请期待！")}
          title="判题服务器预留"
        >
          🚀 提交
        </button>
      </div>
    </div>
  );
});

export default CodeEditor;
