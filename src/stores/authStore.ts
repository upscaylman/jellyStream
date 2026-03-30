// Store d'authentification Jellyfin — Zustand + storage persistant
import { create } from 'zustand';
import { Platform } from 'react-native';
import { Api } from '@jellyfin/sdk';
import { createApiClient } from '@/src/api/client';

// Interface de storage compatible MMKV et localStorage (web fallback)
interface StorageAdapter {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

// Fallback web via localStorage
const webStorage: StorageAdapter = {
  getString: (key) => {
    try { return localStorage.getItem(key) ?? undefined; } catch { return undefined; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* noop */ }
  },
  delete: (key) => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
};

let storage: StorageAdapter = webStorage;

// Sur native, utiliser MMKV (chargé dynamiquement pour éviter crash web)
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MMKV } = require('react-native-mmkv');
    storage = new MMKV({ id: 'jellystream-auth' });
  } catch {
    // Fallback au web storage si MMKV non disponible
  }
}

// Clés de persistence MMKV
const KEYS = {
  SERVER_URL: 'jellyfin_server_url',
  TOKEN: 'jellyfin_token',
  USER_ID: 'jellyfin_user_id',
  USER_NAME: 'jellyfin_user_name',
} as const;

interface AuthState {
  serverUrl: string | null;
  token: string | null;
  userId: string | null;
  userName: string | null;
  api: Api | null;
  isAuthenticated: boolean;

  // Actions
  setServer: (url: string) => void;
  login: (serverUrl: string, token: string, userId: string, userName: string) => void;
  logout: () => void;
  restoreSession: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  serverUrl: null,
  token: null,
  userId: null,
  userName: null,
  api: null,
  isAuthenticated: false,

  setServer: (url: string) => {
    storage.set(KEYS.SERVER_URL, url);
    const api = createApiClient(url);
    set({ serverUrl: url, api });
  },

  login: (serverUrl: string, token: string, userId: string, userName: string) => {
    storage.set(KEYS.SERVER_URL, serverUrl);
    storage.set(KEYS.TOKEN, token);
    storage.set(KEYS.USER_ID, userId);
    storage.set(KEYS.USER_NAME, userName);

    const api = createApiClient(serverUrl);
    api.accessToken = token;

    set({
      serverUrl,
      token,
      userId,
      userName,
      api,
      isAuthenticated: true,
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

    if (serverUrl && token && userId) {
      const api = createApiClient(serverUrl);
      api.accessToken = token;

      set({
        serverUrl,
        token,
        userId,
        userName: userName ?? null,
        api,
        isAuthenticated: true,
      });
      return true;
    }
    return false;
  },
}));
