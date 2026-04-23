"use client";

import React, { useState } from "react";
import styles from "./ModeCard.module.scss";

interface ModeCardProps {
  title: string;
  tags: string[];
  intro: string;
  features: string[];
  href: string;
}

export default function ModeCard({
  title,
  tags,
  intro,
  features,
  href,
}: ModeCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${styles.card} ${expanded ? styles.expanded : ""}`}>
      <div className={styles.header} onClick={() => setExpanded((v) => !v)}>
        <div className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          <div className={styles.tags}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <svg
          className={styles.arrow}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.contentInner}>
          <div className={styles.content}>
            <p className={styles.intro}>{intro}</p>
            <ul className={styles.featureList}>
              {features.map((item, idx) => (
                <li key={idx} className={styles.featureItem}>
                  {item}
                </li>
              ))}
            </ul>
            <a href={href} className={styles.action}>
              进入学习
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
