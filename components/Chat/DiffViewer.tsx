"use client";

import React, { useState, useCallback } from "react";
import styles from "./DiffViewer.module.scss";

interface DiffLine {
  type: "same" | "delete" | "insert";
  text: string;
}

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];
  let i = 0, j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push({ type: "same", text: oldLines[i] });
      i++;
      j++;
    } else if (j < newLines.length && !oldLines.slice(i).includes(newLines[j])) {
      result.push({ type: "insert", text: newLines[j] });
      j++;
    } else if (i < oldLines.length) {
      result.push({ type: "delete", text: oldLines[i] });
      i++;
    } else {
      result.push({ type: "insert", text: newLines[j] });
      j++;
    }
  }

  return result;
}

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  onClose: () => void;
}

export default function DiffViewer({ oldCode, newCode, onClose }: DiffViewerProps) {
  const diff = computeLineDiff(oldCode, newCode);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>代码对比</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendDelete}>删除</span>
          <span className={styles.legendInsert}>新增</span>
        </div>
        <div className={styles.code}>
          {diff.map((line, idx) => (
            <div key={idx} className={`${styles.line} ${styles[line.type]}`}>
              <span className={styles.marker}>
                {line.type === "delete" ? "-" : line.type === "insert" ? "+" : " "}
              </span>
              <span className={styles.text}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
