// Store d'authentification Jellyfin — Zustand + storage persistant
import { createApiClient } from "@/src/api/client";
import { Api } from "@jellyfin/sdk";
import { Platform } from "react-native";
import { create } from "zustand";

// Interface de storage compatible MMKV et localStorage (web fallback)
interface StorageAdapter {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

// Fallback web via localStorage
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
  delete: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

let storage: StorageAdapter = webStorage;

// Sur native, utiliser MMKV (chargé dynamiquement pour éviter crash web)
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MMKV } = require("react-native-mmkv");
    storage = new MMKV({ id: "jellystream-auth" });
  } catch {
    // Fallback au web storage si MMKV non disponible
  }
}

// Clés de persistence MMKV
const KEYS = {
  SERVER_URL: "jellyfin_server_url",
  TOKEN: "jellyfin_token",
  USER_ID: "jellyfin_user_id",
  USER_NAME: "jellyfin_user_name",
  SERVER_NAME: "jellyfin_server_name",
  SAVED_PROFILES: "jellyfin_saved_profiles",
} as const;

interface SavedProfile {
  id: string;
  serverUrl: string;
  token: string;
  userId: string;
  userName: string;
}

interface AuthState {
  serverUrl: string | null;
  serverName: string | null;
  token: string | null;
  userId: string | null;
  userName: string | null;
  api: Api | null;
  isAuthenticated: boolean;
  savedProfiles: SavedProfile[];

  // Actions
  setServer: (url: string, serverName?: string) => void;
  login: (
    serverUrl: string,
    token: string,
    userId: string,
    userName: string,
  ) => void;
  logout: () => void;
  restoreSession: () => boolean;
  addProfile: (profile: Omit<SavedProfile, "id">) => void;
  switchProfile: (profileId: string) => void;
  removeProfile: (profileId: string) => void;
  loadProfiles: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  serverUrl: null,
  serverName: null,
  token: null,
  userId: null,
  userName: null,
  api: null,
  isAuthenticated: false,
  savedProfiles: [],

  setServer: (url: string, serverName?: string) => {
    const cleanUrl = url.replace(/\/+$/, "");
    storage.set(KEYS.SERVER_URL, cleanUrl);
    if (serverName) storage.set(KEYS.SERVER_NAME, serverName);
    const api = createApiClient(cleanUrl);
    set({
      serverUrl: cleanUrl,
      serverName: serverName ?? get().serverName,
      api,
    });
  },

  login: (
    serverUrl: string,
    token: string,
    userId: string,
    userName: string,
  ) => {
    const cleanUrl = serverUrl.replace(/\/+$/, "");
    storage.set(KEYS.SERVER_URL, cleanUrl);
    storage.set(KEYS.TOKEN, token);
    storage.set(KEYS.USER_ID, userId);
    storage.set(KEYS.USER_NAME, userName);

    const api = createApiClient(cleanUrl);
    api.accessToken = token;

    // Sauvegarder automatiquement le profil
    const profiles = get().savedProfiles;
    const existing = profiles.find(
      (p) => p.userId === userId && p.serverUrl === cleanUrl,
    );
    let updatedProfiles: SavedProfile[];
    if (existing) {
      updatedProfiles = profiles.map((p) =>
        p.id === existing.id ? { ...p, token, userName } : p,
      );
    } else {
      updatedProfiles = [
        ...profiles,
        {
          id: `${userId}_${Date.now()}`,
          serverUrl: cleanUrl,
          token,
          userId,
          userName,
        },
      ];
    }
    storage.set(KEYS.SAVED_PROFILES, JSON.stringify(updatedProfiles));

    set({
      serverUrl: cleanUrl,
      token,
      userId,
      userName,
      api,
      isAuthenticated: true,
      savedProfiles: updatedProfiles,
    });
  },

