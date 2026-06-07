"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./SubmitPage.module.scss";
import CodeEditor, { CodeEditorRef } from "./CodeEditor";
import MiniChat, { triggerAnalysis } from "./MiniChat";

interface Problem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  mode: string;
  content: string;
  sampleInput: string;
  sampleOutput: string;
  timeLimit: string;
  memoryLimit: string;
  tags: string[];
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const DIFFICULTY_CLASS: Record<string, string> = {
  easy: styles.diffEasy,
  medium: styles.diffMedium,
  hard: styles.diffHard,
};

interface Props {
  problemId: string;
}

export default function SubmitPage({ problemId }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const editorRef = useRef<CodeEditorRef>(null);

  useEffect(() => {
    fetch("/data/problems.json")
      .then((r) => r.json())
      .then((problems: Problem[]) => {
        const found = problems.find((p) => p.id === problemId);
        setProblem(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [problemId]);

  const handleSaveAndAnalyze = (code: string, language: string) => {
    if (!problem) return;
    const lines = code.split("\n");
    const numbered = lines.map((line, i) => `${i + 1} | ${line}`).join("\n");
    const langMap: Record<string, string> = {
      cpp: "C++",
      c: "C",
      python: "Python",
      java: "Java",
    };
    const prompt = `我正在做一道编程题，请帮我逐行分析代码。

【题目】${problem.title}
${problem.content}

【我的代码】(${langMap[language] || language}):
${numbered}

请逐行分析这段代码，指出：
1. 每行代码的作用
2. 潜在的错误或隐患
3. 可以优化的地方
4. 是否符合题目要求`;
    triggerAnalysis(prompt);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>加载中…</div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h2>题目不存在</h2>
          <p>没有找到编号为 {problemId} 的题目</p>
          <a href="/problemset" className={styles.backLink}>返回题库</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* 顶部导航 */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <a href="/" className={styles.navBrand}>
            <img src="/image/logo.jpg" alt="logo" className={styles.navLogo} />
            <span className={styles.navTitle}>基米编程学习器</span>
          </a>
        </div>
        <div className={styles.navCenter}>
          <span className={styles.navProblemId}>{problem.id}</span>
          <span className={styles.navProblemTitle}>{problem.title}</span>
        </div>
        <div className={styles.navLinks}>
          <a href="/problemset" className={styles.navLink}>题库</a>
          <span className={styles.navLinkActive}>交题</span>
          <a href="/problems" className={styles.navLink}>AI 改题</a>
        </div>
      </nav>

      {/* 主布局：左右分栏 */}
      <div className={styles.layout}>
        {/* 左侧面板：题目描述 */}
        <div className={styles.leftPanel}>
          <div className={styles.problemCard}>
            {/* 标题区 */}
            <div className={styles.problemHeader}>
              <h1 className={styles.problemTitle}>
                <span className={styles.problemId}>{problem.id}</span>
                {problem.title}
              </h1>
              <div className={styles.problemMeta}>
                <span className={`${styles.diffBadge} ${DIFFICULTY_CLASS[problem.difficulty]}`}>
                  {DIFFICULTY_LABEL[problem.difficulty]}
                </span>
                {problem.tags.map((t) => (
                  <span key={t} className={styles.tagBadge}>{t}</span>
                ))}
                <span className={styles.limitBadge}>⏱ {problem.timeLimit}s</span>
                <span className={styles.limitBadge}>💾 {problem.memoryLimit}MB</span>
              </div>
            </div>

            {/* 题目描述 */}
            <div className={styles.problemSection}>
              <h3 className={styles.sectionTitle}>题目描述</h3>
              <div className={styles.sectionContent}>{problem.content}</div>
            </div>

            {/* 样例输入 */}
            {problem.sampleInput && (
              <div className={styles.problemSection}>
                <h3 className={styles.sectionTitle}>样例输入</h3>
                <pre className={styles.codeBlock}>{problem.sampleInput}</pre>
              </div>
            )}

            {/* 样例输出 */}
            {problem.sampleOutput && (
              <div className={styles.problemSection}>
                <h3 className={styles.sectionTitle}>样例输出</h3>
                <pre className={styles.codeBlock}>{problem.sampleOutput}</pre>
              </div>
            )}
          </div>
        </div>

        {/* 右侧面板：代码编辑器 */}
        <div className={styles.rightPanel}>
          <CodeEditor
            ref={editorRef}
            problemId={problemId}
            onSaveAndAnalyze={handleSaveAndAnalyze}
          />
        </div>
      </div>

      {/* 基米浮动聊天 */}
      <MiniChat problemId={problemId} />
    </div>
  );
}
