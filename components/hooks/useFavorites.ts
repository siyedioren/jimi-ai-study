import { useState, useEffect, useCallback } from "react";

export interface FavoriteProblem {
  id: string;
  title: string;
  content: string;
  mode: string;
  savedAt: number;
}

const FAVORITES_KEY = "jimi_favorites";

function loadFavorites(): FavoriteProblem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveFavorites(list: FavoriteProblem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteProblem[]>(loadFavorites);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const addFavorite = useCallback((problem: Omit<FavoriteProblem, "id" | "savedAt">) => {
    setFavorites((prev) => {
      if (prev.some((p) => p.title === problem.title)) return prev;
      return [
        { ...problem, id: Math.random().toString(36).slice(2, 10), savedAt: Date.now() },
        ...prev,
      ];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const isFavorited = useCallback(
    (title: string) => favorites.some((p) => p.title === title),
    [favorites]
  );

  return { favorites, addFavorite, removeFavorite, isFavorited };
}
