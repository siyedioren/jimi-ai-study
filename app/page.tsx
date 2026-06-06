"use client";

import React, { useState, useEffect } from "react";
import ModeCard from "@/components/ModeCard/ModeCard";
import SponsorPanel from "@/components/SponsorPanel/SponsorPanel";
import { useStats } from "@/components/hooks/useStats";
import styles from "./page.module.scss";

interface ModeInfo {
  id: string;
  title: string;
  tags: string[];
  intro: string;
  features: string[];
}

interface Problem {
  id: string;
  title: string;
  difficulty: string;
  mode: string;
  content: string;
}

const MODE_LIST: ModeInfo[] = [
  {
    id: "cpp_basic",
    title: "C++ 基础",
    tags: ["简单", "入门"],
    intro: "适合零基础学习者，专注语法纠错和基础逻辑分析。",
    features: ["语法纠错", "边界条件检查", "变量作用域分析", "基础算法思路"],
  },
  {
    id: "cpp_acm",
    title: "C++ ACM",
    tags: ["中等", "竞赛"],
    intro: "面向竞赛编程，专注算法优化和复杂度分析。",
    features: ["时间/空间复杂度分析", "算法思路讲解", "代码优化建议", "竞赛技巧"],
  },
  {
    id: "general",
    title: "通用逻辑",
    tags: ["思维训练"],
    intro: "不限语言，专注编程思维和逻辑训练。",
    features: ["跨语言思维", "算法通用性", "问题拆解", "逻辑推理"],
  },
];

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const DIFFICULTY_CLASS: Record<string, string> = {
  easy: styles.dailyTagEasy,
  medium: styles.dailyTagMedium,
  hard: styles.dailyTagHard,
};

function enterMode(modeId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("jimi_mode", modeId);
    localStorage.setItem("jimi_new_chat", "1");
    window.location.href = "/problems";
  }
}

function startProblem(problem: Problem) {
  if (typeof window !== "undefined") {
    localStorage.setItem("jimi_pending_problem", JSON.stringify(problem));
    localStorage.setItem("jimi_mode", problem.mode);
    window.location.href = "/problems";
  }
}

export default function Home() {
  const [dailyProblem, setDailyProblem] = useState<Problem | null>(null);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const { stats } = useStats();

  useEffect(() => {
    fetch("/data/problems.json")
      .then((res) => res.json())
      .then((problems: Problem[]) => {
        setAllProblems(problems);
        const today = new Date();
        const dayIndex =
          today.getFullYear() * 10000 +
          (today.getMonth() + 1) * 100 +
          today.getDate();
        const index = dayIndex % problems.length;
        setDailyProblem(problems[index]);
      })
      .catch(() => {
        const fallback = {
          id: "two-sum",
          title: "两数之和",
          difficulty: "easy",
          mode: "cpp_basic",
          content:
            "给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值的那两个整数，并返回它们的数组下标。",
        };
        setAllProblems([fallback]);
        setDailyProblem(fallback);
      });
  }, []);

  const filteredProblems = allProblems.filter((p) => {
    if (difficultyFilter !== "all" && p.difficulty !== difficultyFilter) return false;
    if (modeFilter !== "all" && p.mode !== modeFilter) return false;
    return true;
  });

  return (
    <div className={styles.container}>
      {/* ==================== 左侧栏 ==================== */}
      <aside className={styles.sidebar}>
        <div className={styles.dailySection}>
          <div className={styles.dailyLabel}>每日一题</div>
          {dailyProblem && (
            <div className={styles.dailyCard}>
              <div className={styles.dailyHeader}>
                <div className={styles.dailyTitle}>{dailyProblem.title}</div>
                <span
                  className={`${styles.dailyTag} ${
                    DIFFICULTY_CLASS[dailyProblem.difficulty] || ""
                  }`}
                >
                  {DIFFICULTY_LABEL[dailyProblem.difficulty] ||
                    dailyProblem.difficulty}
                </span>
              </div>
              <div className={styles.dailyDesc}>
                {dailyProblem.content.slice(0, 80)}
                {dailyProblem.content.length > 80 ? "…" : ""}
              </div>
              <button
                className={styles.dailyBtn}
                onClick={() => startProblem(dailyProblem)}
              >
                <span>开始解题</span>
                <svg
                  className={styles.dailyBtnArrow}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className={styles.dailySection} style={{ marginTop: 32 }}>
          <div className={styles.dailyLabel}>题目库</div>

          {/* 筛选器 */}
          <div className={styles.filterRow}>
            <select
              className={styles.filterSelect}
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="all">全部难度</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
            <select
              className={styles.filterSelect}
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
            >
              <option value="all">全部模式</option>
              <option value="cpp_basic">C++ 基础</option>
              <option value="cpp_acm">C++ ACM</option>
              <option value="general">通用逻辑</option>
            </select>
          </div>

          {/* 题目列表 */}
          <div className={styles.problemList}>
            {filteredProblems.map((p) => (
              <div
                key={p.id}
                className={styles.problemItem}
                onClick={() => startProblem(p)}
              >
                <div className={styles.problemItemHeader}>
                  <span className={styles.problemItemTitle}>{p.title}</span>
                  <span
                    className={`${styles.dailyTag} ${
                      DIFFICULTY_CLASS[p.difficulty] || ""
                    }`}
                  >
                    {DIFFICULTY_LABEL[p.difficulty] || p.difficulty}
                  </span>
                </div>
                <div className={styles.problemItemDesc}>
                  {p.content.slice(0, 60)}
                  {p.content.length > 60 ? "…" : ""}
                </div>
              </div>
            ))}
            {filteredProblems.length === 0 && (
              <div className={styles.problemItemEmpty}>没有符合条件的题目</div>
            )}
          </div>
          <a href="/problemset" className={styles.problemMoreLink}>
            查看完整题库 →
          </a>
        </div>
      </aside>

      {/* ==================== 右侧主区域 ==================== */}
      <main className={styles.main}>
        <div className={styles.mainContent}>
          {/* 品牌区 */}
          <section className={styles.brand}>
            <img
              className={styles.logoImage}
              src="/image/logo.jpg"
              alt="基米编程学习器"
            />
            <h1 className={styles.logoText}>基米编程学习器</h1>
            <p className={styles.subtitle}>
              在代码与算法的世界里，找到属于你的学习节奏
            </p>
          </section>

          {/* 统计卡片 */}
          <section className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalProblems}</div>
              <div className={styles.statLabel}>已解题</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.streakDays}</div>
              <div className={styles.statLabel}>连续天数</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {Object.keys(stats.modeCounts).length}
              </div>
              <div className={styles.statLabel}>使用模式</div>
            </div>
          </section>

          {/* 模式网格 */}
          <section className={styles.modeGrid}>
            {MODE_LIST.map((mode) => (
              <ModeCard
                key={mode.id}
                title={mode.title}
                tags={mode.tags}
                intro={mode.intro}
                features={mode.features}
                onEnter={() => enterMode(mode.id)}
              />
            ))}
          </section>

          {/* 页脚 */}
          <footer className={styles.footer}>
            <div className={styles.footerLinks}>
              <a
                href="/resume"
                target="_blank"
                rel="noopener noreferrer"
              >
                作者简介
              </a>
              <span className={styles.footerDivider}>·</span>
              <span>未来会更多</span>
            </div>
            <div className={styles.sponsorWrap}>
              <SponsorPanel />
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
