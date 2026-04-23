"use client";

import React, { useState } from "react";
import styles from "./SponsorPanel.module.scss";

export default function SponsorPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${styles.panel} ${expanded ? styles.expanded : ""}`}>
      <div className={styles.header} onClick={() => setExpanded((v) => !v)}>
        <span className={styles.title}>赞助支持</span>
        <svg
          className={styles.arrow}
          width="14"
          height="14"
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
            <div className={styles.qrGrid}>
              <div className={styles.qrItem}>
                <img
                  className={styles.qrImage}
                  src="/image/wechat.jpg"
                  alt="微信支付"
                />
                <p className={styles.qrLabel}>微信支付</p>
              </div>
              <div className={styles.qrItem}>
                <img
                  className={styles.qrImage}
                  src="/image/alipay.jpg"
                  alt="支付宝"
                />
                <p className={styles.qrLabel}>支付宝</p>
              </div>
            </div>
            <p className={styles.hint}>如果这个项目对你有帮助，欢迎赞助支持我继续创作</p>
          </div>
        </div>
      </div>
    </div>
  );
}
