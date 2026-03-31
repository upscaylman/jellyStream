// Store de notifications — persiste la date du dernier accès au centre de notifs
import {
  useLatestMovies,
  useLatestSeries,
} from "@/src/api/queries/useMediaQueries";
import { useMemo } from "react";
import { Platform } from "react-native";
import { create } from "zustand";

interface StorageAdapter {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
}

const webStorage: StorageAdapter = {
  getString: (key) => {
    try {
      return localStorage.getItem(key) ?? undefined;
    } catch {
      return undefined;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* noop */
    }
  },
};

let storage: StorageAdapter = webStorage;

if (Platform.OS !== "web") {
  try {
    const { MMKV } = require("react-native-mmkv");
    storage = new MMKV({ id: "jellystream-notifications" });
  } catch {
    // Fallback web storage
  }
}

const KEY = "notif_last_seen";

interface NotificationState {
  lastSeenDate: string | null;
  markAsSeen: () => void;
  restore: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  lastSeenDate: null,

  markAsSeen: () => {
    const now = new Date().toISOString();
    storage.set(KEY, now);
    set({ lastSeenDate: now });
  },

  restore: () => {
    const saved = storage.getString(KEY);
    set({ lastSeenDate: saved ?? null });
  },
}));

// Hook qui calcule le nombre de notifications non lues
export function useNotificationBadgeCount(): number {
  const lastSeenDate = useNotificationStore((s) => s.lastSeenDate);
  const { data: movies } = useLatestMovies(15);
  const { data: series } = useLatestSeries(15);

  return useMemo(() => {
    if (!lastSeenDate) {
      // Jamais ouvert → tout est nouveau
      return (movies?.length ?? 0) + (series?.length ?? 0);
    }
    const seen = new Date(lastSeenDate).getTime();
    let count = 0;
    (movies ?? []).forEach((m) => {
      if (m.DateCreated && new Date(m.DateCreated).getTime() > seen) count++;
    });
    (series ?? []).forEach((s) => {
      if (s.DateCreated && new Date(s.DateCreated).getTime() > seen) count++;
    });
    return count;
  }, [lastSeenDate, movies, series]);
}