  logout: () => {
    storage.delete(KEYS.TOKEN);
    storage.delete(KEYS.USER_ID);
    storage.delete(KEYS.USER_NAME);
    // On garde le serverUrl pour faciliter la reconnexion

    set({
      token: null,
      userId: null,
      userName: null,
      api: null,
      isAuthenticated: false,
    });
  },

  restoreSession: () => {
    const serverUrl = storage.getString(KEYS.SERVER_URL);
    const token = storage.getString(KEYS.TOKEN);
    const userId = storage.getString(KEYS.USER_ID);
    const userName = storage.getString(KEYS.USER_NAME);
    const serverName = storage.getString(KEYS.SERVER_NAME);

    // Charger les profils sauvegardés
    let savedProfiles: SavedProfile[] = [];
    try {
      const raw = storage.getString(KEYS.SAVED_PROFILES);
      if (raw) savedProfiles = JSON.parse(raw);
    } catch {
      /* noop */
    }

    if (serverUrl && token && userId) {
      const cleanUrl = serverUrl.replace(/\/+$/, "");
      const api = createApiClient(cleanUrl);
      api.accessToken = token;

      // S'assurer que le profil actif est dans la liste
      const exists = savedProfiles.find(
        (p) => p.userId === userId && p.serverUrl === cleanUrl,
      );
      if (!exists) {
        savedProfiles = [
          ...savedProfiles,
          {
            id: `${userId}_${Date.now()}`,
            serverUrl: cleanUrl,
            token,
            userId,
            userName: userName ?? "Utilisateur",
          },
        ];
        storage.set(KEYS.SAVED_PROFILES, JSON.stringify(savedProfiles));
      }

      set({
        serverUrl: cleanUrl,
        serverName: serverName ?? null,
        token,
        userId,
        userName: userName ?? null,
        api,
        isAuthenticated: true,
        savedProfiles,
      });
      return true;
    }

    set({ savedProfiles });
    return false;
  },

  addProfile: (profile) => {
    const profiles = get().savedProfiles;
    const existing = profiles.find(
      (p) => p.userId === profile.userId && p.serverUrl === profile.serverUrl,
    );
    if (existing) {
      // Mettre à jour le token du profil existant
      const updated = profiles.map((p) =>
        p.id === existing.id
          ? { ...p, token: profile.token, userName: profile.userName }
          : p,
      );
      storage.set(KEYS.SAVED_PROFILES, JSON.stringify(updated));
      set({ savedProfiles: updated });
      return;
    }
    const newProfile: SavedProfile = {
      id: `${profile.userId}_${Date.now()}`,
      ...profile,
    };
    const updated = [...profiles, newProfile];
    storage.set(KEYS.SAVED_PROFILES, JSON.stringify(updated));
    set({ savedProfiles: updated });
  },

  switchProfile: (profileId: string) => {
    const profiles = get().savedProfiles;
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    const cleanUrl = profile.serverUrl.replace(/\/+$/, "");
    storage.set(KEYS.SERVER_URL, cleanUrl);
    storage.set(KEYS.TOKEN, profile.token);
    storage.set(KEYS.USER_ID, profile.userId);
    storage.set(KEYS.USER_NAME, profile.userName);

    const api = createApiClient(cleanUrl);
    api.accessToken = profile.token;

    set({
      serverUrl: cleanUrl,
      token: profile.token,
      userId: profile.userId,
      userName: profile.userName,
      api,
      isAuthenticated: true,
    });
  },

  removeProfile: (profileId: string) => {
    const profiles = get().savedProfiles.filter((p) => p.id !== profileId);
    storage.set(KEYS.SAVED_PROFILES, JSON.stringify(profiles));
    set({ savedProfiles: profiles });
  },

  loadProfiles: () => {
    try {
      const raw = storage.getString(KEYS.SAVED_PROFILES);
      if (raw) {
        const profiles: SavedProfile[] = JSON.parse(raw);
        set({ savedProfiles: profiles });
      }
    } catch {
      /* noop */
    }
  },
}));
