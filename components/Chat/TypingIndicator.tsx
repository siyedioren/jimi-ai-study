"use client";

import React from "react";
import styles from "./ChatInterface.module.scss";

export default function TypingIndicator() {
  return (
    <div className={styles.messageRow}>
      <div className={`${styles.avatar} ${styles.avatarAi}`}>基</div>
      <div className={`${styles.bubbleAi} ${styles.thinkingCard}`}>
        <div className={styles.typing}>
          <div className={styles.dot} />
          <div className={styles.dot} />
          <div className={styles.dot} />
        </div>
      </div>
    </div>
  );
}
