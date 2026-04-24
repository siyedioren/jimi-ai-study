"use client";

import ModeCard from "@/components/ModeCard/ModeCard";
import SponsorPanel from "@/components/SponsorPanel/SponsorPanel";
import styles from "./page.module.scss";

const modes = [
  {
    title: "AI 智能刷题",
    tags: [],
    intro: "与 AI 助教一对一交流，针对性攻克算法与数据结构难题。",
    features: [
      "根据薄弱点智能推荐题目",
      "逐步引导式解题讲解",
      "自动生成错题集与复习计划",
    ],
    href: "/problems",
  },
];

export default function Home() {
  return (
    <main>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <a
            className={styles.navLink}
            href="/resume"
            target="_blank"
            rel="noopener noreferrer"
          >
            作者简介
          </a>
        </nav>

        <section className={styles.brand}>
          <img
            className={styles.logoImage}
            src="/image/logo.jpg"
            alt="基米编程学习器"
          />
          <h1 className={styles.logoText}>基米编程学习器</h1>
          <p className={styles.subtitle}>在代码与算法的世界里，找到属于你的学习节奏</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>开启学习之旅</h2>
          <div className={styles.grid}>
            {modes.map((mode) => (
              <ModeCard key={mode.title} {...mode} />
            ))}
          </div>
        </section>

        <div className={styles.sponsor}>
          <SponsorPanel />
        </div>

        <footer className={styles.footer}>未来会更多</footer>
      </div>
    </main>
  );
}
