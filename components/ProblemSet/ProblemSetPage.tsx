"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./ProblemSetPage.module.scss";

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

const TAG_OPTIONS = [
  "全部",
  "选择结构",
  "循环结构",
  "函数",
  "数组指针",
  "类与对象",
  "继承多态",
  "顺序结构",
  "综合",
];

const DIFF_OPTIONS = [
  { value: "all", label: "全部难度" },
  { value: "easy", label: "简单" },
  { value: "medium", label: "中等" },
  { value: "hard", label: "困难" },
];

const PAGE_SIZE = 20;

function useViewedProblems() {
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem("jimi_viewed_problems");
      if (raw) setViewed(new Set(JSON.parse(raw)));
    } catch { /* noop */ }
  }, []);
  const markViewed = (id: string) => {
    setViewed(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("jimi_viewed_problems", JSON.stringify([...next]));
      return next;
    });
  };
  return { viewed, markViewed };
}

function buildPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [];
  if (current > 3) pages.push(1, "...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...", total);
  else if (current === total - 2) pages.push(total);
  return pages;
}

export default function ProblemSetPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("全部");
  const [diffFilter, setDiffFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Problem | null>(null);
  const { viewed, markViewed } = useViewedProblems();

  useEffect(() => {
    fetch("/data/problems.json")
      .then(r => r.json())
      .then((data: Problem[]) => setProblems(data))
      .catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim();
    return problems.filter(p => {
      if (q && !p.id.includes(q) && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (tagFilter !== "全部" && !p.tags.includes(tagFilter)) return false;
      if (diffFilter !== "all" && p.difficulty !== diffFilter) return false;
      return true;
    });
  }, [problems, search, tagFilter, diffFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const currentItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, tagFilter, diffFilter]);

  const goToSubmit = (p: Problem) => {
    markViewed(p.id);
    window.location.href = "/problemset/" + p.id;
  };

  const openDetail = (p: Problem) => {
    setSelected(p);
    markViewed(p.id);
  };

  const goToAI = (p: Problem) => {
    localStorage.setItem("jimi_pending_problem", JSON.stringify(p));
    localStorage.setItem("jimi_mode", p.mode);
    window.location.href = "/problems";
  };

  const pageNumbers = buildPageNumbers(safePage, totalPages);

  return (
    <div className={styles.page}>
      {/* ---------- 顶部导航 ---------- */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <a href="/" className={styles.navBrand}>
            <img src="/image/logo.jpg" alt="logo" className={styles.navLogo} />
            <span className={styles.navTitle}>基米编程学习器</span>
          </a>
        </div>
        <div className={styles.navLinks}>
          <a href="/" className={styles.navLink}>首页</a>
          <a href="/problemset" className={`${styles.navLink} ${styles.navLinkActive}`}>题库</a>
          <a href="/problems" className={styles.navLink}>AI 改题</a>
        </div>
      </nav>

      {/* ---------- 主内容 ---------- */}
      <main className={styles.main}>
        {/* 搜索筛选区 */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜索题号或标题..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
          >
            {TAG_OPTIONS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={diffFilter}
            onChange={e => setDiffFilter(e.target.value)}
          >
            {DIFF_OPTIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <div className={styles.countLabel}>共 {filtered.length} 题</div>
        </div>

        {/* 题目表格 */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colStatus}>状态</th>
                <th className={styles.colId}>题号</th>
                <th className={styles.colTitle}>题目</th>
                <th className={styles.colTag}>分类</th>
                <th className={styles.colDiff}>难度</th>
                <th className={styles.colAction}>操作</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((p, idx) => {
                const isViewed = viewed.has(p.id);
                return (
                  <tr key={p.id} className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td className={styles.colStatus}>
                      {isViewed ? (
                        <span className={styles.solvedBadge}>✓</span>
                      ) : (
                        <span className={styles.unsolvedBadge}>&nbsp;</span>
                      )}
                    </td>
                    <td className={styles.colId}>{p.id}</td>
                    <td className={styles.colTitle}>
                      <button
                        className={styles.titleBtn}
                        onClick={() => goToSubmit(p)}
                        title="进入交题页"
                      >
                        {p.title}
                      </button>
                    </td>
                    <td className={styles.colTag}>
                      {p.tags.map(t => (
                        <span key={t} className={styles.tagBadge}>{t}</span>
                      ))}
                    </td>
                    <td className={styles.colDiff}>
                      <span className={`${styles.diffBadge} ${styles["diff_" + p.difficulty]}`}>
                        {DIFFICULTY_LABEL[p.difficulty]}
                      </span>
                    </td>
                    <td className={styles.colAction}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => goToAI(p)}
                        title="让 AI 讲解此题"
                      >
                        AI 讲解
                      </button>
                    </td>
                  </tr>
                );
              })}
              {currentItems.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    没有找到符合条件的题目
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页器 */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              title="首页"
            >
              &lt;&lt;
            </button>
            <button
              className={styles.pageBtn}
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 1}
              title="上一页"
            >
              &lt;
            </button>
            {pageNumbers.map((n, i) => (
              <React.Fragment key={i}>
                {n === "..." ? (
                  <span className={styles.pageEllipsis}>...</span>
                ) : (
                  <button
                    className={`${styles.pageBtn} ${n === safePage ? styles.pageBtnActive : ""}`}
                    onClick={() => setPage(n as number)}
                  >
                    {n}
                  </button>
                )}
              </React.Fragment>
            ))}
            <button
              className={styles.pageBtn}
              onClick={() => setPage(safePage + 1)}
              disabled={safePage === totalPages}
              title="下一页"
            >
              &gt;
            </button>
            <button
              className={styles.pageBtn}
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              title="末页"
            >
              &gt;&gt;
            </button>
          </div>
        )}
      </main>

      {/* ---------- 题目详情抽屉 ---------- */}
      {selected && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setSelected(null)} />
          <aside className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>
                <span className={styles.drawerId}>{selected.id}</span>
                {selected.title}
              </h2>
              <button
                className={styles.drawerClose}
                onClick={() => setSelected(null)}
                title="关闭"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.drawerMeta}>
              <span className={`${styles.diffBadge} ${styles["diff_" + selected.difficulty]}`}>
                {DIFFICULTY_LABEL[selected.difficulty]}
              </span>
              {selected.tags.map(t => (
                <span key={t} className={styles.tagBadge}>{t}</span>
              ))}
              <span className={styles.metaItem}>时间限制: {selected.timeLimit}s</span>
              <span className={styles.metaItem}>内存限制: {selected.memoryLimit}MB</span>
            </div>

            <div className={styles.drawerBody}>
              <h3 className={styles.sectionTitle}>题目描述</h3>
              <div className={styles.contentBox}>{selected.content}</div>

              {selected.sampleInput && (
                <>
                  <h3 className={styles.sectionTitle}>样例输入</h3>
                  <pre className={styles.codeBox}>{selected.sampleInput}</pre>
                </>
              )}
              {selected.sampleOutput && (
                <>
                  <h3 className={styles.sectionTitle}>样例输出</h3>
                  <pre className={styles.codeBox}>{selected.sampleOutput}</pre>
                </>
              )}
            </div>

            <div className={styles.drawerFooter}>
              <button
                className={styles.primaryBtn}
                onClick={() => goToAI(selected)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                AI 讲解此题
              </button>
              <button
                className={styles.submitLinkBtn}
                onClick={() => goToSubmit(selected)}
              >
                进入交题页 →
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
