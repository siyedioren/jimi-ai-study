"use client";

import React from "react";
import styles from "./ModeCard.module.scss";

interface ModeCardProps {
  title: string;
  tags: string[];
  intro: string;
  features: string[];
  onEnter?: () => void;
}

export default function ModeCard({
  title,
  tags,
  intro,
  features,
  onEnter,
}: ModeCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          {tags.length > 0 && (
            <div className={styles.tags}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <p className={styles.intro}>{intro}</p>
        <ul className={styles.featureList}>
          {features.map((item, idx) => (
            <li key={idx} className={styles.featureItem}>
              {item}
            </li>
          ))}
        </ul>
        <button className={styles.action} onClick={onEnter}>
          进入学习
        </button>
      </div>
    </div>
  );
}
