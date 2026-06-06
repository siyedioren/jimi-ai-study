import { useState, useEffect, useCallback } from "react";

interface Stats {
  totalProblems: number;
  streakDays: number;
  lastStudyDate: string;
  modeCounts: Record<string, number>;
}

const STATS_KEY = "jimi_stats";

function loadStats(): Stats {
  if (typeof window === "undefined") {
    return { totalProblems: 0, streakDays: 0, lastStudyDate: "", modeCounts: {} };
  }
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { totalProblems: 0, streakDays: 0, lastStudyDate: "", modeCounts: {} };
}

function saveStats(stats: Stats) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isConsecutive(prev: string, curr: string): boolean {
  const p = new Date(prev);
  const c = new Date(curr);
  const diff = (c.getTime() - p.getTime()) / 86400000;
  return diff === 1;
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(loadStats);

  const recordStudy = useCallback((mode: string) => {
    setStats((prev) => {
      const today = getToday();
      const next: Stats = {
        totalProblems: prev.totalProblems + 1,
        streakDays: prev.streakDays,
        lastStudyDate: today,
        modeCounts: { ...prev.modeCounts, [mode]: (prev.modeCounts[mode] || 0) + 1 },
      };

      if (!prev.lastStudyDate) {
        next.streakDays = 1;
      } else if (prev.lastStudyDate === today) {
        next.streakDays = prev.streakDays;
      } else if (isConsecutive(prev.lastStudyDate, today)) {
        next.streakDays = prev.streakDays + 1;
      } else {
        next.streakDays = 1;
      }

      saveStats(next);
      return next;
    });
  }, []);

  return { stats, recordStudy };
}
