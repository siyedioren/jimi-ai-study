"use client";

import SponsorPanel from "@/components/SponsorPanel/SponsorPanel";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* ==================== 左侧栏 ==================== */}
      <aside className={styles.sidebar}>
        <div className={styles.dailySection}>
          <div className={styles.dailyLabel}>每日一题</div>
          <div className={styles.dailyCard}>
            <div className={styles.dailyHeader}>
              <div className={styles.dailyTitle}>两数之和</div>
              <span
                className={`${styles.dailyTag} ${styles.dailyTagEasy}`}
              >
                简单
              </span>
            </div>
            <div className={styles.dailyDesc}>
              给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值的那两个整数，并返回它们的数组下标。
            </div>
            <a href="/problems" className={styles.dailyBtn}>
              开始解题
            </a>
          </div>
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

          {/* 主行动按钮 */}
          <div className={styles.actionArea}>
            <a href="/problems" className={styles.mainActionBtn}>
              进入学习
            </a>
          </div>

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
