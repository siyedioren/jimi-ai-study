import { useState, useEffect, useCallback } from "react";
import type { Session } from "../Chat/types";

const STORAGE_KEY = "jimi_sessions";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function now() {
  return Date.now();
}

function autoTitleFromContent(content: string): string {
  const t = content.trim().replace(/\n/g, " ");
  if (t.length <= 12) return t;
  return t.slice(0, 12) + "…";
}

function groupSessionsByTime(sessions: Session[]) {
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  const groups: { label: string; sessions: Session[] }[] = [];

  const todayList = sessions.filter(
    (s) => new Date(s.updatedAt).setHours(0, 0, 0, 0) === today
  );
  const yesterdayList = sessions.filter(
    (s) => new Date(s.updatedAt).setHours(0, 0, 0, 0) === yesterday
  );
  const olderList = sessions.filter(
    (s) => new Date(s.updatedAt).setHours(0, 0, 0, 0) < yesterday
  );

  if (todayList.length) groups.push({ label: "今日", sessions: todayList });
  if (yesterdayList.length)
    groups.push({ label: "昨日", sessions: yesterdayList });
  if (olderList.length) groups.push({ label: "更早", sessions: olderList });

  return groups;
}

function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSessions(sessions: Session[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 初始化加载
  useEffect(() => {
    const list = loadSessions();
    if (list.length === 0) {
      const first: Session = {
        id: generateId(),
        title: "新对话",
        messages: [],
        updatedAt: now(),
      };
      setSessions([first]);
      setCurrentId(first.id);
      saveSessions([first]);
    } else {
      setSessions(list);
      if (list.length) setCurrentId(list[0].id);
    }
    setLoaded(true);
  }, []);

  // 持久化
  useEffect(() => {
    if (loaded) saveSessions(sessions);
  }, [sessions, loaded]);

  const currentSession = sessions.find((s) => s.id === currentId);
  const historyGroups = groupSessionsByTime(sessions);

  const handleNewChat = useCallback(() => {
    const s: Session = {
      id: generateId(),
      title: "新对话",
      messages: [],
      updatedAt: now(),
    };
    setSessions((prev) => [s, ...prev]);
    setCurrentId(s.id);
  }, []);

  const handleSwitchSession = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  const handleDeleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (currentId === id) {
          setCurrentId(next.length ? next[0].id : null);
        }
        return next;
      });
    },
    [currentId]
  );

  const createSession = useCallback(
    (initialMessages: { role: "user" | "assistant"; content: string }[], title?: string) => {
      const id = generateId();
      const session: Session = {
        id,
        title: title || "新对话",
        messages: initialMessages.map((m) => ({ id: generateId(), ...m })),
        updatedAt: now(),
      };
      setSessions((prev) => [session, ...prev]);
      setCurrentId(id);
      return session;
    },
    []
  );

  const addMessage = useCallback(
    (sessionId: string, message: { role: "user" | "assistant"; content: string; attachments?: import("../Chat/types").Attachment[] }) => {
      const msg: import("../Chat/types").Message = { id: generateId(), ...message };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [...s.messages, msg],
                updatedAt: now(),
                title:
                  s.title === "新对话" && s.messages.length === 0 && message.role === "user"
                    ? autoTitleFromContent(message.content)
                    : s.title,
              }
            : s
        )
      );
      return msg;
    },
    []
  );

  const updateMessage = useCallback(
    (sessionId: string, messageId: string, updater: (content: string) => string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === messageId ? { ...m, content: updater(m.content) } : m
                ),
                updatedAt: now(),
              }
            : s
        )
      );
    },
    []
  );

  return {
    sessions,
    currentId,
    currentSession,
    loaded,
    historyGroups,
    handleNewChat,
    handleSwitchSession,
    handleDeleteSession,
    addMessage,
    updateMessage,
    createSession,
    setCurrentId,
  };
}
